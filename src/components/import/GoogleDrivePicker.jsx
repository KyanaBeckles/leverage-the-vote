import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Folder, FileText, ChevronRight, ChevronLeft, Loader2, HardDrive } from "lucide-react";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export default function GoogleDrivePicker({ onFileSelected, onClose, initialFolderId }) {
  const [stack, setStack] = useState(
    initialFolderId
      ? [{ id: null, name: "My Drive" }, { id: initialFolderId, name: "Shared Folder" }]
      : [{ id: null, name: "My Drive" }]
  );
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentFolder = stack[stack.length - 1];

  useEffect(() => {
    loadFolder(currentFolder.id);
  }, [currentFolder.id]);

  const loadFolder = async (folderId) => {
    setLoading(true);
    const res = await base44.functions.invoke("googleDriveFiles", { action: "list", folderId });
    setFiles(res.data.files || []);
    setLoading(false);
  };

  const handleClick = (file) => {
    if (file.mimeType === FOLDER_MIME) {
      setStack([...stack, { id: file.id, name: file.name }]);
    } else {
      onFileSelected(file);
    }
  };

  const handleBack = () => {
    if (stack.length > 1) setStack(stack.slice(0, -1));
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const supportedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/x-zip-compressed",
    FOLDER_MIME,
  ];

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <HardDrive className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-1 text-sm flex-1 overflow-hidden">
          {stack.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
              <span className={`truncate ${i === stack.length - 1 ? "font-medium" : "text-muted-foreground"}`}>
                {s.name}
              </span>
            </React.Fragment>
          ))}
        </div>
        {stack.length > 1 && (
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-7 px-2">
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-muted-foreground">
          Cancel
        </Button>
      </div>

      {/* File list */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">This folder is empty</p>
        ) : (
          files.map((file) => {
            const isFolder = file.mimeType === FOLDER_MIME;
            const isSupported = supportedTypes.includes(file.mimeType);
            return (
              <button
                key={file.id}
                disabled={!isSupported}
                onClick={() => handleClick(file)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${!isSupported ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {isFolder
                  ? <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  : <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                }
                <span className="text-sm flex-1 truncate">{file.name}</span>
                {!isFolder && <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>}
                {isFolder && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 bg-muted/20 border-t">
        <p className="text-[11px] text-muted-foreground">Supported: CSV, Excel, ZIP</p>
      </div>
    </div>
  );
}