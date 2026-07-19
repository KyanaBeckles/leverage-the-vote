import { jsPDF } from "jspdf";

// A real text-based, printable walk list — not a screenshot. One row per
// voter with a checkbox to mark off during canvassing and a blank Notes
// column wide enough to write in. Column header repeats on every page;
// page numbers go in the footer.
const MARGIN = 12;
const HEADER_H = 8; // column header row height
const ROW_H = 8; // body row height
const CHECKBOX_SIZE = 3.2;

const COLUMNS = [
  { key: "check", label: "", width: 10 },
  { key: "name", label: "Name", width: 45 },
  { key: "address", label: "Address", width: 50 },
  { key: "city", label: "City", width: 28 },
  { key: "wardPct", label: "Ward/Pct", width: 20 },
  { key: "party", label: "Party", width: 25 },
  { key: "notes", label: "Notes", width: 0 }, // fills remaining width
];

function voterRow(v) {
  const name =
    v.full_name ||
    [v.first_name, v.middle_name, v.last_name].filter(Boolean).join(" ") ||
    "—";
  const address = [v.address, v.apt_number ? `Apt ${v.apt_number}` : null]
    .filter(Boolean)
    .join(", ") || "—";
  return {
    name,
    address,
    city: v.city || "—",
    wardPct: [v.ward, v.precinct].filter(Boolean).join("/") || "—",
    party: v.party_affiliation || "—",
  };
}

function truncateToWidth(doc, text, maxWidth) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && doc.getTextWidth(out + "…") > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + "…";
}

/**
 * Renders `rows` (Voter-shaped objects) into a printable, text-based walk
 * list PDF and triggers a download.
 *
 * @param {Object} opts
 * @param {string} opts.campaignName
 * @param {string} opts.filterSummary — one-line description of active filters
 * @param {Array} opts.rows — voter rows, already sorted/capped by the caller
 * @param {string} [opts.filename]
 */
export function generateWalkListPdf({ campaignName, filterSummary, rows, filename }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - MARGIN * 2;

  // Distribute remaining width into the flexible "notes" column.
  const fixedWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0);
  const columns = COLUMNS.map((c) =>
    c.key === "notes" ? { ...c, width: Math.max(30, usableWidth - fixedWidth) } : c
  );

  const generatedOn = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const drawPageHeader = () => {
    let y = MARGIN;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Walk List — ${campaignName || "Campaign"}`, MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(`Generated ${generatedOn}`, MARGIN, y);
    y += 4.5;
    doc.text(filterSummary || "No filters applied", MARGIN, y);
    y += 5;
    doc.setTextColor(0);

    // Column header row
    let x = MARGIN;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + HEADER_H - 2, pageWidth - MARGIN, y + HEADER_H - 2);
    columns.forEach((col) => {
      if (col.label) doc.text(col.label, x + 1, y + HEADER_H - 4);
      x += col.width;
    });

    return y + HEADER_H;
  };

  const drawRow = (rowData, y) => {
    let x = MARGIN;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    columns.forEach((col) => {
      if (col.key === "check") {
        doc.rect(x + (col.width - CHECKBOX_SIZE) / 2, y - CHECKBOX_SIZE, CHECKBOX_SIZE, CHECKBOX_SIZE);
      } else if (col.key !== "notes") {
        const text = truncateToWidth(doc, String(rowData[col.key] ?? "—"), col.width - 2);
        doc.text(text, x + 1, y);
      }
      // notes column intentionally left blank for handwriting
      x += col.width;
    });
    // row separator
    doc.setDrawColor(220);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + 2.2, pageWidth - MARGIN, y + 2.2);
    doc.setDrawColor(0);
  };

  let y = drawPageHeader();
  const bottomLimit = pageHeight - MARGIN;

  rows.forEach((voter) => {
    if (y + ROW_H > bottomLimit) {
      doc.addPage();
      y = drawPageHeader();
    }
    y += ROW_H;
    drawRow(voterRow(voter), y - 2.5);
  });

  // Footer page numbers, added last so we know the total.
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN, pageHeight - MARGIN + 6, { align: "right" });
    doc.text(`${rows.length} voter${rows.length === 1 ? "" : "s"}`, MARGIN, pageHeight - MARGIN + 6);
    doc.setTextColor(0);
  }

  const today = new Date().toISOString().split("T")[0];
  doc.save(filename || `walk-list-${today}.pdf`);
}
