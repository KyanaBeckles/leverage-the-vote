import { base44 } from "@/api/base44Client";

// The statewide voter file is ~9.5M records, so the app must never fetch it
// wholesale — unfiltered Voter queries hit the server's 20s limit. Matching
// instead pulls a small candidate set per signer with an indexed-style filter
// on last_name (+ city when known). Voter names/cities are stored UPPERCASE,
// and multi-word surnames keep their space ("LA VOIX").
//
// Brockton (the current field focus) is mirrored in a Supabase Postgres table
// with real indexes — those lookups return in milliseconds, so it's tried
// first; anything it can't answer falls back to the statewide base44 file.

const SUPABASE_URL = "https://zdxhbtvvcnxicbhgelao.supabase.co";
const SUPABASE_KEY = "sb_publishable_iOXQl3OSW3M56U72_k7now_fvHOyWAY"; // read-only (RLS)

async function supabaseCandidates(lastName, city) {
  const params = new URLSearchParams({ last_name: `eq.${lastName}`, limit: "200" });
  if (city) params.set("city", `eq.${city}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/voters?${params}`, {
    headers: { apikey: SUPABASE_KEY },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  return res.json(); // rows share field names with base44 Voter (last_name, first_name, address, city, voter_status)
}

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

// Boston neighborhoods appear as their own mailing cities in the voter file,
// and signers write either one — search both. Signers also often write a ZIP
// or "Dorchester MA 02124" in the city box; normalize before querying.
const BOSTON_NEIGHBORHOODS = new Set([
  "DORCHESTER", "ROXBURY", "MATTAPAN", "HYDE PARK", "JAMAICA PLAIN",
  "ROSLINDALE", "BRIGHTON", "ALLSTON", "CHARLESTOWN", "EAST BOSTON",
  "SOUTH BOSTON", "WEST ROXBURY", "DORCHESTER CENTER", "GROVE HALL",
]);

export function parseCityGuess(raw) {
  const text = (raw || "").trim().toUpperCase();
  if (!text) return { cities: [], zip: null };
  const zipMatch = text.match(/\b(\d{5})\b/);
  const zip = zipMatch ? zipMatch[1] : null;
  // Drop state + zip fragments: "DORCHESTER MA 02124" → "DORCHESTER"
  const city = text.replace(/\b\d{5}(-\d{4})?\b/g, "").replace(/\bMA\b\.?/g, "").replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  const cities = [];
  if (city) {
    cities.push(city);
    if (BOSTON_NEIGHBORHOODS.has(city)) cities.push("BOSTON");
    else if (city === "BOSTON") cities.push(...["DORCHESTER", "ROXBURY", "MATTAPAN", "HYDE PARK", "JAMAICA PLAIN", "ROSLINDALE", "BRIGHTON", "ALLSTON", "CHARLESTOWN", "EAST BOSTON", "SOUTH BOSTON", "WEST ROXBURY"]);
  }
  return { cities, zip };
}

export async function fetchCandidateVoters(campaignId, signerName, signerCity) {
  const variants = lastNameQueryVariants(signerName);
  if (!campaignId || variants.length === 0) return [];

  const { cities, zip } = parseCityGuess(signerCity);
  const city = cities[0] || "";

  // Fast path: Supabase mirror (currently Brockton). Millisecond queries.
  try {
    for (const lastName of variants) {
      if (city) {
        const withCity = await supabaseCandidates(lastName, city);
        if (withCity.length > 0) return withCity;
      }
      const anywhere = await supabaseCandidates(lastName, null);
      if (anywhere.length > 0) return anywhere;
    }
  } catch {
    // Supabase unreachable — fall through to base44.
  }

  // Statewide fallback: base44 Voter entity (slower, but covers all of MA).
  // Try each surname variant against: each city guess, then the signer's ZIP,
  // then statewide.
  try {
    for (const lastName of variants) {
      for (const c of cities) {
        const withCity = await base44.entities.Voter.filter(
          { campaign_id: campaignId, last_name: lastName, city: c },
          "-created_date",
          200
        );
        if (withCity.length > 0) return withCity;
      }
      if (zip) {
        const withZip = await base44.entities.Voter.filter(
          { campaign_id: campaignId, last_name: lastName, zip },
          "-created_date",
          200
        );
        if (withZip.length > 0) return withZip;
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
