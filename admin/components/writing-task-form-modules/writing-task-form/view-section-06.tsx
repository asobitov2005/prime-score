"use client";
import type { WritingTaskFormScope } from "./controller";
import { Badge, Card, CardContent, CardHeader, CardTitle, ImageIcon, Loader2, RefreshCcw, Sparkles, Textarea, Trash2, Upload, buttonClassName, cn, formatImageSummaryStatus } from "../dependencies";

export function WritingTaskFormSection6({ scope }: { scope: WritingTaskFormScope }) {
  const { isTask1, previewImageUrl, fileInputRef, patchState, setLocalImagePreviewUrl, setImageSummary, setImageSummaryStatus, setDragActive, onDrop, onPaste, dragActive, uploading, handleFileUpload, uploadError, mode, state, imageSummaryStatus, regenerateSummary, regenLoading, imageSummary } = scope;
  return (
    {isTask1 ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Visual / Chart Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  After saving, the AI will automatically extract a detailed description of your chart/graph used for grading. This usually takes 10-20 seconds.
                </p>
    
                {previewImageUrl ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
                      <img
                        src={previewImageUrl}
                        alt="Task 1 visual"
                        className="max-h-[400px] w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={buttonClassName({ variant: "outline", size: "sm" })}
                      >
                        <Upload className="h-4 w-4" />
                        Replace image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          patchState({ image_url: null });
                          setLocalImagePreviewUrl((current) => {
                            if (current) URL.revokeObjectURL(current);
                            return null;
                          });
                          setImageSummary(null);
                          setImageSummaryStatus("not_required");
                        }}
                        className={cn(buttonClassName({ variant: "ghost", size: "sm" }), "text-danger hover:bg-danger/10")}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={onDrop}
                    onPaste={onPaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center outline-none transition-colors focus-visible:border-primary focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/15",
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                    )}
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {uploading ? "Uploading…" : "Drag and drop, or paste image here"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Click this area to focus, then paste. PNG, JPEG, or WEBP, up to 10 MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={buttonClassName({ variant: "outline", size: "sm" })}
                    >
                      <Upload className="h-4 w-4" />
                      Choose file
                    </button>
                  </div>
                )}
    
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />
    
                {uploadError ? (
                  <p className="text-xs text-danger">{uploadError}</p>
                ) : null}
    
                {mode === "edit" && state.image_url ? (
                  <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">AI Image Summary</span>
                        <Badge tone={
                          imageSummaryStatus === "ready" ? "success" :
                          imageSummaryStatus === "pending" ? "warning" :
                          imageSummaryStatus === "failed" ? "danger" : "neutral"
                        }>
                          {formatImageSummaryStatus(imageSummaryStatus)}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => void regenerateSummary()}
                        disabled={regenLoading}
                        className={buttonClassName({ variant: "outline", size: "sm" })}
                      >
                        {regenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Regenerate
                      </button>
                    </div>
                    <Textarea
                      readOnly
                      value={imageSummary ?? ""}
                      rows={6}
                      placeholder="The AI extraction will appear here once ready."
                      className="bg-background"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
  );
}
