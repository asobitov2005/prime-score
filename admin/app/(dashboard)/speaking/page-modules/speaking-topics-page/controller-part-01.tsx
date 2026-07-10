"use client";
import type { BaseScope } from "./base";
import { SpeakingPartNumber, SpeakingTopic, speakingApi, useCallback, useEffect, useMemo, useState } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
  const [activePart, setActivePart] = useState<SpeakingPartNumber>(1);

  const [topics, setTopics] = useState<SpeakingTopic[]>([]);

  const [part2Topics, setPart2Topics] = useState<SpeakingTopic[]>([]);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const [editingTopic, setEditingTopic] = useState<SpeakingTopic | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  const fetchTopics = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await speakingApi.listTopics({
          part_number: activePart,
        });
        setTopics(result.items);
        setTotal(result.total);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load speaking topics.");
        setTopics([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, [activePart]);

  useEffect(() => {
      void fetchTopics();
    }, [fetchTopics]);

  useEffect(() => {
      void speakingApi.listTopics({ part_number: 2 }).then((result) => {
        setPart2Topics(result.items);
      }).catch(() => {
        setPart2Topics([]);
      });
    }, [topics]);

  async function handleDeleteTopic(topic: SpeakingTopic) {
      setDeletingId(topic.id);
      try {
        await speakingApi.deleteTopic(topic.id);
        setToast({ message: "Speaking topic deleted.", tone: "success" });
        await fetchTopics();
      } catch (deleteError) {
        setToast({
          message: deleteError instanceof Error ? deleteError.message : "Failed to delete topic.",
          tone: "danger",
        });
      } finally {
        setDeletingId(null);
      }
    }

  const filteredTopics = useMemo(() => {
      const normalizedSearch = search.trim().toLowerCase();
      if (!normalizedSearch) return topics;
      return topics.filter((topic) =>
        [topic.topic_title, topic.prompt_text, topic.followup_group_key ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      );
    }, [topics, search]);

  const partCounts = useMemo(() => {
      return {
        shown: filteredTopics.length,
        total,
      };
    }, [filteredTopics.length, total]);

  return { activePart, setActivePart, topics, setTopics, part2Topics, setPart2Topics, total, setTotal, loading, setLoading, error, setError, search, setSearch, modalOpen, setModalOpen, modalMode, setModalMode, editingTopic, setEditingTopic, deletingId, setDeletingId, toast, setToast, fetchTopics, handleDeleteTopic, filteredTopics, partCounts };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
