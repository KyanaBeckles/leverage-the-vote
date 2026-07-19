import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { document_id, campaign_id, pair_id } = await req.json();
    if (!document_id || !campaign_id) {
      return Response.json({ error: 'document_id and campaign_id are required' }, { status: 400 });
    }

    // Fetch the document
    const docs = await base44.entities.Document.filter({ campaign_id });
    const doc = docs.find(d => d.id === document_id);
    if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });

    // Use AI vision to extract signature data from the image
    const prompt = `You are analyzing a petition signature sheet image for a political campaign.

This petition sheet has either a FRONT side (7 signature lines) or a BACK side (17 signature lines).

Please extract ALL the information you can see, including:
1. Whether this appears to be the FRONT (7 lines) or BACK (17 lines) of the sheet
2. A sheet/petition number if visible anywhere on the page
3. The sheet's City or Town: near the BOTTOM of the page there is a certification section naming the municipality this sheet belongs to (e.g. "City/Town of ___"). This governs every signature on the sheet — read it carefully.
4. For each signature line that has been filled in, extract:
   - Line number
   - Signer name (printed or cursive)
   - Address
   - City/Town
   - Date signed
5. Total count of filled signature lines you can see
6. Any collector/circulator name if shown

Return your response as JSON with this exact structure:
{
  "side": "front" or "back",
  "sheet_number": "string or null",
  "sheet_city_town": "string or null",
  "circulator_name": "string or null",
  "total_signatures_visible": number,
  "signers": [
    {
      "line_number": number,
      "name": "string",
      "address": "string or null",
      "city": "string or null",
      "date_signed": "string or null"
    }
  ],
  "notes": "any additional observations"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [doc.file_url],
      response_json_schema: {
        type: "object",
        properties: {
          side: { type: "string" },
          sheet_number: { type: "string" },
          sheet_city_town: { type: "string" },
          circulator_name: { type: "string" },
          total_signatures_visible: { type: "number" },
          signers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                line_number: { type: "number" },
                name: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                date_signed: { type: "string" }
              }
            }
          },
          notes: { type: "string" }
        }
      }
    });

    const extracted = result;
    // A missing sheet number must fall back to a PER-DOCUMENT id. The AI often
    // returns the string "null"/"N/A" for unnumbered sheets — using that as the
    // sheet key merged 13 different physical sheets into one record, each upload
    // overwriting the last (discovered 2026-07-17, data recovered by reprocessing).
    // When the caller supplies a pair_id (front+back photos of the same physical
    // sheet uploaded together), an unreadable number falls back to a PAIR- key
    // shared by both sides instead of a per-document DOC- key, so the front and
    // back scans merge into a single PetitionSheet record. A readable number on
    // the page still wins over the pair fallback.
    const rawNumber = String(extracted.sheet_number ?? "").trim();
    const rawPairId = String(pair_id ?? "").trim();
    const fallbackNumber = rawPairId ? `PAIR-${rawPairId}` : `DOC-${document_id.slice(-6)}`;
    const sheetNumber = rawNumber && !["null", "none", "n/a", "not visible", "unknown"].includes(rawNumber.toLowerCase())
      ? rawNumber
      : fallbackNumber;
    const sigCount = extracted.total_signatures_visible || extracted.signers?.length || 0;
    const side = extracted.side || "front";
    // The bottom-of-sheet certification names the municipality; it governs
    // every signature on the sheet, so it drives voter-file matching.
    const rawTown = String(extracted.sheet_city_town ?? "").trim().toUpperCase().replace(/^(CITY|TOWN) OF /, "");
    const sheetTown = rawTown && !["NULL", "NONE", "N/A", "NOT VISIBLE", "UNKNOWN"].includes(rawTown) ? rawTown : null;

    // Find or create a PetitionSheet record
    const existingSheets = await base44.entities.PetitionSheet.filter({ campaign_id, sheet_number: sheetNumber });
    let sheetRecord;

    if (existingSheets.length > 0) {
      // Update existing sheet — replace the scan URL for this side and set authoritative count
      sheetRecord = existingSheets[0];
      const updateData = {
        raw_signature_count: sigCount,
        ai_processed: true,
        ai_extracted_data: JSON.stringify(extracted),
        pipeline_status: "scanned",
      };
      if (sheetTown && !sheetRecord.town_clerk) updateData.town_clerk = sheetTown;
      if (side === "front") updateData.scan_url_front = doc.file_url;
      else updateData.scan_url_back = doc.file_url;

      sheetRecord = await base44.entities.PetitionSheet.update(sheetRecord.id, updateData);
    } else {
      // Create a new sheet
      const createData = {
        campaign_id,
        sheet_number: sheetNumber,
        pipeline_status: "scanned",
        raw_signature_count: sigCount,
        ai_processed: true,
        ai_extracted_data: JSON.stringify(extracted),
        issued_date: new Date().toISOString().split("T")[0],
        notes: extracted.notes || "",
      };
      if (sheetTown) createData.town_clerk = sheetTown;
      if (side === "front") createData.scan_url_front = doc.file_url;
      else createData.scan_url_back = doc.file_url;
      if (extracted.circulator_name) createData.assigned_to_name = extracted.circulator_name;

      sheetRecord = await base44.entities.PetitionSheet.create(createData);
    }

    // Deduplicate signatures: for this sheet+side, delete all existing Signature records
    // for the line numbers we are about to write, then insert the fresh authoritative set.
    // This means a re-upload of a partially filled sheet will replace old entries with the
    // latest data rather than stacking duplicates.
    const incomingLineNumbers = (extracted.signers || []).map(s => s.line_number);

    if (incomingLineNumbers.length > 0) {
      const existingSignatures = await base44.entities.Signature.filter({
        campaign_id,
        petition_sheet_id: sheetRecord.id,
      });

      // Delete any existing signature records whose line numbers appear in this upload
      const toDelete = existingSignatures.filter(s => incomingLineNumbers.includes(s.line_number));
      await Promise.all(toDelete.map(s => base44.entities.Signature.delete(s.id)));
    }

    // Insert the fresh, authoritative signature records from this upload
    const signaturePromises = (extracted.signers || []).map(signer =>
      base44.entities.Signature.create({
        campaign_id,
        petition_sheet_id: sheetRecord.id,
        line_number: signer.line_number,
        signer_name: signer.name,
        signer_address: signer.address || "",
        signer_city: signer.city || "",
        date_signed: signer.date_signed || null,
        verification_status: "pending",
        entered_by_member_id: user.id,
      })
    );
    await Promise.all(signaturePromises);

    // Mark document as linked
    await base44.entities.Document.update(document_id, {
      status: "linked",
      linked_petition_sheet_id: sheetRecord.id,
    });

    return Response.json({
      success: true,
      sheet_id: sheetRecord.id,
      sheet_number: sheetNumber,
      side,
      signatures_extracted: sigCount,
      signers: extracted.signers || [],
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});