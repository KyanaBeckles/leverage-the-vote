import { describe, expect, it } from "vitest";
import { NICKNAMES, firstNameCandidates, matchVoterForSignature } from "../matchVoter.js";

// Voter fixtures mirror the shape described in the module's own comment:
// UPPERCASE first_name/last_name/address/city, full_name usually null.
const richard = {
  id: "v1",
  first_name: "RICHARD",
  last_name: "BELLAVANCE",
  full_name: null,
  address: "9 MORGAN RD WY",
  city: "YARMOUTH",
  voter_status: "active",
};

const agnesLaVoix = {
  id: "v2",
  first_name: "AGNES",
  last_name: "LA VOIX",
  full_name: null,
  address: "12 SEA ST",
  city: "YARMOUTH",
  voter_status: "active",
};

const billWilliam = {
  id: "v3",
  first_name: "WILLIAM",
  last_name: "GREENBERG",
  full_name: null,
  address: "5 MAIN ST",
  city: "YARMOUTH",
  voter_status: "active",
};

describe("matchVoterForSignature", () => {
  it("returns matched for an exact name + address match", () => {
    const result = matchVoterForSignature("Richard Bellavance", "9 Morgan Rd Wy", [richard]);
    expect(result.status).toBe("matched");
    expect(result.voter).toBe(richard);
    expect(result.message).toContain("Matched");
  });

  it("matches a multi-word surname written with a space: 'Agnes La Voix'", () => {
    const result = matchVoterForSignature("Agnes La Voix", "", [agnesLaVoix]);
    expect(result.status).toBe("matched");
    expect(result.voter).toBe(agnesLaVoix);
  });

  it("matches a multi-word surname written as one word: 'Agnes LaVoix'", () => {
    const result = matchVoterForSignature("Agnes LaVoix", "", [agnesLaVoix]);
    expect(result.status).toBe("matched");
    expect(result.voter).toBe(agnesLaVoix);
  });

  it("matches a nickname on the signature side: 'Bill Greenberg' -> WILLIAM", () => {
    const result = matchVoterForSignature("Bill Greenberg", "", [billWilliam]);
    expect(result.status).toBe("matched");
    expect(result.voter).toBe(billWilliam);
  });

  it("matches a nickname in the reverse direction: signer writes the formal name, file has the nickname", () => {
    const billOnFile = { ...billWilliam, first_name: "BILL" };
    const result = matchVoterForSignature("William Greenberg", "", [billOnFile]);
    expect(result.status).toBe("matched");
    expect(result.voter).toBe(billOnFile);
  });

  it("matches on an initial: 'R Bellavance' -> RICHARD BELLAVANCE", () => {
    const result = matchVoterForSignature("R Bellavance", "", [richard]);
    expect(result.status).toBe("matched");
    expect(result.voter).toBe(richard);
  });

  it("strips a generational suffix and a middle initial: 'Richard L. Bellavance Jr'", () => {
    const result = matchVoterForSignature("Richard L. Bellavance Jr", "", [richard]);
    expect(result.status).toBe("matched");
    expect(result.voter).toBe(richard);
  });

  it("flags an address mismatch and names the voter-file address in the message", () => {
    const result = matchVoterForSignature("Richard Bellavance", "5 Elm St", [richard]);
    expect(result.status).toBe("flagged");
    expect(result.message).toContain(richard.address);
  });

  it("flags (never matches) when the only candidates are inactive", () => {
    const inactiveRichard = { ...richard, voter_status: "inactive" };
    const result = matchVoterForSignature("Richard Bellavance", "9 Morgan Rd Wy", [inactiveRichard]);
    expect(result.status).toBe("flagged");
    expect(result.status).not.toBe("matched");
    expect(result.message.toLowerCase()).toContain("inactive");
  });

  it("flags multiple active same-name candidates when the address doesn't disambiguate", () => {
    const richard2 = { ...richard, id: "v1b", address: "22 OCEAN AVE" };
    const result = matchVoterForSignature("Richard Bellavance", "1 Unknown Ln", [richard, richard2]);
    expect(result.status).toBe("flagged");
    expect(result.message).toContain("2");
    expect(result.message.toLowerCase()).toContain("possible active voters");
  });

  it("resolves multiple active same-name candidates when the address narrows to one", () => {
    const richard2 = { ...richard, id: "v1b", address: "22 OCEAN AVE" };
    const result = matchVoterForSignature("Richard Bellavance", "9 Morgan Rd Wy", [richard, richard2]);
    expect(result.status).toBe("matched");
    expect(result.voter.id).toBe("v1");
  });

  it("returns unmatched when there are no candidates with this name", () => {
    const result = matchVoterForSignature("Zaphod Beeblebrox", "", [richard]);
    expect(result.status).toBe("unmatched");
    expect(result.voter).toBeNull();
  });

  it("flags a single-word name (needs first and last)", () => {
    const result = matchVoterForSignature("Cher", "", [richard]);
    expect(result.status).toBe("flagged");
    expect(result.message).toContain("first and last name");
    expect(result.voter).toBeNull();
  });

  it("returns null for null input", () => {
    expect(matchVoterForSignature(null, "", [richard])).toBeNull();
  });

  it("returns null for input shorter than 3 characters", () => {
    expect(matchVoterForSignature("Al", "", [richard])).toBeNull();
  });

  it("returns null for empty string input", () => {
    expect(matchVoterForSignature("", "", [richard])).toBeNull();
  });
});

describe("firstNameCandidates", () => {
  it("expands a nickname to its formal name(s)", () => {
    const candidates = firstNameCandidates("bill");
    expect(candidates).toContain("bill");
    expect(candidates).toContain("william");
  });

  it("passes unknown names through unchanged", () => {
    expect(firstNameCandidates("zoltan")).toEqual(["zoltan"]);
  });
});

describe("NICKNAMES", () => {
  it("maps common nicknames to formal names", () => {
    expect(NICKNAMES.bill).toContain("william");
    expect(NICKNAMES.bob).toContain("robert");
  });
});
