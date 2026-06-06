import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, Loader2, HardDrive, Link as LinkIcon, Archive } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import GoogleDrivePicker from "@/components/import/GoogleDrivePicker";

const VOTER_FIELDS = [
  { key: "first_name",           label: "First Name" },
  { key: "last_name",            label: "Last Name" },
  { key: "full_name",            label: "Full Name" },
  { key: "address",              label: "Street Address" },
  { key: "city",                 label: "City/Town" },
  { key: "state",                label: "State" },
  { key: "zip",                  label: "ZIP Code" },
  { key: "ward",                 label: "Ward" },
  { key: "precinct",             label: "Precinct" },
  { key: "party_affiliation",    label: "Party Affiliation" },
  { key: "voter_status",         label: "Voter Status" },
  { key: "phone",                label: "Phone" },
  { key: "email",                label: "Email" },
  { key: "notes",                label: "Notes / Other" },
  { key: "skip",                 label: "— Skip this column —" },
];

// Maps known column name patterns from the MA Special Request Voter Extract
// to VOTER_FIELDS keys. Checked against the lowercased, stripped column header.
const COLUMN_AUTO_MAP = [
  { keys: ["firstname","first_name","fname"],                       field: "first_name" },
  { keys: ["lastname","last_name","lname","surname"],               field: "last_name" },
  { keys: ["fullname","full_name","name"],                          field: "full_name" },
  { keys: ["middlename","middle_name","mname"],                     field: "skip" },
  { keys: ["title","suffix"],                                       field: "skip" },
  { keys: ["streetno","streetnum","streetaddressno","resnumber",
            "resaddressno","resstreetno"],                           field: "skip" },
  { keys: ["streetnosuffix","resstreetsuffix"],                     field: "skip" },
  { keys: ["streetname","resstreetname","residentialaddressstreetname",
            "residentialaddress-streetname"],                       field: "address" },
  { keys: ["aptno","apt","apartment","resaptno","residentialaddressapt"],field: "skip" },
  { keys: ["zipcode","zip","reszip","residentialaddresszipcode",
            "residentialzipcode","zip_code"],                       field: "zip" },
  { keys: ["mailingstreet","mailingaddress","mailingstreetaddress"], field: "skip" },
  { keys: ["mailingapt"],                                           field: "skip" },
  { keys: ["mailingcity","mailingcitytown"],                        field: "skip" },
  { keys: ["mailingstate"],                                         field: "skip" },
  { keys: ["mailingzip","mailingzipcode"],                          field: "skip" },
  { keys: ["citycode","citytowncode"],                              field: "skip" },
  { keys: ["cityname","citytownname","city","town","municipality"],  field: "city" },
  { keys: ["county","countyname"],                                  field: "skip" },
  { keys: ["voterid","voter_id","voteridentification"],             field: "skip" },
  { keys: ["party","partyaffiliation","partyaff","partycode"],      field: "party_affiliation" },
  { keys: ["gender","sex"],                                         field: "skip" },
  { keys: ["dob","dateofbirth","birthdate","birthdate"],            field: "skip" },
  { keys: ["regdate","registrationdate","registrationdt"],          field: "skip" },
  { keys: ["ward","wardnumber","wardno"],                           field: "ward" },
  { keys: ["precinct","precinctno","precinctnumber"],               field: "precinct" },
  { keys: ["congressionaldistrict","congressional"],                field: "skip" },
  { keys: ["sendistrict","senatorialdistrict","senatorial"],        field: "skip" },
  { keys: ["repdistrict","staterepresentativedistrict","representative"], field: "skip" },
  { keys: ["voterstatus","status","voteractivity"],                 field: "voter_status" },
  { keys: ["phone","telephone","phonenumber"],                      field: "phone" },
  { keys: ["email","emailaddress"],                                 field: "email" },
];

// Extract file ID from a Google Drive share link
function extractDriveFileId(url) {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,          // Drive file
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,  // Google Sheets
    /\/document\/d\/([a-zA-Z0-9_-]+)/,      // Google Docs
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,  // Google Slides
    /[?&]id=([a-zA-Z0-9_-]+)/,              // ?id= param
    /\/open\?id=([a-zA-Z0-9_-]+)/,          // open?id=
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractDriveFolderId(url) {
  const m = url.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Unzip a base64-encoded zip and return first CSV text found
async function unzipFirstCSV(base64) {
  // Convert base64 → Uint8Array
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // Use DecompressionStream on each file entry (manual ZIP parsing)
  // Simple ZIP parser: find Local File Headers (PK\x03\x04)
  const view = new DataView(bytes.buffer);
  const results = [];

  let offset = 0;
  while (offset < bytes.length - 4) {
    if (view.getUint32(offset, true) !== 0x04034b50) { offset++; continue; }
    const flags = view.getUint16(offset + 6, true);
    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
    const fileName = new TextDecoder().decode(fileNameBytes);
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);

    if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
      let text;
      if (compression === 0) {
        text = new TextDecoder().decode(compressed);
      } else if (compression === 8) {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(compressed);
        writer.close();
        const buf = await new Response(ds.readable).arrayBuffer();
        text = new TextDecoder().decode(buf);
      }
      if (text) results.push({ name: fileName, text });
    }

    offset = dataStart + compressedSize;
  }

  return results;
}

export default function DataImport() {
  const [source, setSource] = useState("local"); // "local" | "drive_browse" | "drive_link"
  const [driveLink, setDriveLink] = useState("");
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  const [file, setFile] = useState(null); // { name, text } or { name, base64, contentType }
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [zipFiles, setZipFiles] = useState([]); // extracted CSVs from a zip
  const [driveFolderOverride, setDriveFolderOverride] = useState(null);
  const [fileDelimiter, setFileDelimiter] = useState(",");
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  const parseCSV = (text) => {
    const lines = text.split("\n").filter(l => l.trim());
    // Auto-detect delimiter: pipe-delimited if first line has more pipes than commas
    const firstLine = lines[0];
    const delimiter = (firstLine.split("|").length - 1) >= (firstLine.split(",").length - 1) ? "|" : ",";
    const splitLine = (line) => line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
    const headers = splitLine(firstLine);
    const rows = lines.slice(1, 6).map(line => {
      const values = splitLine(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
    return { headers, rows, totalRows: lines.length - 1, delimiter };
  };

  const loadCSVText = (text, name) => {
    setFile({ name, text });
    setImportResult(null);
    setZipFiles([]);
    const { headers, rows, delimiter } = parseCSV(text);
    setCsvHeaders(headers);
    setCsvPreview(rows);
    setFileDelimiter(delimiter);
    const autoMap = {};
    headers.forEach(h => {
      const lower = h.toLowerCase().replace(/[\s_\-/.]/g, "");
      const entry = COLUMN_AUTO_MAP.find(e => e.keys.some(k => k === lower || lower.includes(k) || k.includes(lower)));
      autoMap[h] = entry ? entry.field : "skip";
    });
    setMapping(autoMap);
  };

  const handleLocalFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.name.endsWith(".zip")) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const binary = ev.target.result;
        const bytes = new Uint8Array(binary);
        let b64 = "";
        for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
        const base64 = btoa(b64);
        const csvs = await unzipFirstCSV(base64);
        if (csvs.length === 1) {
          loadCSVText(csvs[0].text, csvs[0].name);
        } else if (csvs.length > 1) {
          setZipFiles(csvs);
          setFile({ name: f.name });
          setImportResult(null);
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => loadCSVText(ev.target.result, f.name);
      reader.readAsText(f);
    }
  };

  const handleDriveFilePicked = async (driveFile) => {
    setShowDrivePicker(false);
    setLoadingDrive(true);
    const res = await base44.functions.invoke("googleDriveFiles", { action: "download", fileId: driveFile.id });
    const { base64, contentType } = res.data;
    setLoadingDrive(false);

    if (driveFile.name.endsWith(".zip") || contentType?.includes("zip")) {
      const csvs = await unzipFirstCSV(base64);
      if (csvs.length === 1) {
        loadCSVText(csvs[0].text, csvs[0].name);
      } else if (csvs.length > 1) {
        setZipFiles(csvs);
        setFile({ name: driveFile.name });
        setImportResult(null);
      }
    } else {
      const binary = atob(base64);
      loadCSVText(binary, driveFile.name);
    }
  };

  const handleDriveLinkLoad = async () => {
    // If it's a folder link, open the picker at that folder
    const folderId = extractDriveFolderId(driveLink);
    if (folderId) {
      setSource("drive_browse");
      setShowDrivePicker(true);
      // Pre-navigate picker to that folder by passing it as initial stack
      setDriveFolderOverride(folderId);
      setDriveLink("");
      return;
    }

    const fileId = extractDriveFileId(driveLink);
    if (!fileId) { alert("Couldn't find a file ID in that link. Make sure it's a valid Google Drive share link (file or folder)."); return; }
    setLoadingDrive(true);
    const res = await base44.functions.invoke("googleDriveFiles", { action: "download", fileId });
    const { base64, contentType } = res.data;
    setLoadingDrive(false);

    if (contentType?.includes("zip")) {
      const csvs = await unzipFirstCSV(base64);
      if (csvs.length === 1) {
        loadCSVText(csvs[0].text, csvs[0].name);
      } else if (csvs.length > 1) {
        setZipFiles(csvs);
        setFile({ name: "drive-link.zip" });
      }
    } else {
      const binary = atob(base64);
      loadCSVText(binary, "drive-file.csv");
    }
  };

  const resetFile = () => {
    setFile(null); setCsvHeaders([]); setCsvPreview([]); setMapping({});
    setImportResult(null); setZipFiles([]); setDriveLink("");
  };

  const handleImport = async () => {
    if (!campaign || !file?.text) return;
    setImporting(true);
    setProgress(0);

    const lines = file.text.split("\n").filter(l => l.trim());
    const splitLine = (line) => line.split(fileDelimiter).map(v => v.trim().replace(/^"|"$/g, ""));
    const headers = splitLine(lines[0]);
    const dataLines = lines.slice(1);
    let imported = 0, failed = 0;
    const batchSize = 25;

    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize);
      const records = batch.map(line => {
        const values = splitLine(line);
        const record = { campaign_id: campaign.id };
        headers.forEach((h, idx) => {
          const field = mapping[h];
          if (!field || field === "skip") return;
          let val = values[idx] || "";
          // Translate single-char voter status codes
          if (field === "voter_status") {
            if (val === "A") val = "active";
            else if (val === "I") val = "inactive";
          }
          record[field] = val;
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

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[900px]">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Data Import</h1>
        <p className="text-sm text-muted-foreground">Upload voter files from your computer, Google Drive, or a share link. ZIP files are automatically extracted.</p>
      </div>

      {/* Source selector */}
      {!file && (
        <div className="flex gap-2 mb-4">
          {[
            { id: "local", label: "Upload File", icon: Upload },
            { id: "drive_browse", label: "Browse Google Drive", icon: HardDrive },
            { id: "drive_link", label: "Paste Drive Link", icon: LinkIcon },
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={source === id ? "default" : "outline"}
              size="sm"
              onClick={() => { setSource(id); setShowDrivePicker(id === "drive_browse"); }}
              className={source === id ? "bg-primary text-primary-foreground" : ""}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" /> {label}
            </Button>
          ))}
        </div>
      )}

      {/* Upload area */}
      <Card className={`mb-6 ${!file ? "border-dashed" : ""}`}>
        <CardContent className="p-8">
          {loadingDrive ? (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Downloading from Google Drive…</p>
            </div>
          ) : file ? (
            <div>
              <div className="flex items-center gap-3">
                {file.name?.endsWith(".zip") ? <Archive className="w-8 h-8 text-amber-500" /> : <FileText className="w-8 h-8 text-accent" />}
                <div className="flex-1">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {zipFiles.length > 0 ? `ZIP contains ${zipFiles.length} CSV files — select one below` : `${csvHeaders.length} columns detected`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetFile}>Change File</Button>
              </div>

              {/* ZIP file selector */}
              {zipFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select a CSV from the ZIP:</p>
                  {zipFiles.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => loadCSVText(f.text, f.name)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : source === "local" ? (
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold mb-2">Upload Voter File</h3>
              <p className="text-sm text-muted-foreground mb-4">Supports CSV files and ZIP archives from your state voter database</p>
              <input type="file" ref={fileRef} accept=".csv,.zip" onChange={handleLocalFile} className="hidden" />
              <Button onClick={() => fileRef.current?.click()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Upload className="w-4 h-4 mr-1.5" /> Choose File
              </Button>
            </div>
          ) : source === "drive_browse" ? (
            <div>
              <GoogleDrivePicker
                onFileSelected={handleDriveFilePicked}
                onClose={() => { setShowDrivePicker(false); setDriveFolderOverride(null); }}
                initialFolderId={driveFolderOverride}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-base font-display font-semibold">Paste a Google Drive Share Link</h3>
              </div>
              <p className="text-sm text-muted-foreground">Right-click any file in Google Drive → Share → Copy link, then paste it here.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleDriveLinkLoad} disabled={!driveLink} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Load
                </Button>
              </div>
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
                <Select value={mapping[header] || "skip"} onValueChange={(v) => setMapping({ ...mapping, [header]: v })}>
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