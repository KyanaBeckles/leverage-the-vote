import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, Loader2, HardDrive, Link as LinkIcon, Archive, Download, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import GoogleDrivePicker from "@/components/import/GoogleDrivePicker";
import ClearVotersButton from "@/components/import/ClearVotersButton";

const VOTER_FIELDS = [
  { key: "first_name",           label: "First Name" },
  { key: "middle_name",          label: "Middle Name" },
  { key: "last_name",            label: "Last Name" },
  { key: "full_name",            label: "Full Name" },
  { key: "street_number",        label: "Street Number (St#)" },
  { key: "street_name",          label: "Street Name" },
  { key: "apt_number",           label: "Apt #" },
  { key: "address",              label: "Street Address (combined)" },
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

// MA Voter Activity History File - exact pipe-delimited column order (0-indexed)
// City/Town is read directly from the plain-text name at index 12 (not the numeric
// code at index 15) — the code requires a City/Town ID lookup table that isn't
// reliably reconstructable (the state's real ID list is non-sequential, e.g.
// Aquinnah = 104, not 10), while the plain name is already right there in the file.
const MA_VOTER_ACTIVITY_COLUMNS = [
  { index: 0,  field: "skip",             label: "Election Date" },
  { index: 1,  field: "skip",             label: "Election Type Description" },
  { index: 2,  field: "skip",             label: "Voter ID" },
  { index: 3,  field: "last_name",        label: "Last Name" },
  { index: 4,  field: "first_name",       label: "First Name" },
  { index: 5,  field: "middle_name",      label: "Middle Name" },
  { index: 6,  field: "skip",             label: "Title" },
  { index: 7,  field: "street_number",    label: "Residential Street Number" },
  { index: 8,  field: "skip",             label: "Residential Street Number Suffix" },
  { index: 9,  field: "street_name",      label: "Residential Street Name" },
  { index: 10, field: "apt_number",       label: "Residential Apartment Number" },
  { index: 11, field: "zip",              label: "Residential Zip Code" },
  { index: 12, field: "city",             label: "City/Town Name" },
  { index: 13, field: "party_affiliation",label: "Party Affiliation" },
  { index: 14, field: "skip",             label: "Party Voted" },
  { index: 15, field: "skip",             label: "City/Town Code" },
  { index: 16, field: "ward",             label: "Ward Number" },
  { index: 17, field: "precinct",         label: "Precinct Number" },
  { index: 18, field: "voter_status",     label: "Voter Status" },
  { index: 19, field: "skip",             label: "Mailing Street Address" },
  { index: 20, field: "skip",             label: "Mailing Apartment Number" },
  { index: 21, field: "skip",             label: "Mailing City/Town Name" },
  { index: 22, field: "skip",             label: "Mailing State" },
  { index: 23, field: "skip",             label: "Mailing Zip" },
  { index: 24, field: "skip",             label: "Batch Date" },
];

// MA party code → full name lookup
const MA_PARTY_CODES = {
  V: "America First Party", Q: "American Independent", BB: "American Term Limits",
  A: "Conservative", K: "Constitution Party", D: "Democrat", JJ: "Forward Party",
  G: "Green Party USA", J: "Green-Rainbow", T: "Inter. 3rd Party",
  EE: "Latino-Vote Party", L: "Libertarian", O: "Mass Independent Party",
  B: "Natural Law Party", N: "New Alliance", C: "New World Council",
  X: "Pirate", AA: "Pizza Party", P: "Prohibition", F: "Rainbow Coalition",
  E: "Reform", R: "Republican", KK: "Socialism and Liberation", S: "Socialist",
  FF: "The People's Party", M: "Timesizing Not Down", DD: "Twelve Visions Party",
  U: "Unenrolled", CC: "United Independent Party", HH: "Unity Party",
  W: "Veteran Party America", H: "We The People", GG: "Workers Party",
  Z: "Working Families", Y: "World Citizens Party",
};

// Detect if a file matches the MA Voter Activity History layout (pipe-delimited, no header row)
function detectMAVoterActivityFormat(text) {
  const firstLine = text.split("\n")[0];
  const cols = firstLine.split("|");
  // MA file has ~25 pipe-delimited columns and no header (first col looks like a date MM/DD/YYYY)
  return cols.length >= 18 && /^\d{2}\/\d{2}\/\d{4}/.test(cols[0].trim());
}

// Excel silently stores ZIP codes as numbers, which strips the leading zero every
// Massachusetts ZIP starts with, and collapses 9-digit ZIP+4 codes into scientific
// notation (e.g. "02301-1433" -> 23011433 -> "2.3013101E7"). Since MA ZIPs always
// start with 0, a 4-digit value is a 5-digit ZIP missing its leading zero, and an
// 8-digit value is a 9-digit ZIP+4 missing its leading zero — both recoverable.
function repairMangledZip(raw) {
  const val = String(raw ?? "").trim();
  if (!val) return val;
  if (/^\d{5}(-\d{4})?$/.test(val)) return val; // already well-formed
  // A plain/decimal/scientific-notation number (e.g. "2301.0", "2.3013101E7") needs to be
  // rounded through Number() first — naively stripping non-digits would merge "2301.0"
  // into the wrong-length "23010" instead of the correct 4-digit "2301".
  const digits = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(val)
    ? String(Math.round(Number(val)))
    : val.replace(/\D/g, "");
  if (!/^\d+$/.test(digits)) return val;
  if (digits.length === 4) return `0${digits}`;
  if (digits.length === 5) return digits;
  if (digits.length === 8) return `0${digits.slice(0, 4)}-${digits.slice(4)}`;
  if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return val;
}

// Parse an Excel workbook (.xlsx/.xls/.xlsm) in-browser and return the first sheet
// as CSV text, so it can flow through the same header-mapping pipeline as a real CSV.
async function workbookBufferToCSV(buffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // raw:false forces every cell to its displayed text (not the underlying number/date),
  // and blankrows:false drops fully-empty rows some spreadsheets pad between records with.
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: false });
  const escapeCell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map(row => row.map(escapeCell).join(",")).join("\n");
}

async function excelToCSV(file) {
  return workbookBufferToCSV(await file.arrayBuffer());
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function isExcelFile(name, contentType) {
  return /\.(xlsx|xls|xlsm)$/i.test(name || "") ||
    contentType?.includes("spreadsheetml") || contentType?.includes("ms-excel");
}

// Maps known column name patterns from the MA Special Request Voter Extract
// to VOTER_FIELDS keys. Checked against the lowercased, stripped column header.
const COLUMN_AUTO_MAP = [
  { keys: ["firstname","first_name","fname"],                       field: "first_name" },
  { keys: ["lastname","last_name","lname","surname"],               field: "last_name" },
  { keys: ["fullname","full_name","name"],                          field: "full_name" },
  { keys: ["middlename","middle_name","mname","mi"],                field: "middle_name" },
  { keys: ["title","suffix"],                                       field: "skip" },
  { keys: ["st#","stno","streetno","streetnum","streetaddressno",
            "resnumber","resaddressno","resstreetno","houseno",
            "housenumber","streetnumber"],                          field: "street_number" },
  { keys: ["streetnosuffix","resstreetsuffix"],                     field: "skip" },
  { keys: ["street","streetname","resstreetname",
            "residentialaddressstreetname",
            "residentialaddress-streetname"],                       field: "street_name" },
  { keys: ["apt#","aptno","apt","apartment","resaptno",
            "residentialaddressapt","aptnumber"],                   field: "apt_number" },
  { keys: ["zipcode","zip","reszip","residentialaddresszipcode",
            "residentialzipcode","zip_code","zipcode"],             field: "zip" },
  { keys: ["mailingstreet","mailingaddress","mailingstreetaddress"], field: "skip" },
  { keys: ["mailingapt"],                                           field: "skip" },
  { keys: ["mailingcity","mailingcitytown"],                        field: "skip" },
  { keys: ["mailingstate"],                                         field: "skip" },
  { keys: ["mailingzip","mailingzipcode"],                          field: "skip" },
  { keys: ["citycode","citytowncode"],                              field: "skip" },
  { keys: ["cityname","citytownname","city","town","municipality"],  field: "city" },
  { keys: ["county","countyname"],                                  field: "skip" },
  { keys: ["voterid","voter_id","voteridentification"],             field: "skip" },
  { keys: ["party","partyaffiliation","partyaff","partycode","pty"], field: "party_affiliation" },
  { keys: ["gender","sex"],                                         field: "skip" },
  { keys: ["dob","dateofbirth","birthdate","birthdate"],            field: "skip" },
  { keys: ["regdate","registrationdate","registrationdt"],          field: "skip" },
  { keys: ["ward","wardnumber","wardno"],                           field: "ward" },
  { keys: ["precinct","precinctno","precinctnumber","prec"],        field: "precinct" },
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
  const [failedRows, setFailedRows] = useState([]);
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
    const pipes = firstLine.split("|").length - 1;
    const commas = firstLine.split(",").length - 1;
    const tabs = firstLine.split("\t").length - 1;
    const delimiter = tabs >= pipes && tabs >= commas ? "\t" : pipes >= commas ? "|" : ",";
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

    // Check if this is the MA Voter Activity History format (no header row, pipe-delimited)
    if (detectMAVoterActivityFormat(text)) {
      // Use the known column layout — synthesize header names from the spec
      const syntheticHeaders = MA_VOTER_ACTIVITY_COLUMNS.map(c => c.label);
      const autoMap = {};
      MA_VOTER_ACTIVITY_COLUMNS.forEach(c => { autoMap[c.label] = c.field; });

      // Build preview rows using synthetic headers
      const lines = text.split("\n").filter(l => l.trim());
      const rows = lines.slice(0, 5).map(line => {
        const values = line.split("|").map(v => v.trim());
        const row = {};
        syntheticHeaders.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });

      setCsvHeaders(syntheticHeaders);
      setCsvPreview(rows);
      setFileDelimiter("|");
      setMapping(autoMap);
      setFile({ name, text, maFormat: true });
      return;
    }

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
    if (isExcelFile(f.name)) {
      setLoadingDrive(true); // reuse the same "working" spinner while the workbook parses
      excelToCSV(f).then((csvText) => {
        setLoadingDrive(false);
        loadCSVText(csvText, f.name);
      });
    } else if (f.name.endsWith(".zip")) {
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
      reader.readAsText(f, "latin1");
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
    } else if (isExcelFile(driveFile.name, contentType)) {
      const csvText = await workbookBufferToCSV(base64ToArrayBuffer(base64));
      loadCSVText(csvText, driveFile.name);
    } else {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const text = new TextDecoder("windows-1252").decode(bytes);
      loadCSVText(text, driveFile.name);
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
    } else if (isExcelFile(driveLink, contentType)) {
      const csvText = await workbookBufferToCSV(base64ToArrayBuffer(base64));
      loadCSVText(csvText, "drive-file.xlsx");
    } else {
      const binary = atob(base64);
      // Decode as Latin-1 to handle Windows-1252 encoded state voter files
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const text = new TextDecoder("windows-1252").decode(bytes);
      loadCSVText(text, "drive-file.csv");
    }
  };

  const resetFile = () => {
    setFile(null); setCsvHeaders([]); setCsvPreview([]); setMapping({});
    setImportResult(null); setZipFiles([]); setDriveLink(""); setFailedRows([]);
  };

  const downloadFailedRows = () => {
    if (!failedRows.length) return;
    const headers = Object.keys(failedRows[0].row);
    const csvContent = [
      [...headers, "failure_reason"].join(","),
      ...failedRows.map(({ row, reason }) =>
        [...headers.map(h => `"${(row[h] || "").replace(/"/g, '""')}"`), `"${reason}"`].join(",")
      )
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "failed_rows.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!campaign || !file?.text) return;
    setImporting(true);
    setProgress(0);
    setFailedRows([]);

    const lines = file.text.split("\n").filter(l => l.trim());
    const splitLine = (line) => line.split(fileDelimiter).map(v => v.trim().replace(/^"|"$/g, ""));
    const isMaFormat = file.maFormat;
    const dataLines = isMaFormat ? lines : lines.slice(1);
    const headers = isMaFormat ? MA_VOTER_ACTIVITY_COLUMNS.map(c => c.label) : splitLine(lines[0]);

    const buildRecord = (line) => {
      const values = splitLine(line);
      const record = { campaign_id: campaign.id };
      headers.forEach((h, idx) => {
        const field = mapping[h];
        if (!field || field === "skip") return;
        let val = values[idx] || "";
        if (field === "voter_status") {
          if (val === "A") val = "active";
          else if (val === "I") val = "inactive";
        }
        if (field === "party_affiliation") {
          val = MA_PARTY_CODES[val.trim()] || val;
        }
        if (field === "zip") {
          val = repairMangledZip(val);
        }
        record[field] = val;
      });
      if (record.street_number || record.street_name) {
        record.address = [record.street_number, record.street_name].filter(Boolean).join(" ").trim();
      }
      return record;
    };

    // Build raw records with duplicate detection (by name+address+zip within this file)
    const buildAllRecords = (sourceLines, extraTransform) => {
      const seen = new Set();
      const validRecords = [];
      const skipped = [];
      sourceLines.forEach((line, idx) => {
        const record = extraTransform ? extraTransform(line, buildRecord(line)) : buildRecord(line);
        if (!record.last_name && !record.full_name) {
          skipped.push({ row: { line_number: idx + 2, raw: line.slice(0, 80) }, reason: "Missing name" });
          return;
        }
        const dupeKey = `${(record.last_name || record.full_name || "").toLowerCase()}|${(record.address || "").toLowerCase()}|${(record.zip || "")}`;
        if (seen.has(dupeKey)) {
          skipped.push({ row: { line_number: idx + 2, last_name: record.last_name, first_name: record.first_name, address: record.address, zip: record.zip }, reason: "Duplicate within file" });
          return;
        }
        seen.add(dupeKey);
        validRecords.push(record);
      });
      return { validRecords, skipped };
    };

    const runBatchImport = async (validRecords, totalForProgress) => {
      const batchSize = 100;
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      const batches = [];
      for (let i = 0; i < validRecords.length; i += batchSize) {
        batches.push(validRecords.slice(i, i + batchSize));
      }
      let completed = 0;
      let batchFailed = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        let success = false;
        // Retry up to 3 times per batch
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await base44.entities.Voter.bulkCreate(batch);
            completed += batch.length;
            success = true;
            break;
          } catch {
            await delay(500 * (attempt + 1)); // back off on retry
          }
        }
        if (!success) {
          batch.forEach(record => {
            batchFailed.push({ row: { last_name: record.last_name, first_name: record.first_name, address: record.address, zip: record.zip }, reason: "Batch error after 3 retries" });
          });
        }
        setProgress(Math.round(((i + 1) / batches.length) * 100));
        await delay(150); // pace between batches
      }
      return { completed, batchFailed };
    };

    let allSkipped = [];
    let totalImported = 0;
    let totalLines = dataLines.length;

    if (isMaFormat) {
      // Count election appearances per Voter ID
      const voteCounts = {};
      dataLines.forEach(line => {
        const voterId = line.split("|")[2]?.trim();
        if (voterId) voteCounts[voterId] = (voteCounts[voterId] || 0) + 1;
      });
      // Dedupe by Voter ID first
      const seenIds = new Set();
      const uniqueLines = dataLines.filter(line => {
        const voterId = line.split("|")[2]?.trim();
        if (!voterId || seenIds.has(voterId)) return false;
        seenIds.add(voterId);
        return true;
      });
      const { validRecords, skipped } = buildAllRecords(uniqueLines, (line, record) => {
        const voterId = line.split("|")[2]?.trim();
        if (voterId) record.vote_count = voteCounts[voterId] || 1;
        return record;
      });
      allSkipped = skipped;
      const { completed, batchFailed } = await runBatchImport(validRecords, validRecords.length);
      totalImported = completed;
      allSkipped = [...allSkipped, ...batchFailed];
    } else {
      const { validRecords, skipped } = buildAllRecords(dataLines);
      allSkipped = skipped;
      const { completed, batchFailed } = await runBatchImport(validRecords, validRecords.length);
      totalImported = completed;
      allSkipped = [...allSkipped, ...batchFailed];
    }

    setFailedRows(allSkipped);
    setImportResult({ imported: totalImported, failed: allSkipped.length, total: totalLines });
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
              <p className="text-sm text-muted-foreground mb-4">Supports CSV, TXT, ZIP, and Excel (XLSX/XLS/XLSM) files from your state voter database</p>
              <input type="file" ref={fileRef} accept=".csv,.txt,.zip,.xlsx,.xls,.xlsm" onChange={handleLocalFile} className="hidden" />
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

      {/* Clear Voters */}
      {!file && (
        <ClearVotersButton campaignId={campaign?.id} onCleared={() => queryClient.invalidateQueries({ queryKey: ["voters"] })} />
      )}

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
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Importing…</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {importResult && (
              <div className="mt-4 space-y-2">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800">
                      Import Complete — {importResult.imported.toLocaleString()} voters imported
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {importResult.total.toLocaleString()} total rows processed
                  </p>
                </div>
                {importResult.failed > 0 && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-800">
                          {importResult.failed.toLocaleString()} rows skipped
                        </p>
                      </div>
                      {failedRows.length > 0 && (
                        <Button size="sm" variant="outline" onClick={downloadFailedRows} className="text-xs h-7 gap-1">
                          <Download className="w-3 h-3" /> Download failed rows
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-amber-700 space-y-0.5">
                      {(() => {
                        const missingName = failedRows.filter(r => r.reason === "Missing name").length;
                        const dupes = failedRows.filter(r => r.reason === "Duplicate within file").length;
                        const batchErr = failedRows.filter(r => r.reason.startsWith("Batch error")).length;
                        return (
                          <>
                            {missingName > 0 && <p>• {missingName.toLocaleString()} missing required name</p>}
                            {dupes > 0 && <p>• {dupes.toLocaleString()} duplicates removed</p>}
                            {batchErr > 0 && <p>• {batchErr.toLocaleString()} failed to save (download to retry)</p>}
                          </>
                        );
                      })()}
                    </div>
                  </div>
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