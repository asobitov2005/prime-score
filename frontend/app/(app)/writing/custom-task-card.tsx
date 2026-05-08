"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { ArrowRight, ClipboardPaste, ImageIcon, Loader2, Plus, UploadCloud, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveWritingDraftClient } from "@/lib/client-writing";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { cn } from "@/lib/utils";
import type { WritingTaskType } from "@/lib/server-writing";

const CUSTOM_TASK_1_DRAFT_KEY = "writing-exam-draft:custom:task_1";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function getImageFromFileList(files: FileList | File[]): File | null {
  return Array.from(files).find((file) => file.type.startsWith("image/")) ?? null;
}

export function CustomTaskCard({ activeTaskType }: { activeTaskType: WritingTaskType }) {
  const [open, setOpen] = useState(false);

  const card = (
    <Card className="relative overflow-hidden rounded-2xl border-[#9db7c6]/55 bg-[#eaf2f7] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#7fa2b6]/70 hover:bg-[#e2edf4] hover:shadow-md dark:border-[#4f7187]/45 dark:bg-[#1f3443]/55 dark:hover:border-[#6f93a8]/60">
      <CardContent className="relative z-10 flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-sm dark:border-primary/25 dark:bg-primary/15 dark:text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Add Custom Task</p>
              <p className="text-sm font-medium tracking-tight text-muted-foreground">Add a question you've found elsewhere</p>
            </div>
          </div>
          <Badge tone="outline" className="border-[#9db7c6]/70 bg-white/65 text-[10px] uppercase tracking-[0.18em] text-[#466b80] dark:border-[#6f93a8]/45 dark:bg-[#6f93a8]/15 dark:text-[#c4d7e2]">
            Custom
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  if (activeTaskType !== "task_1") {
    return (
      <Link href={`/writing/tasks?task_type=${activeTaskType}`} className="group block">
        {card}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group block w-full text-left">
        {card}
      </button>
      <CustomTask1Dialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function CustomTask1Dialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => prompt.trim().length > 0 && Boolean(imageDataUrl), [imageDataUrl, prompt]);

  const setImageFile = useCallback(async (file: File | null) => {
    setError(null);
    if (!file) {
      setImageDataUrl(null);
      setImageName(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please add an image file for Task 1.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be under 10 MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setImageName(file.name || "Pasted image");
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const image = getImageFromFileList(event.dataTransfer.files);
    void setImageFile(image);
  }, [setImageFile]);

  const handlePaste = useCallback((event: ClipboardEvent<HTMLDivElement>) => {
    const image = getImageFromFileList(event.clipboardData.files);
    if (!image) return;
    event.preventDefault();
    void setImageFile(image);
  }, [setImageFile]);

  const pasteFromClipboard = useCallback(async () => {
    setIsReadingClipboard(true);
    setError(null);
    try {
      if (!navigator.clipboard?.read) {
        setError("Clipboard image paste is not supported in this browser. Use Ctrl+V or upload from your computer.");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const file = new File([blob], "clipboard-image.png", { type: blob.type || imageType });
        await setImageFile(file);
        return;
      }
      setError("No image found in clipboard.");
    } catch {
      setError("Clipboard access was blocked. Press Ctrl+V inside the upload box instead.");
    } finally {
      setIsReadingClipboard(false);
    }
  }, [setImageFile]);

  const startWorkspace = useCallback(async () => {
    if (!canContinue || !imageDataUrl || isStarting) return;
    setIsStarting(true);

    const payload = {
      topic: prompt.trim(),
      essay: "",
      imageDataUrl,
      started: false,
      timeSpentSeconds: 0,
    };

    try {
      window.localStorage.setItem(CUSTOM_TASK_1_DRAFT_KEY, JSON.stringify(payload));
    } catch {}

    await saveWritingDraftClient(CUSTOM_TASK_1_DRAFT_KEY, {
      task_id: null,
      task_type: "task_1",
      topic: prompt.trim(),
      essay_text: "",
      image_data_url: imageDataUrl,
      started: false,
      time_spent_seconds: 0,
    }).catch(() => null);

    const href = "/exam-preview/writing?task_type=task_1&mode=practice";
    emitNavigationStart(href);
    router.push(href);
  }, [canContinue, imageDataUrl, isStarting, prompt, router]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add custom Task 1"
      description="Upload or paste the chart image, then enter the exact essay prompt before opening the workspace."
      className="max-w-4xl rounded-3xl"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" onPaste={handlePaste}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="custom-task-1-prompt" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Essay prompt
            </label>
            <Textarea
              id="custom-task-1-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Paste the exact Task 1 question here, for example: The chart below shows..."
              className="min-h-[170px] rounded-2xl border-border/70 bg-background/70 px-4 py-4 text-sm leading-7"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Ready for Task 1 setup</p>
              <p className="text-xs leading-5 text-muted-foreground">The prompt and visual will be saved as a draft before the timer starts.</p>
            </div>
            <Button type="button" onClick={() => void startWorkspace()} disabled={!canContinue || isStarting} className="h-10 rounded-xl px-4">
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Open workspace
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Chart image</p>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "min-h-[300px] cursor-pointer rounded-3xl border border-dashed border-border/70 bg-background/60 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isDragging && "border-violet-500/60 bg-violet-500/10",
              imageDataUrl && "border-solid bg-background",
            )}
          >
            {imageDataUrl ? (
              <div className="flex h-full flex-col gap-3">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageDataUrl} alt={imageName ?? "Task 1 visual"} className="max-h-[240px] w-full rounded-xl object-contain" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{imageName ?? "Task 1 visual"}</p>
                    <p className="text-xs text-muted-foreground">Image attached</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg"
                    onClick={(event) => {
                      event.stopPropagation();
                      void setImageFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Drop chart image here</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Upload from your computer, paste with Ctrl+V, or use clipboard.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={(event) => {
                    event.stopPropagation();
                    inputRef.current?.click();
                  }}>
                    <UploadCloud className="h-4 w-4" />
                    Upload
                  </Button>
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={(event) => {
                    event.stopPropagation();
                    void pasteFromClipboard();
                  }}>
                    {isReadingClipboard ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />}
                    Paste
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, or WebP under 10 MB</p>
              </div>
            )}
            <Input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void setImageFile(event.target.files?.[0] ?? null)}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
