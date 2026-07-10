"use client";

import type {
  ClipboardEvent,
  DragEvent,
  RefObject,
} from "react";
import {
  ClipboardPaste,
  ImageIcon,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { getCustomTaskConfig } from "./custom-task-config";

export interface CustomTaskImageDropZoneProps {
  config: ReturnType<typeof getCustomTaskConfig>;
  inputRef: RefObject<HTMLInputElement>;
  dropZoneRef: RefObject<HTMLDivElement>;
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

export function CustomTaskImageDropZone(
  props: CustomTaskImageDropZoneProps,
) {
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

function AttachedImage(props: CustomTaskImageDropZoneProps) {
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

function EmptyImageDropZone(props: CustomTaskImageDropZoneProps) {
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
