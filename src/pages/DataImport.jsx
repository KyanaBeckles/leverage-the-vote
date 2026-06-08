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
import ClearVotersButton from "@/components/import/ClearVotersButton";

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

// MA Voter Activity History File - exact pipe-delimited column order (0-indexed)
const MA_VOTER_ACTIVITY_COLUMNS = [
  { index: 0,  field: "skip",             label: "Election Date" },
  { index: 1,  field: "skip",             label: "Election Type Description" },
  { index: 2,  field: "skip",             label: "Voter ID" },
  { index: 3,  field: "last_name",        label: "Last Name" },
  { index: 4,  field: "first_name",       label: "First Name" },
  { index: 5,  field: "skip",             label: "Middle Name" },
  { index: 6,  field: "skip",             label: "Title" },
  { index: 7,  field: "skip",             label: "Residential Street Number" },
  { index: 8,  field: "skip",             label: "Residential Street Number Suffix" },
  { index: 9,  field: "address",          label: "Residential Street Name" },
  { index: 10, field: "skip",             label: "Residential Apartment Number" },
  { index: 11, field: "zip",              label: "Residential Zip Code" },
  { index: 12, field: "skip",             label: "City/Town Name (raw)" },
  { index: 13, field: "party_affiliation",label: "Party Affiliation" },
  { index: 14, field: "skip",             label: "Party Voted" },
  { index: 15, field: "city",             label: "City/Town Code" },
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

// MA City/Town ID → City/Town Name lookup (from DistrictList_2022.xlsx CityTown sheet)
const MA_CITY_TOWN = {
  1:"Abington",2:"Acton",3:"Acushnet",4:"Adams",5:"Agawam",6:"Alford",7:"Amesbury",8:"Amherst",9:"Andover",10:"Aquinnah",
  11:"Arlington",12:"Ashburnham",13:"Ashby",14:"Ashfield",15:"Ashland",16:"Assonet",17:"Athol",18:"Attleboro",19:"Auburn",20:"Avon",
  21:"Ayer",22:"Barnstable",23:"Barre",24:"Becket",25:"Bedford",26:"Belchertown",27:"Bellingham",28:"Belmont",29:"Berkley",30:"Berlin",
  31:"Bernardston",32:"Beverly",33:"Billerica",34:"Blackstone",35:"Blandford",36:"Bolton",37:"Boston",38:"Bourne",39:"Boxborough",40:"Boxford",
  41:"Boylston",42:"Braintree",43:"Brewster",44:"Bridgewater",45:"Brimfield",46:"Brockton",47:"Brookfield",48:"Brookline",49:"Buckland",50:"Burlington",
  51:"Cambridge",52:"Canton",53:"Carlisle",54:"Carver",55:"Charlemont",56:"Charlton",57:"Chatham",58:"Chelmsford",59:"Chelsea",60:"Cheshire",
  61:"Chester",62:"Chesterfield",63:"Chicopee",64:"Chilmark",65:"Clarksburg",66:"Clinton",67:"Cohasset",68:"Colrain",69:"Concord",70:"Conway",
  71:"Cummington",72:"Dalton",73:"Danvers",74:"Dartmouth",75:"Dedham",76:"Deerfield",77:"Dennis",78:"Dighton",79:"Douglas",80:"Dover",
  81:"Dracut",82:"Dudley",83:"Dunstable",84:"Duxbury",85:"East Bridgewater",86:"East Brookfield",87:"East Longmeadow",88:"Eastham",89:"Easthampton",90:"Easton",
  91:"Edgartown",92:"Egremont",93:"Erving",94:"Essex",95:"Everett",96:"Fairhaven",97:"Fall River",98:"Falmouth",99:"Fitchburg",100:"Florida",
  101:"Foxborough",102:"Framingham",103:"Franklin",104:"Freetown",105:"Gardner",106:"Georgetown",107:"Gill",108:"Gloucester",109:"Goshen",110:"Gosnold",
  111:"Grafton",112:"Granby",113:"Granville",114:"Great Barrington",115:"Greenfield",116:"Groton",117:"Groveland",118:"Hadley",119:"Halifax",120:"Hamilton",
  121:"Hampden",122:"Hancock",123:"Hanover",124:"Hanson",125:"Hardwick",126:"Harvard",127:"Harwich",128:"Hatfield",129:"Haverhill",130:"Hawley",
  131:"Heath",132:"Hingham",133:"Hinsdale",134:"Holbrook",135:"Holden",136:"Holland",137:"Holliston",138:"Holyoke",139:"Hopedale",140:"Hopkinton",
  141:"Hubbardston",142:"Hudson",143:"Hull",144:"Huntington",145:"Ipswich",146:"Kingston",147:"Lakeville",148:"Lancaster",149:"Lanesborough",150:"Lawrence",
  151:"Lee",152:"Leicester",153:"Lenox",154:"Leominster",155:"Leverett",156:"Lexington",157:"Leyden",158:"Lincoln",159:"Littleton",160:"Longmeadow",
  161:"Lowell",162:"Ludlow",163:"Lunenburg",164:"Lynn",165:"Lynnfield",166:"Malden",167:"Manchester",168:"Mansfield",169:"Marblehead",170:"Marion",
  171:"Marlborough",172:"Marshfield",173:"Mashpee",174:"Mattapoisett",175:"Maynard",176:"Medfield",177:"Medford",178:"Medway",179:"Melrose",180:"Mendon",
  181:"Merrimac",182:"Methuen",183:"Middleborough",184:"Middlefield",185:"Middleton",186:"Milford",187:"Millbury",188:"Millis",189:"Millville",190:"Milton",
  191:"Monroe",192:"Monson",193:"Montague",194:"Monterey",195:"Montgomery",196:"Mount Washington",197:"Nahant",198:"Nantucket",199:"Natick",200:"Needham",
  201:"New Ashford",202:"New Bedford",203:"New Braintree",204:"New Marlborough",205:"New Salem",206:"Newbury",207:"Newburyport",208:"Newton",209:"Norfolk",210:"North Adams",
  211:"North Andover",212:"North Attleborough",213:"North Brookfield",214:"North Reading",215:"Northampton",216:"Northborough",217:"Northbridge",218:"Northfield",219:"Norton",220:"Norwell",
  221:"Norwood",222:"Oak Bluffs",223:"Oakham",224:"Orange",225:"Orleans",226:"Otis",227:"Oxford",228:"Palmer",229:"Paxton",230:"Peabody",
  231:"Pelham",232:"Pembroke",233:"Pepperell",234:"Peru",235:"Petersham",236:"Phillipston",237:"Pittsfield",238:"Plainfield",239:"Plainville",240:"Plymouth",
  241:"Plympton",242:"Princeton",243:"Provincetown",244:"Quincy",245:"Randolph",246:"Raynham",247:"Reading",248:"Rehoboth",249:"Revere",250:"Richmond",
  251:"Rochester",252:"Rockland",253:"Rockport",254:"Rowe",255:"Rowley",256:"Royalston",257:"Russell",258:"Rutland",259:"Salem",260:"Salisbury",
  261:"Sandisfield",262:"Sandwich",263:"Saugus",264:"Savoy",265:"Scituate",266:"Seekonk",267:"Sharon",268:"Sheffield",269:"Shelburne",270:"Sherborn",
  271:"Shirley",272:"Shrewsbury",273:"Shutesbury",274:"Somerset",275:"Somerville",276:"South Hadley",277:"Southampton",278:"Southborough",279:"Southbridge",280:"Southwick",
  281:"Spencer",282:"Springfield",283:"Sterling",284:"Stockbridge",285:"Stoneham",286:"Stoughton",287:"Stow",288:"Sturbridge",289:"Sudbury",290:"Sunderland",
  291:"Sutton",292:"Swampscott",293:"Swansea",294:"Taunton",295:"Templeton",296:"Tewksbury",297:"Tisbury",298:"Tolland",299:"Topsfield",300:"Townsend",
  301:"Truro",302:"Tyngsborough",303:"Tyringham",304:"Upton",305:"Uxbridge",306:"Wakefield",307:"Wales",308:"Walpole",309:"Waltham",310:"Ware",
  311:"Wareham",312:"Warren",313:"Warwick",314:"Washington",315:"Watertown",316:"Wayland",317:"Webster",318:"Wellesley",319:"Wellfleet",320:"Wendell",
  321:"Wenham",322:"West Boylston",323:"West Bridgewater",324:"West Brookfield",325:"West Newbury",326:"West Springfield",327:"West Stockbridge",328:"West Tisbury",329:"Westborough",330:"Westfield",
  331:"Westford",332:"Westhampton",333:"Westminster",334:"Weston",335:"Westport",336:"Westwood",337:"Weymouth",338:"Whately",339:"Whitman",340:"Wilbraham",
  341:"Williamsburg",342:"Williamstown",343:"Wilmington",344:"Winchendon",345:"Winchester",346:"Windsor",347:"Winthrop",348:"Woburn",349:"Worcester",350:"Worthington",
  351:"Wrentham",352:"Yarmouth"
};

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
    setImportResult(null); setZipFiles([]); setDriveLink("");
  };

  const handleImport = async () => {
    if (!campaign || !file?.text) return;
    setImporting(true);
    setProgress(0);

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
        if (field === "city" && isMaFormat) {
          val = MA_CITY_TOWN[parseInt(val)] || val;
        }
        if (isMaFormat && field === "address") {
          const streetNum = values[7] || "";
          const streetName = values[9] || "";
          val = [streetNum, streetName].filter(Boolean).join(" ").trim();
        }
        record[field] = val;
      });
      return record;
    };

    // For MA Voter Activity files: count appearances per Voter ID, then deduplicate
    let uniqueLines = dataLines;
    if (isMaFormat) {
      // First pass: count how many elections each voter participated in
      const voteCounts = {};
      dataLines.forEach(line => {
        const voterId = line.split("|")[2]?.trim();
        if (voterId) voteCounts[voterId] = (voteCounts[voterId] || 0) + 1;
      });

      // Second pass: keep only the first occurrence, attach the count
      const seen = new Set();
      uniqueLines = dataLines.filter(line => {
        const voterId = line.split("|")[2]?.trim();
        if (!voterId || seen.has(voterId)) return false;
        seen.add(voterId);
        return true;
      });

      // Attach vote_count to each record after building
      const allRecordsRaw = uniqueLines
        .map(line => {
          const record = buildRecord(line);
          const voterId = line.split("|")[2]?.trim();
          if (voterId) record.vote_count = voteCounts[voterId] || 1;
          return record;
        })
        .filter(r => r.last_name || r.full_name);

      const batchSize = 500;
      const batches = [];
      for (let i = 0; i < allRecordsRaw.length; i += batchSize) {
        batches.push(allRecordsRaw.slice(i, i + batchSize));
      }
      let completed = 0;
      const concurrency = 5;
      for (let i = 0; i < batches.length; i += concurrency) {
        const chunk = batches.slice(i, i + concurrency);
        await Promise.all(chunk.map(batch => base44.entities.Voter.bulkCreate(batch)));
        completed += chunk.reduce((s, b) => s + b.length, 0);
        setProgress(Math.round((completed / allRecordsRaw.length) * 100));
      }
      setImportResult({ imported: completed, failed: uniqueLines.length - allRecordsRaw.length, total: uniqueLines.length });
      setImporting(false);
      queryClient.invalidateQueries({ queryKey: ["voters"] });
      return;
    }

    const allRecords = uniqueLines
      .map(buildRecord)
      .filter(r => r.last_name || r.full_name);

    const batchSize = 500;
    const batches = [];
    for (let i = 0; i < allRecords.length; i += batchSize) {
      batches.push(allRecords.slice(i, i + batchSize));
    }
    let completed = 0;
    const concurrency = 5;
    for (let i = 0; i < batches.length; i += concurrency) {
      const chunk = batches.slice(i, i + concurrency);
      await Promise.all(chunk.map(batch => base44.entities.Voter.bulkCreate(batch)));
      completed += chunk.reduce((s, b) => s + b.length, 0);
      setProgress(Math.round((completed / allRecords.length) * 100));
    }

    setImportResult({ imported: completed, failed: uniqueLines.length - allRecords.length, total: uniqueLines.length });
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
              <p className="text-sm text-muted-foreground mb-4">Supports CSV, TXT, and ZIP files from your state voter database</p>
              <input type="file" ref={fileRef} accept=".csv,.txt,.zip" onChange={handleLocalFile} className="hidden" />
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