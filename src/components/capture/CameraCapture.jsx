import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CATEGORY_LABELS = {
  raw_signature_sheet: "Raw Signature Sheet",
  certified_signature_sheet: "Certified Signature Sheet",
  nomination_paper_receipt: "Nomination Paper Receipt",
  other: "Other Document",
};

const CATEGORY_COLORS = {
  raw_signature_sheet: "bg-blue-100 text-blue-800",
  certified_signature_sheet: "bg-green-100 text-green-800",
  nomination_paper_receipt: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-700",
};

export default function CameraCapture({ campaignId, onClose, onSuccess }) {
  const [step, setStep] = useState("idle"); // idle | uploading | classifying | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStep("uploading");

      // 1. Upload the image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setStep("classifying");

      // 2. AI classification
      const classification = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a document classifier for a political campaign. Look at this image and classify it as one of the following document types:
- raw_signature_sheet: A petition sheet with handwritten signatures from voters, not yet officially certified. Usually has many lines with names/addresses written by hand.
- certified_signature_sheet: A petition sheet that has been officially stamped, sealed, or marked by a town/city clerk as certified.
- nomination_paper_receipt: A receipt or acknowledgment from a clerk's office confirming that nomination papers were filed or received. Usually has official stamps, dates, and receipt numbers.
- other: Anything else.

Respond with your classification, confidence level, and brief reasoning.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["raw_signature_sheet", "certified_signature_sheet", "nomination_paper_receipt", "other"] },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            notes: { type: "string" }
          },
          required: ["category", "confidence", "notes"]
        }
      });

      // 3. Get current user
      const user = await base44.auth.me();

      // 4. Save to Document entity
      const doc = await base44.entities.Document.create({
        campaign_id: campaignId,
        file_url,
        category: classification.category,
        ai_confidence: classification.confidence,
        ai_notes: classification.notes,
        uploaded_by_name: user?.full_name || "Field Worker",
        uploaded_by_id: user?.id,
        status: "pending_review",
      });

      setResult({ ...doc, file_url, category: classification.category, ai_confidence: classification.confidence });
      setStep("done");
      if (onSuccess) onSuccess(doc);
    } catch (err) {
      setErrorMsg(err.message || "Upload failed");
      setStep("error");
    }
  };

  const triggerCamera = () => fileInputRef.current?.click();

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-end md:items-center justify-center">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Upload Document</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden file input — capture="environment" opens rear camera on mobile */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {step === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Take a photo of any campaign document — signature sheets, certified sheets, or nomination paper receipts. The AI will categorize it automatically.
            </p>
            <button
              onClick={triggerCamera}
              className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base"
            >
              <Camera className="w-6 h-6" />
              Take Photo
            </button>
            <button
              onClick={() => {
                // Remove capture attribute for file picker
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
                // Restore after
                setTimeout(() => fileInputRef.current?.setAttribute("capture", "environment"), 500);
              }}
              className="w-full flex items-center justify-center gap-3 border border-input rounded-xl py-3 text-sm text-muted-foreground hover:bg-muted"
            >
              <Upload className="w-4 h-4" />
              Choose from Library
            </button>
          </div>
        )}

        {(step === "uploading" || step === "classifying") && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="font-medium text-sm">
              {step === "uploading" ? "Uploading image..." : "AI is classifying document..."}
            </p>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-semibold text-base">Document Saved!</p>
            </div>
            <img src={result.file_url} alt="Uploaded" className="w-full rounded-xl object-cover max-h-40" />
            <div className="rounded-xl border p-3 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">AI Classification</p>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[result.category]}`}>
                {CATEGORY_LABELS[result.category]}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Confidence: {result.ai_confidence}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">Saved for admin review in Documents.</p>
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold"
            >
              Done
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4 text-center py-4">
            <p className="text-destructive font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button onClick={() => setStep("idle")} className="w-full border border-input rounded-xl py-3 text-sm">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}