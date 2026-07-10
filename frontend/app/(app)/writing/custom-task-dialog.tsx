"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import {
  ArrowRight,
  ClipboardPaste,
  ImageIcon,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trackWritingStart } from "@/lib/analytics";
import { emitNavigationStart } from "@/lib/navigation-transition";
import type { WritingTaskType } from "@/lib/server-writing";
import { cn } from "@/lib/utils";

import {
  createCustomTaskDraftKey,
  getCustomTaskConfig,
  getCustomTaskWorkspaceHref,
} from "./custom-task-config";
import {
  getImageFromFileList,
  MAX_CUSTOM_TASK_IMAGE_BYTES,
  readFileAsDataUrl,
} from "./custom-task-dialog-utils";

interface CustomTaskDialogProps {
  taskType: WritingTaskType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomTaskDialog({
  taskType,
  open,
  onOpenChange,
}: CustomTaskDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const config = getCustomTaskConfig(taskType);
  const [prompt, setPrompt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrompt("");
    setImageDataUrl(null);
    setImageName(null);
    setIsDragging(false);
    setIsReadingClipboard(false);
    setIsStarting(false);
    setError(null);
  }, [taskType, open]);

  const canContinue = useMemo(
    () =>
      prompt.trim().length > 0 &&
      (!config.requiresImage || Boolean(imageDataUrl)),
    [config.requiresImage, imageDataUrl, prompt],
  );

  const setImageFile = useCallback(async (file: File | null) => {
    setError(null);
    if (!file) {
      setImageDataUrl(null);
      setImageName(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please add an image file.");
      return;
    }
    if (file.size > MAX_CUSTOM_TASK_IMAGE_BYTES) {
      setError("Image must be under 10 MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setImageName(file.name || "Pasted image");
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      void setImageFile(getImageFromFileList(event.dataTransfer.files));
    },
    [setImageFile],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const image = getImageFromFileList(event.clipboardData.files);
      if (!image) return;
      event.preventDefault();
      void setImageFile(image);
    },
    [setImageFile],
  );

  const pasteFromClipboard = useCallback(async () => {
    setIsReadingClipboard(true);
    setError(null);
    try {
      if (!navigator.clipboard?.read) {
        setError(
          "Clipboard image paste is not supported in this browser. Use Ctrl+V or upload from your computer.",
        );
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        await setImageFile(
          new File([blob], "clipboard-image.png", {
            type: blob.type || imageType,
          }),
        );
        return;
      }
      setError("No image found in clipboard.");
    } catch {
      setError(
        "Clipboard access was blocked. Press Ctrl+V inside the upload box instead.",
      );
    } finally {
      setIsReadingClipboard(false);
    }
  }, [setImageFile]);

  const startWorkspace = useCallback(async () => {
    if (!canContinue || isStarting) return;
    setIsStarting(true);
    const draftKey = createCustomTaskDraftKey(taskType);
    const payload = {
      topic: prompt.trim(),
      essay: "",
      imageDataUrl: config.requiresImage ? imageDataUrl : null,
      started: true,
      timeSpentSeconds: 0,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {}
    const href = getCustomTaskWorkspaceHref(taskType, draftKey);
    trackWritingStart({
      taskType,
      source: "custom_prompt",
      hasImage: Boolean(config.requiresImage && imageDataUrl),
    });
    emitNavigationStart(href);
    router.push(href);
  }, [
    canContinue,
    config.requiresImage,
    imageDataUrl,
    isStarting,
    prompt,
    router,
    taskType,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={config.title}
      description={config.description}
      className="max-w-4xl rounded-3xl"
    >
      <div
        className={cn(
          "grid gap-5",
          config.requiresImage && "lg:grid-cols-[minmax(0,1fr)_340px]",
        )}
      >
        <div className="space-y-4">
          <FeatureGrid taskType={taskType} />
          <div className="space-y-2">
            <label
              htmlFor={`custom-${taskType}-prompt`}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {config.promptLabel}
            </label>
            <Textarea
              id={`custom-${taskType}-prompt`}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={config.promptPlaceholder}
              className="min-h-[170px] rounded-2xl border-border/70 bg-background/70 px-4 py-4 text-sm leading-7"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {config.readyTitle}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {config.readyDescription}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void startWorkspace()}
              disabled={!canContinue || isStarting}
              className="h-10 rounded-xl px-4"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {config.ctaLabel}
            </Button>
          </div>
        </div>

        {config.requiresImage ? (
          <ImageDropZone
            config={config}
            inputRef={inputRef}
            dropZoneRef={dropZoneRef}
            imageDataUrl={imageDataUrl}
            imageName={imageName}
            isDragging={isDragging}
            isReadingClipboard={isReadingClipboard}
            error={error}
            setIsDragging={setIsDragging}
            setImageFile={setImageFile}
            handleDrop={handleDrop}
            handlePaste={handlePaste}
            pasteFromClipboard={pasteFromClipboard}
          />
        ) : null}
      </div>
    </Dialog>
  );
}

function FeatureGrid({ taskType }: { taskType: WritingTaskType }) {
  const items = [
    "Paste your real IELTS question",
    taskType === "task_1"
      ? "Upload chart, map, process, or table"
      : "Write Task 2 in timed exam mode",
    "Get band score and sentence fixes",
    "See actions for your desired score",
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

interface ImageDropZoneProps {
  config: ReturnType<typeof getCustomTaskConfig>;
  inputRef: React.RefObject<HTMLInputElement>;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  imageDataUrl: string | null;
  imageName: string | null;
  isDragging: boolean;
  isReadingClipboard: boolean;
  error: string | null;
  setIsDragging: (value: boolean) => void;
  setImageFile: (file: File | null) => Promise<void>;
  handleDrop: (event: DragEvent<HTMLDivElement>) => void;
  handlePaste: (event: ClipboardEvent<HTMLDivElement>) => void;
  pasteFromClipboard: () => Promise<void>;
}

function ImageDropZone(props: ImageDropZoneProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {props.config.imageLabel}
      </p>
      <div
        ref={props.dropZoneRef}
        role="button"
        tabIndex={0}
        onClick={() => props.dropZoneRef.current?.focus()}
        onPaste={props.handlePaste}
        onDragEnter={(event) => {
          event.preventDefault();
          props.setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => props.setIsDragging(false)}
        onDrop={props.handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.dropZoneRef.current?.focus();
          }
        }}
        className={cn(
          "min-h-[300px] rounded-3xl border border-dashed border-border/70 bg-background/60 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          props.isDragging && "border-violet-500/60 bg-violet-500/10",
          props.imageDataUrl && "border-solid bg-background",
        )}
      >
        {props.imageDataUrl ? (
          <AttachedImage {...props} />
        ) : (
          <EmptyImageDropZone {...props} />
        )}
        <Input
          ref={props.inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) =>
            void props.setImageFile(event.target.files?.[0] ?? null)
          }
        />
      </div>
      {props.error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {props.error}
        </div>
      ) : null}
    </div>
  );
}

function AttachedImage(props: ImageDropZoneProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={props.imageDataUrl ?? ""}
          alt={props.imageName ?? "Task 1 visual"}
          className="max-h-[240px] w-full rounded-xl object-contain"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {props.imageName ?? "Task 1 visual"}
          </p>
          <p className="text-xs text-muted-foreground">Image attached</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-lg"
          onClick={(event) => {
            event.stopPropagation();
            void props.setImageFile(null);
          }}
        >
          <X className="h-4 w-4" />
          Remove
        </Button>
      </div>
    </div>
  );
}

function EmptyImageDropZone(props: ImageDropZoneProps) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <ImageIcon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">
          {props.config.imageTitle}
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {props.config.imageHint}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={(event) => {
            event.stopPropagation();
            props.inputRef.current?.click();
          }}
        >
          <UploadCloud className="h-4 w-4" />
          Upload
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={(event) => {
            event.stopPropagation();
            void props.pasteFromClipboard();
          }}
        >
          {props.isReadingClipboard ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ClipboardPaste className="h-4 w-4" />
          )}
          Paste
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPG, or WebP under 10 MB
      </p>
    </div>
  );
}
