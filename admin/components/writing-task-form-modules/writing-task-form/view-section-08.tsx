"use client";
import type { WritingTaskFormScope } from "./controller";
import { AlertCircle, Badge, Button, Card, CardContent, CardHeader, CardTitle, CheckCircle2, ImageIcon, Input, Label, Link, Loader2, QUESTION_SUBTYPES_TASK1, QUESTION_SUBTYPES_TASK2, RefreshCcw, Sparkles, Textarea, Trash2, Upload, WritingTaskType, buttonClassName, cn, formatImageSummaryStatus } from "../dependencies";
import { subtypeIcons } from "../shared";
import { WritingTaskFormSection2 } from "./view-section-02";
import { WritingTaskFormSection3 } from "./view-section-03";
import { WritingTaskFormSection4 } from "./view-section-04";
import { WritingTaskFormSection5 } from "./view-section-05";
import { WritingTaskFormSection6 } from "./view-section-06";
import { WritingTaskFormSection7 } from "./view-section-07";
import { WritingTaskFormSection8 } from "./view-section-08";

export function WritingTaskFormView1({ scope }: { scope: WritingTaskFormScope }) {
  const { handleSubmit, submitError, successMsg, state, patchState, errors, onTypeChange, setErrors, isTask1, previewImageUrl, fileInputRef, setLocalImagePreviewUrl, setImageSummary, setImageSummaryStatus, setDragActive, onDrop, onPaste, dragActive, uploading, handleFileUpload, uploadError, mode, imageSummaryStatus, regenerateSummary, regenLoading, imageSummary, submitting } = scope;
  return (
    (
        <form onSubmit={handleSubmit} className="space-y-6">
          <WritingTaskFormSection2 scope={scope} />
          <WritingTaskFormSection3 scope={scope} />
          <WritingTaskFormSection4 scope={scope} />
    
          <WritingTaskFormSection5 scope={scope} />
    
          <WritingTaskFormSection6 scope={scope} />
    
          <WritingTaskFormSection7 scope={scope} />
    
          <WritingTaskFormSection8 scope={scope} />
        </form>
      )
  );
}
