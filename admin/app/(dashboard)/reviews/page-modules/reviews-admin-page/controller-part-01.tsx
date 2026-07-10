"use client";
import type { BaseScope } from "./base";
import { useEffect, useMemo, useState } from "../dependencies";
import { ReviewRow, UserOption, requestAdmin } from "../shared";

export function useControllerPart1(scope: BaseScope) {
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

  return { reviews, setReviews, users, setUsers, loading, setLoading, refreshing, setRefreshing, submitting, setSubmitting, search, setSearch, sourceFilter, setSourceFilter, visibilityFilter, setVisibilityFilter, entryMode, setEntryMode, selectedUserId, setSelectedUserId, authorName, setAuthorName, bandLabel, setBandLabel, text, setText, isVisible, setIsVisible, error, setError, message, setMessage, loadPage, filteredReviews, metrics, resetForm, handleCreate, toggleVisibility };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
