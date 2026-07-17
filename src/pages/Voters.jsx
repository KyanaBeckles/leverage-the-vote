import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Upload, MapPin, Filter, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, X, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ClearVotersButton from "@/components/import/ClearVotersButton";

const contactColors = {
  unknown: "bg-slate-100 text-slate-600",
  not_home: "bg-yellow-100 text-yellow-700",
  supportive: "bg-green-100 text-green-700",
  undecided: "bg-blue-100 text-blue-700",
  opposed: "bg-red-100 text-red-700",
  signed: "bg-emerald-100 text-emerald-800",
};

// Party names as stored by the statewide import (MA SOS code → name mapping)
const PARTIES = [
  "Democrat", "Republican", "Unenrolled", "Libertarian", "Green-Rainbow",
  "Green Party USA", "Working Families", "Conservative", "Constitution Party",
  "American Independent", "Socialist", "Reform", "Pirate",
];

const CONTACT_OPTIONS = [
  ["all", "All Contact"], ["unknown", "Unknown"], ["not_home", "Not Home"],
  ["supportive", "Supportive"], ["undecided", "Undecided"], ["opposed", "Opposed"],
  ["signed", "Signed"], ["unsigned", "Unsigned"],
];

const EMPTY_FACETS = { last_name: "", city: "", zip: "", ward: "", precinct: "", party: "all", status: "all" };

const FACET_LABELS = {
  last_name: "Last name", city: "City", zip: "ZIP", ward: "Ward",
  precinct: "Precinct", party: "Party", status: "Voter status",
};

export default function Voters() {
  const [inputs, setInputs] = useState(EMPTY_FACETS);
  const [facets, setFacets] = useState(EMPTY_FACETS);
  const [contactFilter, setContactFilter] = useState("all");
  const [sort, setSort] = useState({ key: "last_name", dir: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const pageSize = 100;

  // Debounce: every facet change is a real server query against 9.5M rows.
  useEffect(() => {
    const t = setTimeout(() => setFacets(inputs), 500);
    return () => clearTimeout(t);
  }, [inputs]);

  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  // The statewide file is ~9.5M records — fetching it wholesale times out
  // server-side. Every filter is an exact-match server query; results are
  // capped at 500 rows, so narrow filters (city + ward, last name) work best.
  const activeFacetEntries = Object.entries(facets).filter(([k, v]) =>
    v && v !== "all" && v.trim?.() !== ""
  );

  const { data: voters = [], isFetching } = useQuery({
    queryKey: ["voters", campaign?.id, JSON.stringify(facets)],
    queryFn: async () => {
      if (!campaign) return [];
      const query = { campaign_id: campaign.id };
      const f = facets;
      if (f.last_name.trim()) query.last_name = f.last_name.trim().toUpperCase();
      if (f.city.trim()) query.city = f.city.trim().toUpperCase();
      if (f.zip.trim()) query.zip = f.zip.trim();
      if (f.ward.trim()) query.ward = f.ward.trim();
      if (f.precinct.trim()) query.precinct = f.precinct.trim();
      if (f.party !== "all") query.party_affiliation = f.party;
      if (f.status !== "all") query.voter_status = f.status;
      const limit = Object.keys(query).length > 1 ? 500 : 100;
      return base44.entities.Voter.filter(query, "-created_date", limit).catch(() => []);
    },
    enabled: !!campaign,
  });

  const filtered = voters.filter(v => contactFilter === "all" ||
    (contactFilter === "unsigned" ? v.contact_status !== "signed" : v.contact_status === contactFilter));

  const sorted = useMemo(() => {
    const keyFns = {
      last_name: (v) => `${v.last_name || ""} ${v.first_name || ""}`,
      address: (v) => `${v.street_name || ""} ${v.street_number || ""}`,
      city: (v) => v.city || "",
      ward: (v) => `${v.ward || ""}-${v.precinct || ""}`,
      party: (v) => v.party_affiliation || "",
      voter_status: (v) => v.voter_status || "",
      contact_status: (v) => v.contact_status || "",
    };
    const fn = keyFns[sort.key] || keyFns.last_name;
    const out = [...filtered].sort((a, b) => fn(a).localeCompare(fn(b), undefined, { numeric: true }));
    return sort.dir === "desc" ? out.reverse() : out;
  }, [filtered, sort]);

  useEffect(() => { setCurrentPage(1); }, [facets, contactFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);

  const setFacet = (key, value) => setInputs(prev => ({ ...prev, [key]: value }));
  const clearFacet = (key) => {
    const cleared = { [key]: key === "party" || key === "status" ? "all" : "" };
    setInputs(prev => ({ ...prev, ...cleared }));
    setFacets(prev => ({ ...prev, ...cleared }));
  };
  const clearAll = () => { setInputs(EMPTY_FACETS); setFacets(EMPTY_FACETS); setContactFilter("all"); };

  const hasFilters = activeFacetEntries.length > 0 || contactFilter !== "all";
  const atCap = voters.length >= 500;

  const SortHeader = ({ colKey, children }) => {
    const is = sort.key === colKey;
    return (
      <TableHead
        onClick={() => setSort(s => ({ key: colKey, dir: s.key === colKey && s.dir === "asc" ? "desc" : "asc" }))}
        className="cursor-pointer select-none hover:text-foreground"
        aria-sort={is ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {is
            ? (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
            : <ArrowUpDown className="w-3 h-3 opacity-30" />}
        </span>
      </TableHead>
    );
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Voter File</h1>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? `${sorted.length.toLocaleString()}${atCap ? "+" : ""} result${sorted.length === 1 ? "" : "s"}${isFetching ? "…" : ""}${atCap ? " — showing first 500, narrow your filters for a complete list" : ""}`
              : "Statewide MA voter file loaded — use filters to drill down"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Filters
          </Button>
          {voters.length > 0 && (
            <ClearVotersButton campaignId={campaign?.id} onCleared={() => queryClient.invalidateQueries({ queryKey: ["voters"] })} />
          )}
          <Link to="/import">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-1.5" /> Import Voters
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="relative col-span-2 lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={inputs.last_name} onChange={(e) => setFacet("last_name", e.target.value)} placeholder="Last name" className="pl-9" />
              </div>
              <Input value={inputs.city} onChange={(e) => setFacet("city", e.target.value)} placeholder="City" />
              <Input value={inputs.zip} onChange={(e) => setFacet("zip", e.target.value)} placeholder="ZIP" />
              <Input value={inputs.ward} onChange={(e) => setFacet("ward", e.target.value)} placeholder="Ward" />
              <Input value={inputs.precinct} onChange={(e) => setFacet("precinct", e.target.value)} placeholder="Precinct" />
              <Select value={inputs.party} onValueChange={(v) => { setFacet("party", v); setFacets(prev => ({ ...prev, party: v })); }}>
                <SelectTrigger><SelectValue placeholder="Party" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {PARTIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Select value={inputs.status} onValueChange={(v) => { setFacet("status", v); setFacets(prev => ({ ...prev, status: v })); }}>
                <SelectTrigger className="w-44">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Active + Inactive</SelectItem>
                  <SelectItem value="active">Active Voters</SelectItem>
                  <SelectItem value="inactive">Inactive Voters</SelectItem>
                </SelectContent>
              </Select>
              <Select value={contactFilter} onValueChange={setContactFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_OPTIONS.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {activeFacetEntries.map(([key, value]) => (
            <Badge key={key} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
              <span className="text-muted-foreground">{FACET_LABELS[key]}:</span> {String(value)}
              <button onClick={() => clearFacet(key)} className="ml-0.5 rounded-full hover:bg-muted p-0.5" aria-label={`Remove ${FACET_LABELS[key]} filter`}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {contactFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
              <span className="text-muted-foreground">Contact:</span> {contactFilter.replace(/_/g, " ")}
              <button onClick={() => setContactFilter("all")} className="ml-0.5 rounded-full hover:bg-muted p-0.5" aria-label="Remove contact filter">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2 text-xs text-muted-foreground">
            Clear all
          </Button>
        </div>
      )}

      {voters.length === 0 && !hasFilters ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Voter Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload your state voter file to power signature verification and canvassing</p>
            <Link to="/import">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Upload className="w-4 h-4 mr-1.5" /> Import Voter File
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader colKey="last_name">Name</SortHeader>
                <SortHeader colKey="address">Address</SortHeader>
                <SortHeader colKey="city">City</SortHeader>
                <SortHeader colKey="ward">Ward/Pct</SortHeader>
                <SortHeader colKey="party">Party</SortHeader>
                <SortHeader colKey="voter_status">Status</SortHeader>
                <SortHeader colKey="contact_status">Contact</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((voter) => (
                <TableRow key={voter.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-sm">
                    {voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[voter.address, voter.apt_number ? `Apt ${voter.apt_number}` : null].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{voter.city || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[voter.ward, voter.precinct].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{voter.party_affiliation || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] px-1.5 py-0 ${voter.voter_status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500"}`}>
                      {voter.voter_status || "?"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] px-1.5 py-0 ${contactColors[voter.contact_status] || ""}`}>
                      {(voter.contact_status || "unknown").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    {isFetching
                      ? "Searching…"
                      : "No voters match these filters — or the search timed out. Adding a last name or city makes queries much faster."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {sorted.length > pageSize && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pageStart + 1}–{Math.min(pageStart + pageSize, sorted.length)} of {sorted.length.toLocaleString()}{atCap ? "+" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
