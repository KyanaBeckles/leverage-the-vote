import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

export default function DocumentProcessResult({ result }) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  return (
    <div className="mt-1 border border-green-200 bg-green-50 rounded-lg p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-green-700 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {result.signatures_extracted} signatures extracted
          {result.side && <span className="text-green-600 font-normal">({result.side})</span>}
        </div>
        {result.signers?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-green-600 hover:text-green-800 flex items-center gap-0.5"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide" : "View"}
          </button>
        )}
      </div>

      {result.sheet_number && (
        <p className="text-green-600 mt-0.5">Sheet: {result.sheet_number}</p>
      )}

      {expanded && result.signers?.length > 0 && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {result.signers.map((s, i) => (
            <div key={i} className="bg-white rounded px-2 py-1 border border-green-100">
              <span className="font-medium text-foreground">{s.line_number}. {s.name}</span>
              {s.address && <span className="text-muted-foreground ml-1">— {s.address}{s.city ? `, ${s.city}` : ""}</span>}
              {s.date_signed && <span className="text-muted-foreground ml-1">({s.date_signed})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}