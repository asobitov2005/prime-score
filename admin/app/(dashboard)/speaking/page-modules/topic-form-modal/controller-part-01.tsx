"use client";
import type { BaseScope } from "./base";
import { PART_META, SpeakingIconTone, SpeakingTopicCreateInput, parseBulletPoints, parseTopicIconMetadata, speakingApi, useEffect, useState } from "../dependencies";
import { defaultIconForPart, emptyForm, parseIsNewTopic, resolveLinkedPart2Id } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { mode, part, topic, part2Topics, open, onClose, onSaved } = scope;
  const isEdit = mode === "edit";

  const effectivePart = isEdit && topic ? topic.part_number : part;

  const [form, setForm] = useState<SpeakingTopicCreateInput>(() => emptyForm(effectivePart));

  const [bulletsRaw, setBulletsRaw] = useState("");

  const [linkedPart2Id, setLinkedPart2Id] = useState("");

  const [selectedIconId, setSelectedIconId] = useState(defaultIconForPart(1));

  const [selectedIconTone, setSelectedIconTone] = useState<SpeakingIconTone>("purple");

  const [isNewTopic, setIsNewTopic] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      if (!open) return;
  
      if (isEdit && topic) {
        const iconMeta = parseTopicIconMetadata(topic.metadata);
        setForm({
          part_number: topic.part_number,
          topic_title: topic.topic_title,
          prompt_text: topic.prompt_text,
          bullet_points: topic.bullet_points,
          active: topic.active,
        });
        setBulletsRaw(topic.bullet_points.join("\n"));
        setLinkedPart2Id(resolveLinkedPart2Id(topic, part2Topics));
        setIsNewTopic(parseIsNewTopic(topic.metadata));
        if (topic.part_number === 1) {
          setSelectedIconId(iconMeta.iconId || defaultIconForPart(1));
          setSelectedIconTone(iconMeta.iconTone);
        }
      } else {
        setForm(emptyForm(part));
        setBulletsRaw("");
        setLinkedPart2Id("");
        setIsNewTopic(false);
        if (part === 1) {
          setSelectedIconId(defaultIconForPart(1));
          setSelectedIconTone("purple");
        }
      }
      setError(null);
    }, [open, isEdit, topic, part, part2Topics]);

  const meta = PART_META[effectivePart];

  const needsPrompt = effectivePart === 2;

  const bulletLabel =
      effectivePart === 1 ? "Questions" : effectivePart === 2 ? "Cue-card bullets" : "Discussion questions";

  async function handleSubmit(event: React.FormEvent) {
      event.preventDefault();
      setError(null);
  
      const bulletPoints = parseBulletPoints(bulletsRaw);
      const topicTitle = form.topic_title.trim();
      const promptText = needsPrompt ? (form.prompt_text ?? "").trim() : topicTitle;
  
      if (!topicTitle) {
        setError(meta.titleLabel ? `${meta.titleLabel} is required.` : "Topic title is required.");
        return;
      }
      if (needsPrompt && !promptText) {
        setError("Prompt text is required.");
        return;
      }
      if (effectivePart === 1 && !selectedIconId) {
        setError("Select an icon for this topic.");
        return;
      }
      if (effectivePart === 3 && !linkedPart2Id) {
        setError("Select a Part 2 topic to link this Part 3 discussion.");
        return;
      }
  
      setSubmitting(true);
      try {
        const payload = {
          topic_title: topicTitle,
          prompt_text: promptText,
          bullet_points: bulletPoints,
          active: form.active ?? true,
          linked_part2_topic_id: effectivePart === 3 ? linkedPart2Id : null,
          ...(effectivePart === 1
            ? { icon: selectedIconId, icon_tone: selectedIconTone }
            : { icon: null, icon_tone: null }),
          is_new_topic: isNewTopic,
        };
  
        if (isEdit && topic) {
          await speakingApi.updateTopic(topic.id, payload);
        } else {
          await speakingApi.createTopic({
            ...payload,
            part_number: effectivePart,
          });
        }
        onSaved();
        onClose();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : isEdit
              ? "Failed to update topic."
              : "Failed to create topic.",
        );
      } finally {
        setSubmitting(false);
      }
    }

  if (!open) return null;

  return { isEdit, effectivePart, form, setForm, bulletsRaw, setBulletsRaw, linkedPart2Id, setLinkedPart2Id, selectedIconId, setSelectedIconId, selectedIconTone, setSelectedIconTone, isNewTopic, setIsNewTopic, submitting, setSubmitting, error, setError, meta, needsPrompt, bulletLabel, handleSubmit };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
