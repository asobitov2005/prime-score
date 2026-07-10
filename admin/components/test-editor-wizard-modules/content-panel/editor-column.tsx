"use client";
import type { ContentPanelScope } from "./controller";
import { Badge, Button, cn } from "../dependencies";
import { FULL_TEST_AUDIO_UPLOAD_ID } from "../shared";
import { ContentSectionsList } from "./section-list";

export function ContentPanelEditorColumn({ scope }: { scope: ContentPanelScope }) {
  const { draft, uploadingSectionId, isUsingFullTestAudio, handleFullTestAudioUpload, clearFullTestAudio, addSection, sharedListeningAudio, contentErrorMessage } = scope;
  return (
    <div className="space-y-6">
    <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Test Content</h3>
                <p className="text-sm text-muted-foreground">Compose your reading passages or listening parts.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {draft.metadata.type === "listening" && draft.metadata.format === "full" ? (
                  <>
                    <label
                      className={cn(
                        "inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground",
                        uploadingSectionId === FULL_TEST_AUDIO_UPLOAD_ID
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:bg-muted/40"
                      )}
                    >
                      {uploadingSectionId === FULL_TEST_AUDIO_UPLOAD_ID
                        ? "Uploading..."
                        : isUsingFullTestAudio
                          ? "Replace Full Audio"
                          : "Upload Full Audio"}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        disabled={uploadingSectionId === FULL_TEST_AUDIO_UPLOAD_ID}
                        onChange={(event) => void handleFullTestAudioUpload(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    {isUsingFullTestAudio ? (
                      <Button type="button" variant="outline" onClick={clearFullTestAudio}>
                        Clear Full Audio
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {draft.metadata.format === "full" || draft.content.sections.length === 0 ? (
                  <Button type="button" variant="solid" onClick={addSection}>
                    + Add Section
                  </Button>
                ) : null}
              </div>
            </div>
    {draft.metadata.type === "listening" && draft.metadata.format === "full" ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Full Test Audio</p>
                    <p className="text-xs text-muted-foreground">
                      Upload one shared file for the whole listening test. When enabled, section-level audio upload is hidden.
                    </p>
                  </div>
                  {sharedListeningAudio?.audioDurationSeconds ? (
                    <Badge tone="neutral">Duration: {sharedListeningAudio.audioDurationSeconds}s</Badge>
                  ) : null}
                </div>
                {sharedListeningAudio?.audioUrl ? (
                  <audio className="mt-4 w-full" controls src={sharedListeningAudio.audioUrl} />
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No shared audio uploaded yet.
                  </p>
                )}
              </div>
            ) : null}
    {contentErrorMessage ? (
              <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
                {contentErrorMessage}
              </div>
            ) : null}
      <ContentSectionsList scope={scope} />
    </div>
  );
}
