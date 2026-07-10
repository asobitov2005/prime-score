"use client";
import type { ReviewsAdminPageScope } from "./controller";
import { AdminReviewLoadingSkeleton, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Eye, EyeOff, Input, MessageSquarePlus, RefreshCw, Search, SectionHeader, Select, Sparkles, Textarea, UserRound, cn } from "../dependencies";
import { MetricCard, Notice, buildUserLabel, formatDate } from "../shared";
import { ReviewsAdminPageSection2 } from "./view-section-04";

export function ReviewsAdminPageView1({ scope }: { scope: ReviewsAdminPageScope }) {
  const { loadPage, refreshing, metrics, error, message, setEntryMode, entryMode, handleCreate, authorName, setAuthorName, selectedUserId, setSelectedUserId, users, bandLabel, setBandLabel, text, setText, isVisible, setIsVisible, resetForm, submitting, search, setSearch, sourceFilter, setSourceFilter, visibilityFilter, setVisibilityFilter, loading, filteredReviews, toggleVisibility } = scope;
  return (
    (
        <div className="space-y-8 pb-10 animate-in fade-in duration-500">
          <SectionHeader
            eyebrow="Public Proof"
            title="Reviews"
            description="Moderate user-submitted feedback, publish curated testimonials, and keep the landing feed consistent."
            actions={(
              <Button variant="outline" size="sm" onClick={() => void loadPage("refresh")} disabled={refreshing}>
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
            )}
          />
    
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Visible on landing" value={String(metrics.visible)} detail="Currently live in the public feed." tone="success" />
            <MetricCard label="Hidden / pending" value={String(metrics.hidden)} detail="Needs approval or is deliberately hidden." tone="warning" />
            <MetricCard label="User submissions" value={String(metrics.userSubmitted)} detail="Reviews coming directly from logged-in students." tone="info" />
          </div>
    
          {error ? <Notice tone="danger" message={error} /> : null}
          {message ? <Notice tone="success" message={message} /> : null}
    
          <ReviewsAdminPageSection2 scope={scope} />
        </div>
      )
  );
}
