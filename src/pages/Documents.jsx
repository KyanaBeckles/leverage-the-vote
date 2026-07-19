import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CheckCircle, Clock, Camera, Sparkles, Link2, ChevronDown, ChevronUp, Layers } from "lucide-react";
import CameraCapture from "@/components/capture/CameraCapture";
import PairedCapture from "@/components/capture/PairedCapture";
import DocumentProcessResult from "@/components/documents/DocumentProcessResult";

const CATEGORY_LABELS = {
  raw_signature_sheet: "Raw Signature Sheet",
  certified_signature_sheet: "Certified Signature Sheet",
  nomination_paper_receipt: "Nomination Paper Receipt",
  other: "Other",
};

const CONFIDENCE_COLORS = {
  high: "text-green-600",
  medium: "text-yellow-600",
  low: "text-red-500",
};

export default function Documents() {
  const [showCamera, setShowCamera] = useState(false);
  const [showPaired, setShowPaired] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processResults, setProcessResults] = useState({}); // doc.id -> result
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list(),
  });
  const activeCampaign = campaigns[0];

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", activeCampaign?.id],
    queryFn: () => base44.entities.Document.filter({ campaign_id: activeCampaign.id }, "-created_date", 50),
    enabled: !!activeCampaign?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleProcess = async (doc) => {
    setProcessingId(doc.id);
    const res = await base44.functions.invoke("processSignatureSheet", {
      document_id: doc.id,
      campaign_id: activeCampaign.id,
    });
    setProcessResults(prev => ({ ...prev, [doc.id]: res.data }));
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["sheets"] });
    queryClient.invalidateQueries({ queryKey: ["signatures"] });
    setProcessingId(null);
  };

  const pendingCount = documents.filter((d) => d.status === "pending_review").length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Documents</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Field uploads — AI classified &amp; digitized
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
              {pendingCount} pending review
            </span>
          )}
          <button
            onClick={() => setShowPaired(true)}
            className="flex items-center gap-2 border border-input px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted"
          >
            <Layers className="w-4 h-4" /> Paired Upload (Front + Back)
          </button>
          <button
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Camera className="w-4 h-4" /> Take Photo
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No documents uploaded yet.</p>
          <p className="text-sm mt-1">Field workers can upload photos from the mobile app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
              {/* Image */}
              <div className="relative">
                <img
                  src={doc.file_url}
                  alt="Document"
                  className="w-full h-44 object-cover bg-muted cursor-pointer"
                  onClick={() => window.open(doc.file_url, "_blank")}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {doc.status === "pending_review" && (
                    <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Review
                    </span>
                  )}
                  {doc.status === "reviewed" && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Reviewed
                    </span>
                  )}
                  {doc.status === "linked" && (
                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Linked
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-2 flex-1 flex flex-col">
                {/* Category selector */}
                <Select
                  value={doc.category}
                  onValueChange={(val) => updateMutation.mutate({ id: doc.id, data: { category: val, status: "reviewed" } })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>By: {doc.uploaded_by_name || "Unknown"}</span>
                  {doc.ai_confidence && (
                    <span className={CONFIDENCE_COLORS[doc.ai_confidence]}>
                      {doc.ai_confidence} confidence
                    </span>
                  )}
                </div>

                {doc.ai_notes && (
                  <p className="text-[11px] text-muted-foreground italic line-clamp-2">{doc.ai_notes}</p>
                )}

                {/* Admin notes */}
                <input
                  type="text"
                  placeholder="Admin notes..."
                  defaultValue={doc.admin_notes || ""}
                  className="w-full text-xs border border-input rounded-md px-2 py-1.5 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  onBlur={(e) => {
                    if (e.target.value !== (doc.admin_notes || "")) {
                      updateMutation.mutate({ id: doc.id, data: { admin_notes: e.target.value, status: "reviewed" } });
                    }
                  }}
                />

                {/* AI Process button — for raw or certified signature sheets not yet linked */}
                {(doc.category === "raw_signature_sheet" || doc.category === "certified_signature_sheet") && doc.status !== "linked" && (
                  <button
                    onClick={() => handleProcess(doc)}
                    disabled={processingId === doc.id}
                    className="mt-auto flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {processingId === doc.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        Extracting signatures...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Process with AI
                      </>
                    )}
                  </button>
                )}

                {/* Show extraction result */}
                {processResults[doc.id] && (
                  <DocumentProcessResult result={processResults[doc.id]} />
                )}

                {/* Already linked indicator */}
                {doc.status === "linked" && !processResults[doc.id] && (
                  <div className="mt-auto flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                    <Link2 className="w-3.5 h-3.5" />
                    Linked to petition sheet
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCamera && activeCampaign && (
        <CameraCapture
          campaignId={activeCampaign.id}
          onClose={() => setShowCamera(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            setShowCamera(false);
          }}
        />
      )}

      {showPaired && activeCampaign && (
        <PairedCapture
          campaignId={activeCampaign.id}
          onClose={() => setShowPaired(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["sheets"] });
            queryClient.invalidateQueries({ queryKey: ["signatures"] });
          }}
        />
      )}
    </div>
  );
}