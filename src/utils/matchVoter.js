// Shared voter-file matching logic used both for manual signature entry
// (SignatureEntryForm) and for bulk-matching signatures the AI OCR pipeline
// already extracted from scanned petition sheets (MatchPendingButton).
//
// `voters` is a pre-filtered candidate set from fetchCandidateVoters (never the
// whole file). Voter records store names UPPERCASE in first_name/last_name;
// signatures arrive in mixed case, so all comparison is done normalized.

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameParts(name) {
  const parts = normalize(name).split(" ").filter(Boolean);
  while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts;
}

function voterDisplay(v) {
  const name = v.full_name || `${v.first_name || ""} ${v.last_name || ""}`.trim();
  return `${name}${v.address ? ` · ${v.address}` : ""}${v.city ? `, ${v.city}` : ""}`;
}

function firstNameMatches(sigFirst, voterFirst) {
  if (!voterFirst) return false;
  if (sigFirst === voterFirst) return true;
  // Initials and nicknames: "J" vs "JOHN", "Rob" vs "ROBERT"
  if (sigFirst.length === 1 || voterFirst.length === 1) return sigFirst[0] === voterFirst[0];
  return voterFirst.startsWith(sigFirst) || sigFirst.startsWith(voterFirst);
}

function addressMatches(sigAddress, voterAddress) {
  const a = normalize(sigAddress);
  const b = normalize(voterAddress);
  if (!a || !b) return true; // nothing to compare — don't penalize
  if (a.includes(b) || b.includes(a)) return true;
  // Compare street number + first street word ("9 Morgan Rd" vs "9 MORGAN RD WY")
  const [aNum, aStreet] = a.split(" ");
  const [bNum, bStreet] = b.split(" ");
  return Boolean(aNum && aNum === bNum && aStreet && bStreet && aStreet === bStreet);
}

export function matchVoterForSignature(name, address, voters) {
  if (!name || name.trim().length < 3) return null;

  const parts = nameParts(name);
  if (parts.length < 2) {
    return { status: "flagged", message: "Need a first and last name to match against the voter file", voter: null };
  }
  const sigFirst = parts[0];
  // Multi-word surnames ("La Voix", "De La Cruz") — compare space-stripped, and
  // accept any tail of the signed name as the surname.
  const sigLastVariants = new Set();
  for (let i = Math.max(1, parts.length - 3); i < parts.length; i++) {
    sigLastVariants.add(parts.slice(i).join(""));
  }

  let matches = (voters || []).filter((v) => {
    const vLastRaw = normalize(v.last_name) || nameParts(v.full_name || "").slice(-1)[0] || "";
    const vLast = vLastRaw.replace(/\s/g, "");
    if (!vLast || !sigLastVariants.has(vLast)) return false;
    return firstNameMatches(sigFirst, normalize(v.first_name));
  });

  if (matches.length === 0) {
    return { status: "unmatched", message: "No voter found with this name", voter: null };
  }

  // Signatures only count from voters currently on the rolls — prefer active
  // records, and flag (not match) when the only hits are inactive/purged.
  const active = matches.filter((v) => (v.voter_status || "").toLowerCase() === "active");
  const inactiveOnly = active.length === 0;
  let pool = active.length > 0 ? active : matches;

  // Use the address to disambiguate multiple same-name voters.
  if (pool.length > 1 && address) {
    const byAddress = pool.filter((v) => addressMatches(address, v.address));
    if (byAddress.length >= 1) pool = byAddress;
  }

  const voter = pool[0];

  if (inactiveOnly) {
    return {
      status: "flagged",
      message: `Voter on file is marked ${voter.voter_status || "inactive"} — verify with the clerk. ${voterDisplay(voter)}`,
      voter,
    };
  }

  if (pool.length > 1) {
    return {
      status: "flagged",
      message: `${pool.length} possible active voters with this name — review manually`,
      voter,
    };
  }

  if (!addressMatches(address, voter.address)) {
    return {
      status: "flagged",
      message: `Address mismatch — voter file shows: ${voter.address || "no address"}${voter.city ? `, ${voter.city}` : ""}`,
      voter,
    };
  }

  return { status: "matched", message: `Matched: ${voterDisplay(voter)}`, voter };
}
