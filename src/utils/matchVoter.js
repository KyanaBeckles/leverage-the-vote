// Shared voter-file matching logic used both for manual signature entry
// (SignatureEntryForm) and for bulk-matching signatures the AI OCR pipeline
// already extracted from scanned petition sheets (PetitionValidation).
export function matchVoterForSignature(name, address, voters) {
  if (!name || name.trim().length < 3) return null;

  const nameLower = name.toLowerCase().trim();
  const matches = voters.filter((v) => {
    const voterName = (v.full_name || `${v.first_name || ""} ${v.last_name || ""}`).toLowerCase().trim();
    return voterName.includes(nameLower) || nameLower.includes(voterName);
  });

  if (matches.length === 0) {
    return { status: "unmatched", message: "No voter found with this name", voter: null };
  }
  if (matches.length === 1) {
    const voter = matches[0];
    const addressMatch = !address || !voter.address ||
      voter.address.toLowerCase().includes(address.toLowerCase().trim());
    return {
      status: addressMatch ? "matched" : "flagged",
      message: addressMatch
        ? `Matched: ${voter.full_name || `${voter.first_name} ${voter.last_name}`} · ${voter.address || "No address on file"}`
        : `Address mismatch — voter file shows: ${voter.address}`,
      voter,
    };
  }
  return {
    status: "flagged",
    message: `${matches.length} possible matches found — review manually`,
    voter: matches[0],
  };
}
