"use client";
import type { BaseScope } from "./base";
import { MAX_SPEAKING_TOPIC_SELECTION, SpeakingTopicItem, buildMicrophoneCheckHref, buildSpeakingTopicPickerHref, clampSpeakingPart, createApiClient, normalizeSpeakingEntryMode, supportsMultiTopicSelection, useCallback, useEffect, useMemo, useRef, useRouter, useSearchParams, useState } from "../dependencies";
import { SortOption } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const api = useMemo(() => createApiClient(), []);

  const part = clampSpeakingPart(Number(searchParams.get("part") ?? "1"));

  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode") ?? `part_${part}`);

  const testId = searchParams.get("testId");

  const [topics, setTopics] = useState<SpeakingTopicItem[]>([]);

  const [cueCardTitlesByKey, setCueCardTitlesByKey] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [sortBy, setSortBy] = useState<SortOption>("popular");

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  const [useRandomTopic, setUseRandomTopic] = useState(false);

  const allowsMultiSelect = supportsMultiTopicSelection(part);

  const pageRef = useRef<HTMLDivElement>(null);

  const mainCardRef = useRef<HTMLElement>(null);

  const topicsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      let cancelled = false;
      setLoading(true);
      const topicsRequest = api.listSpeakingTopics(part);
      const cueCardsRequest = part === 3 ? api.listSpeakingTopics(2) : Promise.resolve({ items: [], total: 0 });
  
      Promise.all([topicsRequest, cueCardsRequest])
        .then(([topicPayload, cueCardPayload]) => {
          if (cancelled) {
            return;
          }
          setTopics(topicPayload.items);
          if (part === 3) {
            const titlesByKey: Record<string, string> = {};
            for (const cueCard of cueCardPayload.items) {
              if (cueCard.followupGroupKey) {
                titlesByKey[cueCard.followupGroupKey] = cueCard.topicTitle;
              }
            }
            setCueCardTitlesByKey(titlesByKey);
          } else {
            setCueCardTitlesByKey({});
          }
          setSelectedTopicIds([]);
          setUseRandomTopic(false);
        })
        .catch(() => {
          if (!cancelled) {
            setTopics([]);
            setCueCardTitlesByKey({});
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
  
      return () => {
        cancelled = true;
      };
    }, [api, part]);

  const filteredTopics = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      let items = topics;
      if (query) {
        items = items.filter((topic) => {
          const haystack = [
            topic.topicTitle,
            topic.promptText,
            ...topic.categoryTags,
            topic.difficultyLabel ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });
      }
      if (sortBy === "az") {
        return [...items].sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));
      }
      return items;
    }, [searchQuery, sortBy, topics]);

  const selectedTopics = useMemo(
      () => topics.filter((topic) => selectedTopicIds.includes(topic.id)),
      [selectedTopicIds, topics],
    );

  const toggleTopicSelection = useCallback(
      (topicId: string) => {
        setUseRandomTopic(false);
        setSelectedTopicIds((current) => {
          if (current.includes(topicId)) {
            return current.filter((id) => id !== topicId);
          }
          if (allowsMultiSelect) {
            if (current.length >= MAX_SPEAKING_TOPIC_SELECTION) {
              return current;
            }
            return [...current, topicId];
          }
          return [topicId];
        });
      },
      [allowsMultiSelect],
    );

  const handlePartChange = useCallback(
      (nextPart: number) => {
        router.push(buildSpeakingTopicPickerHref(nextPart, testId));
      },
      [router, testId],
    );

  const handleContinue = useCallback(() => {
      const href = buildMicrophoneCheckHref(
        entryMode,
        "strict_exam",
        part,
        testId,
        useRandomTopic ? null : selectedTopics,
        useRandomTopic,
      );
      router.push(href);
    }, [entryMode, part, router, selectedTopics, testId, useRandomTopic]);

  useEffect(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [part]);

  useEffect(() => {
      const page = pageRef.current;
      const topicsScroll = topicsScrollRef.current;
      if (!page || !topicsScroll) {
        return;
      }
  
      const getWheelDelta = (event: WheelEvent, pageSize: number) => {
        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
          return event.deltaY * 16;
        }
        if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
          return event.deltaY * pageSize;
        }
        return event.deltaY;
      };
  
      const media = window.matchMedia("(min-width: 1024px)");
  
      const handleWheel = (event: WheelEvent) => {
        if (!media.matches || !page.contains(event.target as Node)) {
          return;
        }
  
        const { scrollTop, scrollHeight, clientHeight } = topicsScroll;
        const canScrollTopics = scrollHeight > clientHeight + 1;
        const scrollingTopicsDirectly = topicsScroll.contains(event.target as Node);
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        const delta = getWheelDelta(event, clientHeight);
  
        if (canScrollTopics) {
          if (scrollingTopicsDirectly) {
            if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
              event.preventDefault();
            }
            return;
          }
  
          if (page.contains(event.target as Node)) {
            event.preventDefault();
            topicsScroll.scrollTop = Math.max(
              0,
              Math.min(scrollHeight - clientHeight, scrollTop + delta),
            );
          }
          return;
        }
  
        if (page.contains(event.target as Node)) {
          event.preventDefault();
        }
      };
  
      document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
  
      return () => {
        document.removeEventListener("wheel", handleWheel, { capture: true });
      };
    }, [filteredTopics.length, loading, part]);

  return { router, searchParams, api, part, entryMode, testId, topics, setTopics, cueCardTitlesByKey, setCueCardTitlesByKey, loading, setLoading, searchQuery, setSearchQuery, sortBy, setSortBy, selectedTopicIds, setSelectedTopicIds, useRandomTopic, setUseRandomTopic, allowsMultiSelect, pageRef, mainCardRef, topicsScrollRef, filteredTopics, selectedTopics, toggleTopicSelection, handlePartChange, handleContinue };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
