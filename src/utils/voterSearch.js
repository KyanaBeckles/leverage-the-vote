import { base44 } from "@/api/base44Client";

// The statewide voter file is ~9.5M records, so the app must never fetch it
// wholesale — unfiltered Voter queries hit the server's 20s limit. Matching
// instead pulls a small candidate set per signer with an indexed-style filter
// on last_name (+ city when known). Voter names/cities are stored UPPERCASE,
// and multi-word surnames keep their space ("LA VOIX").

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
const SURNAME_PREFIXES = ["LA", "LE", "DE", "DI", "DA", "DEL", "VAN", "VON", "MC", "MAC", "ST"];

function cleanParts(name) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z'-]/g, ""))
    .filter(Boolean);
  while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  return parts;
}

export function extractLastName(name) {
  const parts = cleanParts(name);
  if (parts.length < 2) return null; // need at least first + last to match safely
  return parts[parts.length - 1].toUpperCase();
}

// Ordered surname guesses to query, most specific first:
// "Agnes La Voix" → ["LA VOIX", "VOIX"]; "Agnes LaVoix" → ["LAVOIX", "LA VOIX"].
export function lastNameQueryVariants(name) {
  const parts = cleanParts(name).map((p) => p.toUpperCase());
  if (parts.length < 2) return [];
  const variants = [];
  const last = parts[parts.length - 1];
  if (parts.length >= 3) variants.push(`${parts[parts.length - 2]} ${last}`);
  variants.push(last);
  for (const prefix of SURNAME_PREFIXES) {
    if (last.startsWith(prefix) && last.length > prefix.length + 1) {
      variants.push(`${prefix} ${last.slice(prefix.length)}`);
      break;
    }
  }
  return variants;
}

export async function fetchCandidateVoters(campaignId, signerName, signerCity) {
  const variants = lastNameQueryVariants(signerName);
  if (!campaignId || variants.length === 0) return [];

  const city = (signerCity || "").trim().toUpperCase();
  try {
    for (const lastName of variants) {
      if (city) {
        const withCity = await base44.entities.Voter.filter(
          { campaign_id: campaignId, last_name: lastName, city },
          "-created_date",
          200
        );
        if (withCity.length > 0) return withCity;
        // City may be misspelled or abbreviated on the sheet — retry without it.
      }
      const anywhere = await base44.entities.Voter.filter(
        { campaign_id: campaignId, last_name: lastName },
        "-created_date",
        200
      );
      if (anywhere.length > 0) return anywhere;
    }
    return [];
  } catch {
    return [];
  }
}
