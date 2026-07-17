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

// Common nickname → formal-name equivalences (lowercase). Signers write "Bill";
// the voter file says "WILLIAM" — without this they never match.
export const NICKNAMES = {
  bill: ["william"], billy: ["william"], will: ["william"], willie: ["william"], liam: ["william"],
  bob: ["robert"], bobby: ["robert"], rob: ["robert"], robbie: ["robert"],
  jim: ["james"], jimmy: ["james"], jamie: ["james"],
  mike: ["michael"], mikey: ["michael"],
  steve: ["steven", "stephen"], stevie: ["steven", "stephen"],
  tony: ["anthony"], tom: ["thomas"], tommy: ["thomas"],
  dick: ["richard"], rick: ["richard"], richie: ["richard"], rich: ["richard"],
  ted: ["edward", "theodore"], teddy: ["edward", "theodore"], ed: ["edward", "edwin"], eddie: ["edward", "edwin"], ned: ["edward"],
  dan: ["daniel"], danny: ["daniel"], dave: ["david"], davey: ["david"],
  chris: ["christopher", "christine", "christina", "christian"],
  matt: ["matthew"], joe: ["joseph"], joey: ["joseph"],
  jack: ["john", "jackson"], johnny: ["john"], jon: ["jonathan", "john"],
  chuck: ["charles"], charlie: ["charles"], chas: ["charles"],
  ken: ["kenneth"], kenny: ["kenneth"], larry: ["lawrence"],
  jerry: ["gerald", "jerome"], terry: ["terence", "teresa", "theresa"],
  pat: ["patrick", "patricia"], patty: ["patricia"], trish: ["patricia"],
  peggy: ["margaret"], peg: ["margaret"], meg: ["margaret"], maggie: ["margaret"],
  beth: ["elizabeth"], liz: ["elizabeth"], lizzie: ["elizabeth"], betty: ["elizabeth"], betsy: ["elizabeth"],
  sue: ["susan", "suzanne"], susie: ["susan", "suzanne"],
  kate: ["katherine", "kathleen", "kathryn"], katie: ["katherine", "kathleen", "kathryn"], kathy: ["katherine", "kathleen", "kathryn"], kitty: ["katherine"],
  jen: ["jennifer"], jenny: ["jennifer"], becky: ["rebecca"],
  alex: ["alexander", "alexandra", "alexis"], sandy: ["alexandra", "sandra"],
  sam: ["samuel", "samantha"], sammy: ["samuel", "samantha"],
  ben: ["benjamin"], benny: ["benjamin"], nick: ["nicholas"], nicky: ["nicholas", "nicole"],
  andy: ["andrew"], drew: ["andrew"], greg: ["gregory"],
  fred: ["frederick"], freddy: ["frederick"], ray: ["raymond"],
  phil: ["philip", "phillip"], vince: ["vincent"], vinny: ["vincent"],
  deb: ["deborah", "debra"], debbie: ["deborah", "debra"],
  tim: ["timothy"], timmy: ["timothy"], don: ["donald"], donny: ["donald"],
  ron: ["ronald"], ronnie: ["ronald"], doug: ["douglas"],
  frank: ["francis", "franklin"], frankie: ["francis"],
  hank: ["henry"], harry: ["harold", "henry"], gerry: ["gerald"],
  walt: ["walter"], wally: ["walter"], gus: ["augustus", "gustave"],
  abe: ["abraham"], al: ["albert", "alfred", "alan", "allen"],
  art: ["arthur"], artie: ["arthur"], bert: ["albert", "robert", "herbert"],
  cathy: ["catherine", "cathleen"], chrissy: ["christine", "christina"],
  cindy: ["cynthia"], dolly: ["dorothy"], dot: ["dorothy"], dottie: ["dorothy"],
  ellie: ["eleanor", "ellen"], gail: ["abigail"], abby: ["abigail"],
  jackie: ["jacqueline", "jack"], jan: ["janet", "janice"],
  josh: ["joshua"], lou: ["louis", "louise"], lucy: ["lucille", "lucia"],
  mandy: ["amanda"], mel: ["melvin", "melissa"], mickey: ["michael"],
  nate: ["nathan", "nathaniel"], norm: ["norman"], ollie: ["oliver"],
  rosie: ["rose", "rosemary"], sally: ["sarah"], stan: ["stanley"],
  toni: ["antonia", "antoinette"], vicky: ["victoria"], zack: ["zachary"], zach: ["zachary"],
};

export function firstNameCandidates(first) {
  const f = (first || "").toLowerCase();
  const out = new Set([f]);
  for (const formal of NICKNAMES[f] || []) out.add(formal);
  // Reverse: signer wrote the formal name, file has... file is formal; skip reverse.
  return [...out].filter(Boolean);
}

function firstNameMatches(sigFirst, voterFirst) {
  if (!voterFirst) return false;
  if (sigFirst === voterFirst) return true;
  // Initials: "J" vs "JOHN"
  if (sigFirst.length === 1 || voterFirst.length === 1) return sigFirst[0] === voterFirst[0];
  if (voterFirst.startsWith(sigFirst) || sigFirst.startsWith(voterFirst)) return true;
  // Nicknames either direction: sheet "Bill" vs file "WILLIAM", sheet "William" vs file "BILL"
  if ((NICKNAMES[sigFirst] || []).includes(voterFirst)) return true;
  if ((NICKNAMES[voterFirst] || []).includes(sigFirst)) return true;
  return false;
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
