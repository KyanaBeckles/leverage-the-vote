import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

const VOTER_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP Code" },
  { key: "ward", label: "Ward" },
  { key: "precinct", label: "Precinct" },
  { key: "party_affiliation", label: "Party Affiliation" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "skip", label: "— Skip this column —" },
];

export default function DataImport() {
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  const parseCSV = (text) => {
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1, 6).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
    return { headers, rows, totalRows: lines.length - 1 };
  };

  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows, totalRows } = parseCSV(ev.target.result);
      setCsvHeaders(headers);
      setCsvPreview(rows);
      // Auto-map based on name similarity
      const autoMap = {};
      headers.forEach(h => {
        const lower = h.toLowerCase().replace(/[_\s-]/g, "");
        const match = VOTER_FIELDS.find(f => {
          const fLower = f.key.replace(/_/g, "");
          return lower.includes(fLower) || fLower.includes(lower);
        });
        autoMap[h] = match ? match.key : "skip";
      });
      setMapping(autoMap);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!campaign) return;
    setImporting(true);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split("\n").filter(l => l.trim());
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const dataLines = lines.slice(1);
      
      let imported = 0;
      let failed = 0;
      const batchSize = 25;

      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        const records = batch.map(line => {
          const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
          const record = { campaign_id: campaign.id };
          headers.forEach((h, idx) => {
            const field = mapping[h];
            if (field && field !== "skip") {
              record[field] = values[idx] || "";
            }
          });
          return record;
        }).filter(r => r.last_name || r.full_name);

        if (records.length > 0) {
          await base44.entities.Voter.bulkCreate(records);
          imported += records.length;
        }
        failed += batch.length - records.length;
        setProgress(Math.round(((i + batch.length) / dataLines.length) * 100));
      }

      setImportResult({ imported, failed, total: dataLines.length });
      setImporting(false);
      queryClient.invalidateQueries({ queryKey: ["voters"] });
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[900px]">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Data Import</h1>
        <p className="text-sm text-muted-foreground">Upload voter files and map columns to database fields</p>
      </div>

      {/* Upload Area */}
      <Card className={`mb-6 ${!file ? "border-dashed" : ""}`}>
        <CardContent className="p-8">
          {!file ? (
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold mb-2">Upload Voter File</h3>
              <p className="text-sm text-muted-foreground mb-4">Supports CSV files from your state voter database</p>
              <input type="file" ref={fileRef} accept=".csv" onChange={handleFileUpload} className="hidden" />
              <Button onClick={() => fileRef.current?.click()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Upload className="w-4 h-4 mr-1.5" /> Choose File
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-accent" />
              <div className="flex-1">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{csvHeaders.length} columns detected</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setFile(null); setCsvHeaders([]); setCsvPreview([]); setMapping({}); setImportResult(null); }}>
                Change File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {csvHeaders.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Column Mapping
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[240px]">Map your CSV columns to voter database fields. System auto-maps based on column names.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {csvHeaders.map(header => (
              <div key={header} className="flex items-center gap-3">
                <div className="w-1/3">
                  <Badge variant="outline" className="text-xs font-mono">{header}</Badge>
                  {csvPreview[0]?.[header] && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{csvPreview[0][header]}</p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                <Select value={mapping[header] || "skip"} onValueChange={(v) => setMapping({...mapping, [header]: v})}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOTER_FIELDS.map(f => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            
            {importing && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Importing... {progress}%
                </p>
              </div>
            )}

            {importResult && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    Import Complete: {importResult.imported} voters imported
                  </p>
                </div>
                {importResult.failed > 0 && (
                  <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {importResult.failed} rows skipped (missing required name)
                  </p>
                )}
              </div>
            )}

            {!importing && !importResult && (
              <Button onClick={handleImport} disabled={!campaign} className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                Import Voters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}