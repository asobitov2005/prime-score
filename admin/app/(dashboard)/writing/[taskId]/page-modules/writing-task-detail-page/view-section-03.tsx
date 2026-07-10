"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { Archive, Edit3, Link, SectionHeader, Trash2, Upload, buttonClassName, cn, formatStatus, formatTaskType, writingApi } from "../dependencies";

export function WritingTaskDetailPageSection3({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { task, performAction, actionLoading, setConfirmDelete } = scope;
  return (
    <SectionHeader
            eyebrow={`${formatTaskType(task.task_type)} · ${formatStatus(task.status)}`}
            title={task.title}
            description={task.source ?? undefined}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/writing/${task.id}/edit`}
                  className={buttonClassName({ variant: "outline", size: "sm" })}
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Link>
                {task.status !== "published" ? (
                  <button
                    type="button"
                    onClick={() =>
                      performAction(() => writingApi.publishTask(task.id), "Task published.")
                    }
                    disabled={actionLoading}
                    className={buttonClassName({ variant: "solid", size: "sm" })}
                  >
                    <Upload className="h-4 w-4" />
                    Publish
                  </button>
                ) : null}
                {task.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() =>
                      performAction(() => writingApi.archiveTask(task.id), "Task archived.")
                    }
                    disabled={actionLoading}
                    className={buttonClassName({ variant: "ghost", size: "sm" })}
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setConfirmDelete((v) => !v)}
                  disabled={actionLoading}
                  className={cn(
                    buttonClassName({ variant: "ghost", size: "sm" }),
                    "text-danger hover:bg-danger/10"
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            }
          />
  );
}
