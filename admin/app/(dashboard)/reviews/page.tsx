"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, MessageSquarePlus, RefreshCw, Search, Sparkles, UserRound } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, SectionHeader, Select, Textarea, cn } from "@/components/ui";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

type ReviewRow = {
  id: string;
  source: "admin" | "user";
  author_name: string;
  band_label: string;
  text: string;
  is_visible: boolean;
  created_at: string;
  user_id: string | null;
  user_display_name: string | null;
  user_username: string | null;
  created_by_admin_id: string | null;
};

type UserOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
};

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildUserLabel(user: UserOption): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (user.username) {
    return `${fullName || "Unnamed user"} · ${user.username}`;
  }
  return fullName || "Unnamed user";
}

async function requestAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getClientAdminAccessToken();
  if (!token) {
    throw new Error("Admin session is missing.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Admin request failed.");
  }

  return (await response.json()) as T;
}

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "admin" | "user">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [entryMode, setEntryMode] = useState<"manual" | "linked">("manual");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [bandLabel, setBandLabel] = useState("");
  const [text, setText] = useState("");
  const [isVisible, setIsVisible] = useState("visible");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPage = async (mode: "initial" | "refresh" = "initial") => {
    setError(null);
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [reviewPayload, userPayload] = await Promise.all([
        requestAdmin<ReviewRow[]>("/reviews"),
        requestAdmin<UserOption[]>("/users"),
      ]);
      setReviews(reviewPayload);
      setUsers(userPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load reviews.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, []);

  const filteredReviews = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return reviews.filter((review) => {
      if (sourceFilter !== "all" && review.source !== sourceFilter) {
        return false;
      }
      if (visibilityFilter === "visible" && !review.is_visible) {
        return false;
      }
      if (visibilityFilter === "hidden" && review.is_visible) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return [
        review.author_name,
        review.text,
        review.user_display_name ?? "",
        review.user_username ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [reviews, search, sourceFilter, visibilityFilter]);

  const metrics = useMemo(() => {
    const visible = reviews.filter((review) => review.is_visible).length;
    const hidden = reviews.length - visible;
    const userSubmitted = reviews.filter((review) => review.source === "user").length;
    return { visible, hidden, userSubmitted };
  }, [reviews]);

  const resetForm = () => {
    setEntryMode("manual");
    setSelectedUserId("");
    setAuthorName("");
    setBandLabel("");
    setText("");
    setIsVisible("visible");
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const created = await requestAdmin<ReviewRow>("/reviews", {
        method: "POST",
        body: JSON.stringify({
          user_id: entryMode === "linked" ? selectedUserId || undefined : undefined,
          author_name: entryMode === "manual" ? authorName : undefined,
          band_label: bandLabel,
          text,
          is_visible: isVisible === "visible",
        }),
      });
      setReviews((current) => [created, ...current]);
      resetForm();
      setMessage("Review saved to the public feed pipeline.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVisibility = async (review: ReviewRow) => {
    setError(null);
    try {
      const updated = await requestAdmin<ReviewRow>(`/reviews/${review.id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ is_visible: !review.is_visible }),
      });
      setReviews((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update visibility.");
    }
  };

  return (
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

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/40 bg-muted/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquarePlus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Create Review</CardTitle>
                <CardDescription>Seed curated testimonials or attach a review to an existing user.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/20 p-1.5">
              <button
                type="button"
                onClick={() => setEntryMode("manual")}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                  entryMode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Manual author
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("linked")}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                  entryMode === "linked" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Linked user
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {entryMode === "manual" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Author name</label>
                  <Input
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    placeholder="Dilnoza R."
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Linked user</label>
                  <Select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} required>
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {buildUserLabel(user)}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">The public card still looks identical. Only admin sees where it came from.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Band label</label>
                <Input
                  value={bandLabel}
                  onChange={(event) => setBandLabel(event.target.value)}
                  placeholder="7.5"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Review text</label>
                <Textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Write the review exactly as it should appear on the landing page."
                  className="min-h-[160px] resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Visibility</label>
                <Select value={isVisible} onChange={(event) => setIsVisible(event.target.value)}>
                  <option value="visible">Show on landing immediately</option>
                  <option value="hidden">Save hidden for later</option>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                  Reset
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    submitting
                    || !bandLabel.trim()
                    || text.trim().length < 10
                    || (entryMode === "manual" ? !authorName.trim() : !selectedUserId)
                  }
                >
                  {submitting ? "Saving..." : "Save review"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/40 bg-muted/10 space-y-4">
            <div>
              <CardTitle>Moderation Queue</CardTitle>
              <CardDescription>Approve, hide, and inspect whether a testimonial came from a user submission or an admin-curated entry.</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search author or review text..."
                  className="pl-9"
                />
              </div>
              <Select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | "admin" | "user")} className="w-[170px]">
                <option value="all">All sources</option>
                <option value="admin">Admin curated</option>
                <option value="user">User submitted</option>
              </Select>
              <Select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as "all" | "visible" | "hidden")} className="w-[170px]">
                <option value="all">All visibility</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border/60 px-6 py-16 text-center text-sm text-muted-foreground">
                Loading reviews...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 px-6 py-16 text-center">
                <p className="text-sm font-semibold text-foreground">No reviews matched the current filters.</p>
                <p className="mt-2 text-sm text-muted-foreground">Try another source or clear the search input.</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <Card key={review.id} className="border-border/50 bg-background/60 shadow-none">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={review.source === "user" ? "info" : "neutral"}>
                            {review.source === "user" ? "User submission" : "Admin curated"}
                          </Badge>
                          <Badge tone={review.is_visible ? "success" : "warning"}>
                            {review.is_visible ? "Visible" : "Hidden"}
                          </Badge>
                          <Badge tone="neutral">Band {review.band_label}</Badge>
                        </div>
                        <div>
                          <CardTitle className="text-xl">{review.author_name}</CardTitle>
                          <CardDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span>{formatDate(review.created_at)}</span>
                            {review.user_display_name ? (
                              <>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span>Linked to {review.user_display_name}</span>
                              </>
                            ) : null}
                            {review.user_username ? (
                              <>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span>{review.user_username}</span>
                              </>
                            ) : null}
                          </CardDescription>
                        </div>
                      </div>

                      <Button variant={review.is_visible ? "outline" : "solid"} size="sm" onClick={() => void toggleVisibility(review)}>
                        {review.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {review.is_visible ? "Hide from landing" : "Publish to landing"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm leading-7 text-foreground/90">{review.text}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {review.source === "user" ? <UserRound className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {review.source === "user" ? "Submitted from public reviews page" : "Created from admin panel"}
                      </span>
                      {review.user_id ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground/80">
                          User linked
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "info";
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="space-y-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <Badge tone={tone}>{tone === "info" ? "Needs moderation trail" : tone === "success" ? "Public-facing" : "Internal only"}</Badge>
      </CardContent>
    </Card>
  );
}

function Notice({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-medium",
        tone === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-red-500/20 bg-red-500/10 text-red-500",
      )}
    >
      {message}
    </div>
  );
}
