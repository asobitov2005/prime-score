"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { buttonClassName } from "../dependencies";

export function WritingTaskDetailPageSection6({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { confirmDelete, setConfirmDelete, handleDelete, actionLoading } = scope;
  return (
    {confirmDelete ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm font-semibold">Delete this task?</p>
              <p className="text-xs text-muted-foreground mt-1">
                This cannot be undone. Tasks with submissions cannot be deleted.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className={buttonClassName({ variant: "ghost", size: "sm" })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={actionLoading}
                  className={buttonClassName({ variant: "danger", size: "sm" })}
                >
                  {actionLoading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ) : null}
  );
}
