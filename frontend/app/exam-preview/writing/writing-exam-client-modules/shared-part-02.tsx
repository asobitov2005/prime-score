"use client";

import { ImageIcon, Input, Textarea, UploadCloud } from "./dependencies";

import { ExamWritingTask, TASK_1_SUMMARY_INSTRUCTION, WritingTaskType, hasSummaryInstruction, normalizePromptText, stripHtml } from "./shared-part-01";



export function PresetPrompt({ task }: { task: ExamWritingTask }) {
  const titleText = normalizePromptText(task.title);
  const promptText = normalizePromptText(stripHtml(task.prompt_html));
  const promptRepeatsTitle =
    promptText === titleText ||
    promptText.startsWith(`${titleText} `) ||
    titleText.startsWith(`${promptText} `);
  const shouldRenderPromptHtml = Boolean(promptText) && !promptRepeatsTitle;
  const shouldRenderSummaryInstruction =
    task.task_type === "task_1" &&
    !hasSummaryInstruction(task.title) &&
    !hasSummaryInstruction(stripHtml(task.prompt_html));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{task.title}</h2>
        {task.source ? <p className="text-xs font-medium text-muted-foreground">{task.source}</p> : null}
      </div>

      <div className="space-y-2">
        {shouldRenderPromptHtml ? (
          <div
            className="prose max-w-none text-[17px] font-semibold leading-7 text-foreground prose-p:my-2 prose-p:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: task.prompt_html }}
          />
        ) : null}
        {shouldRenderSummaryInstruction ? (
          <p className="text-base font-semibold italic leading-6 text-foreground">
            {TASK_1_SUMMARY_INSTRUCTION}
          </p>
        ) : null}
      </div>

      {task.image_url ? (
        <div className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={task.image_url}
            alt={task.title}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            className="max-h-[680px] w-full select-none object-contain"
          />
        </div>
      ) : task.task_type === "task_1" ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <ImageIcon className="h-7 w-7 opacity-60" />
        </div>
      ) : null}
    </div>
  );
}

export function CustomPrompt({
  taskType,
  topic,
  onTopicChange,
  imageFile,
  imagePreviewUrl,
  onImageChange,
}: {
  taskType: WritingTaskType;
  topic: string;
  onTopicChange: (value: string) => void;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  onImageChange: (file: File | null) => void;
}) {
  if (taskType === "task_1") {
    const shouldRenderSummaryInstruction = !hasSummaryInstruction(topic);

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="whitespace-pre-wrap text-[17px] font-semibold leading-7 text-foreground">
            {topic}
          </p>
          {shouldRenderSummaryInstruction ? (
            <p className="text-base font-semibold italic leading-6 text-foreground">
              {TASK_1_SUMMARY_INSTRUCTION}
            </p>
          ) : null}
        </div>

        <div>
          {imagePreviewUrl ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt={imageFile?.name ?? "Task 1 visual"}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                className="max-h-[680px] w-full select-none object-contain"
              />
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
              <UploadCloud className="h-6 w-6" />
              <span className="font-medium text-foreground">Upload chart, graph, map, or process image</span>
              <span className="text-xs">PNG, JPG, or WebP under 10 MB</span>
              <Input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Textarea
          id="exam-writing-topic"
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder="Paste the Task 2 essay question here."
          className="min-h-[160px] rounded-lg border-border/70 bg-background px-4 py-3 text-sm leading-6"
        />
      </div>
    </div>
  );
}
