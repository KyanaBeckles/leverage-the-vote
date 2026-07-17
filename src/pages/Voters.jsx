import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Upload, MapPin, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function Voters() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Debounce server-side search — each lookup is a real query against 9.5M rows.
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  // The statewide file is ~9.5M records — fetching it wholesale times out
  // server-side. Browse shows a capped page; search queries the server by
  // exact last name and/or city (the fields voter records index on).
  const { data: voters = [], isFetching } = useQuery({
    queryKey: ["voters", campaign?.id, search],
    queryFn: async () => {
      if (!campaign) return [];
      const term = search.trim().toUpperCase();
      if (!term || term.length < 2) {
        return base44.entities.Voter.filter({ campaign_id: campaign.id }, "-created_date", 100);
      }
      const [byLast, byCity] = await Promise.all([
        base44.entities.Voter.filter({ campaign_id: campaign.id, last_name: term }, "-created_date", 100).catch(() => []),
        base44.entities.Voter.filter({ campaign_id: campaign.id, city: term }, "-created_date", 100).catch(() => []),
      ]);
      const seen = new Set();
      return [...byLast, ...byCity].filter(v => !seen.has(v.id) && seen.add(v.id));
    },
    enabled: !!campaign,
  });

  const filtered = voters.filter(v => filterStatus === "all" ||
    (filterStatus === "unsigned" ? v.contact_status !== "signed" : v.contact_status === filterStatus));

  useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Voter File</h1>
          <p className="text-sm text-muted-foreground">
            {search.trim().length >= 2
              ? `${filtered.length.toLocaleString()} result${filtered.length === 1 ? "" : "s"} for "${search.trim()}"${isFetching ? "…" : ""}`
              : "Statewide MA voter file loaded — search by last name or city"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by last name or city..." className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
            <SelectItem value="not_home">Not Home</SelectItem>
            <SelectItem value="supportive">Supportive</SelectItem>
            <SelectItem value="undecided">Undecided</SelectItem>
            <SelectItem value="opposed">Opposed</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="unsigned">Unsigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {voters.length === 0 ? (
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
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Ward/Precinct</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Contact Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((voter) => (
                <TableRow key={voter.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-sm">
                    {voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[voter.address, voter.apt_number ? `Apt ${voter.apt_number}` : null, voter.city].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[voter.ward, voter.precinct].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{voter.party_affiliation || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] px-1.5 py-0 ${contactColors[voter.contact_status] || ""}`}>
                      {(voter.contact_status || "unknown").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length.toLocaleString()}
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