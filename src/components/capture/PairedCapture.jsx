import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, CheckCircle, FileImage } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Front = 7 signature lines, Back = 17 signature lines, both physically
// identical when blank. Both sides are uploaded as separate Documents (same
// as the single-photo flow) but processed with a shared pair_id so the
// backend resolves them to ONE PetitionSheet record when the sheet has no
// readable printed number. See base44/functions/processSignatureSheet.
export default function PairedCapture({ campaignId, onClose, onSuccess }) {
  // idle -> front_selected -> uploading -> processing -> done | error
  const [step, setStep] = useState("idle");
  const [frontFile, setFrontFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const frontInputRef = useRef();
  const backInputRef = useRef();

  const handleFrontSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontFile(file);
    setFrontPreview(URL.createObjectURL(file));
    setStep("front_selected");
  };

  const uploadAndProcessOne = async (file, side, pairId, user) => {
    setProgressLabel(`Uploading ${side}...`);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Paired sides are known to be raw signature sheets — skip the AI
    // classification step the single-photo flow uses, and default the
    // category directly (mirroring the shape of a classified Document).
    const doc = await base44.entities.Document.create({
      campaign_id: campaignId,
      file_url,
      category: "raw_signature_sheet",
      ai_confidence: "high",
      ai_notes: `Paired upload — ${side} side`,
      uploaded_by_name: user?.full_name || "Field Worker",
      uploaded_by_id: user?.id,
      status: "pending_review",
    });

    setProgressLabel(`Extracting ${side} signatures...`);
    const res = await base44.functions.invoke("processSignatureSheet", {
      document_id: doc.id,
      campaign_id: campaignId,
      pair_id: pairId,
    });

    return { doc, side, data: res.data };
  };

  const handleBackSelect = async (e) => {
    const backFile = e.target.files?.[0];
    if (!backFile || !frontFile) return;

    try {
      setStep("uploading");
      const user = await base44.auth.me();
      const pairId = crypto.randomUUID().slice(0, 12);

      // Front first, then back — order matters so a readable number found on
      // either side still wins, and so the pair key is established by front.
      const frontResult = await uploadAndProcessOne(frontFile, "front", pairId, user);
      setStep("processing");
      const backResult = await uploadAndProcessOne(backFile, "back", pairId, user);

      setResult({ front: frontResult.data, back: backResult.data, pairId });
      setStep("done");
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message || "Paired upload failed");
      setStep("error");
    }
  };

  const triggerFront = (fromLibrary) => {
    if (fromLibrary) {
      frontInputRef.current.removeAttribute("capture");
      frontInputRef.current.click();
      setTimeout(() => frontInputRef.current?.setAttribute("capture", "environment"), 500);
    } else {
      frontInputRef.current?.click();
    }
  };

  const triggerBack = (fromLibrary) => {
    if (fromLibrary) {
      backInputRef.current.removeAttribute("capture");
      backInputRef.current.click();
      setTimeout(() => backInputRef.current?.setAttribute("capture", "environment"), 500);
    } else {
      backInputRef.current?.click();
    }
  };

  const reset = () => {
    setFrontFile(null);
    setFrontPreview(null);
    setResult(null);
    setErrorMsg("");
    setStep("idle");
  };

  const sameSheet = result && result.front?.sheet_id && result.front.sheet_id === result.back?.sheet_id;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-end md:items-center justify-center">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Paired Upload (Front + Back)</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={frontInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFrontSelect}
        />
        <input
          ref={backInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleBackSelect}
        />

        {step === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Capture both sides of ONE physical sheet — FRONT (7 lines) first, then BACK (17 lines).
              They'll be linked as a single petition sheet automatically.
            </p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 1 of 2 — Front</p>
            <button
              onClick={() => triggerFront(false)}
              className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base"
            >
              <Camera className="w-6 h-6" />
              Take Front Photo
            </button>
            <button
              onClick={() => triggerFront(true)}
              className="w-full flex items-center justify-center gap-3 border border-input rounded-xl py-3 text-sm text-muted-foreground hover:bg-muted"
            >
              <Upload className="w-4 h-4" />
              Choose from Library
            </button>
          </div>
        )}

        {step === "front_selected" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Front photo ready
            </div>
            {frontPreview && (
              <img src={frontPreview} alt="Front preview" className="w-full rounded-xl object-cover max-h-32" />
            )}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Step 2 of 2 — Back</p>
            <button
              onClick={() => triggerBack(false)}
              className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base"
            >
              <Camera className="w-6 h-6" />
              Take Back Photo
            </button>
            <button
              onClick={() => triggerBack(true)}
              className="w-full flex items-center justify-center gap-3 border border-input rounded-xl py-3 text-sm text-muted-foreground hover:bg-muted"
            >
              <Upload className="w-4 h-4" />
              Choose from Library
            </button>
            <button
              onClick={reset}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
            >
              Start over
            </button>
          </div>
        )}

        {(step === "uploading" || step === "processing") && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="font-medium text-sm">{progressLabel}</p>
            <div className="w-full flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileImage className="w-3.5 h-3.5" /> Front
                {step === "processing" || progressLabel.includes("back") ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : null}
              </span>
              <span className="flex items-center gap-1">
                <FileImage className="w-3.5 h-3.5" /> Back
              </span>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-semibold text-base">Both Sides Uploaded!</p>
            </div>
            <div className="rounded-xl border p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Front landed on</span>
                <span className="font-semibold">{result.front?.sheet_number || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Back landed on</span>
                <span className="font-semibold">{result.back?.sheet_number || "—"}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-muted-foreground">
                  {result.front?.signatures_extracted || 0} + {result.back?.signatures_extracted || 0} signatures
                </span>
              </div>
              {sameSheet ? (
                <p className="text-green-600 font-medium pt-1">Merged into one petition sheet.</p>
              ) : (
                <p className="text-yellow-600 font-medium pt-1">
                  Landed on two separate sheet records — the backend hasn't picked up pairing yet, or a printed
                  sheet number was read on one side. Check Ballot Engine to merge if needed.
                </p>
              )}
            </div>
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
            <button onClick={reset} className="w-full border border-input rounded-xl py-3 text-sm">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
