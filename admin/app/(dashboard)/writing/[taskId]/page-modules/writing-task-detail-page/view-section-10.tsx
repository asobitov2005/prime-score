"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { AlertCircle, Archive, Badge, Card, CardContent, CardHeader, CardTitle, CheckCircle2, ChevronLeft, Clock, Edit3, ImageIcon, Link, Loader2, RefreshCcw, SectionHeader, Sparkles, Trash2, Upload, buttonClassName, cn, formatImageSummaryStatus, formatStatus, formatTaskType, writingApi } from "../dependencies";
import { badgeToneForStatus, badgeToneForSummary, formatDateTime } from "../shared";
import { WritingTaskDetailPageSection2 } from "./view-section-02";
import { WritingTaskDetailPageSection3 } from "./view-section-03";
import { WritingTaskDetailPageSection4 } from "./view-section-04";
import { WritingTaskDetailPageSection5 } from "./view-section-05";
import { WritingTaskDetailPageSection6 } from "./view-section-06";
import { WritingTaskDetailPageSection7 } from "./view-section-07";
import { WritingTaskDetailPageSection8 } from "./view-section-08";
import { WritingTaskDetailPageSection9 } from "./view-section-09";
import { WritingTaskDetailPageSection10 } from "./view-section-10";

export function WritingTaskDetailPageView1({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { task, performAction, actionLoading, setConfirmDelete, actionError, actionSuccess, confirmDelete, handleDelete, minutes, submissions } = scope;
  return (
    (
        <div className="space-y-6">
          <WritingTaskDetailPageSection2 scope={scope} />
    
          <WritingTaskDetailPageSection3 scope={scope} />
    
          <WritingTaskDetailPageSection4 scope={scope} />
          <WritingTaskDetailPageSection5 scope={scope} />
    
          <WritingTaskDetailPageSection6 scope={scope} />
    
          <WritingTaskDetailPageSection7 scope={scope} />
    
          <WritingTaskDetailPageSection8 scope={scope} />
    
          <WritingTaskDetailPageSection9 scope={scope} />
    
          <WritingTaskDetailPageSection10 scope={scope} />
        </div>
      )
  );
}
