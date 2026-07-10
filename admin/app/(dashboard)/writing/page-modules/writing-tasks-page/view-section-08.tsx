"use client";
import type { WritingTasksPageScope } from "./controller";
import { AdminTableLoadingSkeleton, AlertCircle, Archive, Badge, Card, CardContent, ChevronLeft, ChevronRight, Edit3, ImageIcon, ImageOff, Link, Plus, RefreshCcw, Search, SectionHeader, Trash2, Upload, X, buttonClassName, cn, formatImageSummaryStatus, formatStatus, formatTaskType, writingApi } from "../dependencies";
import { EmptyState, FilterDropdown, RowMenuButton, StatusFilter, Toast, TypeFilter, badgeToneForStatus, badgeToneForSummary, formatDateTime } from "../shared";
import { WritingTasksPageSection2 } from "./view-section-02";
import { WritingTasksPageSection3 } from "./view-section-03";
import { WritingTasksPageSection4 } from "./view-section-04";
import { WritingTasksPageSection5 } from "./view-section-05";
import { WritingTasksPageSection6 } from "./view-section-06";
import { WritingTasksPageSection7 } from "./view-section-07";
import { WritingTasksPageSection8 } from "./view-section-08";

export function WritingTasksPageView1({ scope }: { scope: WritingTasksPageScope }) {
  const { typeFilter, setTypeFilter, statusFilter, setStatusFilter, search, setSearch, hasFilters, clearFilters, total, error, loading, tasks, actionId, runTaskAction, setDeleteConfirmId, deleteConfirmId, handleDelete, totalPages, page, setPage, toast, setToast } = scope;
  return (
    (
        <div className="space-y-6">
          <WritingTasksPageSection2 scope={scope} />
    
          <WritingTasksPageSection3 scope={scope} />
          <WritingTasksPageSection4 scope={scope} />
    
          <WritingTasksPageSection5 scope={scope} />
    
          <WritingTasksPageSection6 scope={scope} />
    
          <WritingTasksPageSection7 scope={scope} />
    
          <WritingTasksPageSection8 scope={scope} />
        </div>
      )
  );
}
