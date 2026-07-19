import { jsPDF } from "jspdf";

// A hand-delivery packet for a single town clerk: cover page, then one
// section per certified-to-that-town sheet — the front scan image followed
// by a text signature table. Mirrors the pagination conventions in
// walkListPdf.js (repeat column headers, page-numbered footer added last).
const MARGIN = 14;
const HEADER_H = 7; // signature table column header row height
const ROW_H = 6.5; // signature table body row height
const MAX_IMAGE_HEIGHT_RATIO = 0.55; // cap image height as a fraction of usable page height

// The app records pre-screen (matching) results, never certification —
// certification is the clerk's act alone. Label accordingly.
const PRESCREEN_LABELS = {
  matched: "matched",
  certified: "certified",
  flagged: "flagged",
  unmatched: "not found",
  pending: "pending",
};

function slugify(str) {
  const slug = (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "unknown";
}

function truncateToWidth(doc, text, maxWidth) {
  const str = String(text ?? "");
  if (doc.getTextWidth(str) <= maxWidth) return str;
  let out = str;
  while (out.length > 1 && doc.getTextWidth(out + "…") > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + "…";
}

// Fetches an image URL and resolves it to a data URL. Resolves to null
// (never rejects) on any failure — network error, CORS block, non-2xx, or
// an undecodable body — so one bad scan never aborts the whole packet.
async function fetchImageAsDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imageFormatFromDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpeg|jpg|webp)/i.exec(dataUrl || "");
  if (!match) return null;
  const type = match[1].toLowerCase();
  if (type === "jpg") return "JPEG";
  return type.toUpperCase();
}

function signatureRowData(sig) {
  return {
    line: sig.line_number ?? "—",
    name: sig.signer_name || "—",
    address: sig.signer_address || "—",
    city: sig.signer_city || "—",
    date: sig.date_signed || "—",
    prescreen: PRESCREEN_LABELS[sig.verification_status] || "pending",
  };
}

const SIG_COLUMNS = [
  { key: "line", label: "#", width: 9 },
  { key: "name", label: "Name", width: 44 },
  { key: "address", label: "Address", width: 46 },
  { key: "city", label: "City", width: 26 },
  { key: "date", label: "Date Signed", width: 24 },
  { key: "prescreen", label: "Pre-screen", width: 0 }, // fills remaining width
];

/**
 * Generates the "Clerk Packet" PDF for one town — a cover page plus a
 * section per scanned sheet certified to that town — and triggers a
 * download.
 *
 * @param {Object} opts
 * @param {Object} opts.campaign — Campaign entity (name, candidate_name, office, state)
 * @param {string} opts.town — the town_clerk value the packet is being assembled for
 * @param {Array} opts.sheets — PetitionSheet rows for this town (any pipeline_status, each with at least one scan)
 * @param {Array} opts.signatures — Signature rows for the whole campaign; filtered per-sheet internally
 * @param {string} [opts.filename]
 * @returns {Promise<void>}
 */
export async function generateClerkPacketPdf({ campaign, town, sheets, signatures, filename }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - MARGIN * 2;
  const bottomLimit = pageHeight - MARGIN;

  const fixedWidth = SIG_COLUMNS.reduce((sum, c) => sum + c.width, 0);
  const columns = SIG_COLUMNS.map((c) =>
    c.key === "prescreen" ? { ...c, width: Math.max(24, usableWidth - fixedWidth) } : c
  );

  const sigsBySheet = new Map();
  for (const sig of signatures || []) {
    const list = sigsBySheet.get(sig.petition_sheet_id) || [];
    list.push(sig);
    sigsBySheet.set(sig.petition_sheet_id, list);
  }

  const orderedSheets = [...(sheets || [])].sort((a, b) =>
    (a.sheet_number || "").localeCompare(b.sheet_number || "", undefined, { numeric: true })
  );
  const totalLines = orderedSheets.reduce((sum, sheet) => {
    const sigs = sigsBySheet.get(sheet.id) || [];
    return sum + (sigs.length || sheet.raw_signature_count || 0);
  }, 0);

  const generatedOn = new Date();
  const generatedOnLabel = generatedOn.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const generatedOnDate = generatedOn.toISOString().split("T")[0];

  // ---- Cover page ----
  let y = MARGIN + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(`Nomination Paper Submission — Town/City of ${town}`, usableWidth);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 8 + 6;

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(campaign?.name || "Campaign", MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(60);
  const campaignLines = [
    campaign?.candidate_name ? `Candidate: ${campaign.candidate_name}` : null,
    campaign?.office ? `Office: ${campaign.office}` : null,
    campaign?.state ? `State: ${campaign.state}` : null,
  ].filter(Boolean);
  campaignLines.forEach((line) => {
    doc.text(line, MARGIN, y);
    y += 5.5;
  });
  doc.setTextColor(0);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date generated: ${generatedOnLabel}`, MARGIN, y);
  y += 6;
  doc.text(
    `Sheets included: ${orderedSheets.length}    Total signature lines: ${totalLines}`,
    MARGIN,
    y
  );
  y += 12;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  const disclaimer =
    "Match annotations in this packet are the campaign's internal pre-screen against the voter file. " +
    "Certification is performed solely by the city/town clerk.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, usableWidth);
  doc.text(disclaimerLines, MARGIN, y);
  doc.setTextColor(0);

  // ---- Per-sheet sections ----
  for (const sheet of orderedSheets) {
    doc.addPage();
    let sy = MARGIN + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Sheet #${sheet.sheet_number || "—"}`, MARGIN, sy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    const statusLabel = (sheet.pipeline_status || "").replace(/_/g, " ") || "unknown";
    doc.text(
      `Status: ${statusLabel}    Raw signature count: ${sheet.raw_signature_count ?? 0}`,
      MARGIN,
      sy + 5.5
    );
    doc.setTextColor(0);
    sy += 12;

    // Front scan image — fetch/decode failures degrade to a placeholder box.
    const maxImageHeight = (bottomLimit - sy) * MAX_IMAGE_HEIGHT_RATIO;
    const dataUrl = await fetchImageAsDataUrl(sheet.scan_url_front);
    const format = dataUrl ? imageFormatFromDataUrl(dataUrl) : null;
    let placed = false;
    if (dataUrl && format) {
      try {
        const props = doc.getImageProperties(dataUrl);
        const scale = Math.min(usableWidth / props.width, maxImageHeight / props.height);
        const drawWidth = props.width * scale;
        const drawHeight = props.height * scale;
        const drawX = MARGIN + (usableWidth - drawWidth) / 2;
        doc.addImage(dataUrl, format, drawX, sy, drawWidth, drawHeight);
        sy += drawHeight + 6;
        placed = true;
      } catch {
        placed = false;
      }
    }
    if (!placed) {
      const boxHeight = 30;
      doc.setDrawColor(180);
      doc.setLineWidth(0.4);
      doc.rect(MARGIN, sy, usableWidth, boxHeight);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("Scan image unavailable — view original at:", MARGIN + 4, sy + 10);
      const urlLines = doc.splitTextToSize(sheet.scan_url_front || "(no scan URL on file)", usableWidth - 8);
      doc.text(urlLines, MARGIN + 4, sy + 17);
      doc.setTextColor(0);
      doc.setDrawColor(0);
      sy += boxHeight + 6;
    }

    // Signature table for this sheet, paginated with repeating headers.
    const sigs = (sigsBySheet.get(sheet.id) || []).sort(
      (a, b) => (a.line_number ?? 0) - (b.line_number ?? 0)
    );

    const drawTableHeader = (startY) => {
      let x = MARGIN;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, startY + HEADER_H - 2, pageWidth - MARGIN, startY + HEADER_H - 2);
      columns.forEach((col) => {
        doc.text(col.label, x + 1, startY + HEADER_H - 4);
        x += col.width;
      });
      return startY + HEADER_H;
    };

    const drawTableRow = (rowData, rowY) => {
      let x = MARGIN;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      columns.forEach((col) => {
        const text = truncateToWidth(doc, String(rowData[col.key] ?? "—"), col.width - 2);
        doc.text(text, x + 1, rowY);
        x += col.width;
      });
      doc.setDrawColor(220);
      doc.setLineWidth(0.15);
      doc.line(MARGIN, rowY + 2.2, pageWidth - MARGIN, rowY + 2.2);
      doc.setDrawColor(0);
    };

    if (sy + HEADER_H + ROW_H > bottomLimit) {
      doc.addPage();
      sy = MARGIN;
    }
    sy = drawTableHeader(sy);

    if (sigs.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("No transcribed signatures on file for this sheet.", MARGIN, sy + 5);
      doc.setTextColor(0);
    } else {
      sigs.forEach((sig) => {
        if (sy + ROW_H > bottomLimit) {
          doc.addPage();
          sy = drawTableHeader(MARGIN);
        }
        sy += ROW_H;
        drawTableRow(signatureRowData(sig), sy - 2.5);
      });
    }
  }

  // Footer — page numbers + town/date stamp, added last so the total is known.
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN, pageHeight - MARGIN + 6, { align: "right" });
    doc.text(`${town} packet — generated ${generatedOnDate}`, MARGIN, pageHeight - MARGIN + 6);
    doc.setTextColor(0);
  }

  doc.save(filename || `clerk-packet-${slugify(town)}-${generatedOnDate}.pdf`);
}
