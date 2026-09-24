function writingResult(overrides = {}) {
  const criterion = (band, label) => ({ band, summary: `${label} summary.`, strengths: [`${label} strength.`], improvements: [`${label} improvement.`], evidence_quotes: [`${label} evidence.`], reasoning: `${label} reasoning.` });
  return {
    submission_id: "writing-ui-fixture", task_id: "task-fixture", task_type: "task_2",
    task_title: "Should cities invest more in public transport?", word_count: 274, word_minimum: 250,
    time_spent_seconds: 1802, desired_score: 7, overall_band: 6.5,
    submitted_at: "2026-09-20T10:00:00Z", graded_at: "2026-09-20T10:01:00Z",
    essay_text: "Many people uses public transport every day. Cities should invest in buses because they carry more passengers.\n\nReliable services can reduce traffic, but funding remains a concern.",
    task_achievement: criterion(6, "Task"), coherence: criterion(7, "Coherence"), lexical: criterion(6.5, "Lexical"), grammar: criterion(6, "Grammar"),
    overall_summary: "Your position is clear. Develop the funding argument and review subject-verb agreement.",
    inline_annotations: [{ offset: 12, length: 4, original: "uses", replacements: ["use", "regularly use"], category: "grammar", severity: "medium", short_message: "Subject-verb agreement", explanation: "The plural subject needs a plural verb.", band_impact: "Agreement errors affect grammatical accuracy.", examiner_tip: "Check the verb against its subject.", improved_sentence: "Many people use public transport every day." }],
    vocabulary_suggestions: Array.from({ length: 8 }, (_, index) => ({ current_phrase: `Phrase ${index}`, improved_phrase: `Upgrade ${index}`, level: "C1", why_it_works: `Vocabulary rationale ${index}.`, example_sentence: `Vocabulary example ${index}.` })),
    improved_version: "Many people use public transport every day. Cities should invest in reliable buses while planning how to fund them.",
    next_steps: ["Explain the funding trade-off in your next response."],
    target_action_plan: Array.from({ length: 5 }, (_, index) => ({ title: `Action ${index}`, how: `Instruction ${index}.`, why: `Action rationale ${index}.`, example: `Action example ${index}.`, band_impact: `Supplied impact ${index}.`, priority: 5 - index })),
    action_plan: { main_limiter: "Task Response", main_limiter_band: 6, strongest_area: "Coherence and Cohesion", strongest_area_band: 7, fixes: ["Explain how funding could be secured."] },
    checklist: Array.from({ length: 7 }, (_, index) => ({ label: `Check ${index}`, status: index === 0 ? "met" : "partial", detail: `Check evidence ${index}.`, how_to_fix: `Check fix ${index}.` })),
    error_patterns: [{ category: "grammar", subcategory: "agreement", label: "Agreement", count: 1, percentage: 20, examples: ["people uses"], fix: "Match the verb to the plural subject." }],
    history_error_trends: [{ category: "grammar", label: "Historical agreement", count: 3, percentage: 30, examples: ["History example one", "History example two", "History example three"], fix: "Historical supplied fix." }],
    band_boundaries: [{ criterion: "Task Response", current_band: 6, next_band: 7, why_current: "Boundary explanation.", required_for_next: "Boundary requirement." }],
    score_boosters: [{ criterion: "Coherence and Cohesion", original: "Reliable services can reduce traffic", why_it_scores: "Booster explanation.", keep_doing: "Booster practice.", band_value: "Booster value." }],
    sentence_fixes: [{ priority: 1, original: "people uses", replacement: "people use", corrected_sentence: "Sentence fix full sentence.", why: "Sentence fix explanation.", band_impact: "Sentence fix impact.", category: "grammar" }],
    revision_diff: [{ original: "funding remains a concern", revised: "funding requires a dedicated budget", reason: "Revision rationale.", criterion: "Task Response" }],
    selected_benchmarks: [{ card_id: "reference-1", title: "Reference title", band: 6, use_when: "Reference use.", tolerance_lesson: "Reference lesson.", band_limiting_signs: ["Reference sign."] }],
    meta_learning_note: "Additional supplied note.",
    roast: { overall_roast: "The buses have a route; the funding argument needs one.", one_liner: "Give that argument a destination.", task_achievement_zinger: "Task roast.", coherence_zinger: "Coherence roast.", lexical_zinger: "Lexical roast.", grammar_zinger: "Grammar roast.", savage_tips: ["Roast tip."], pep_talk: "Roast encouragement." },
    confidence: "UNSUPPORTED_CONFIDENCE", possible_score_range: "UNSUPPORTED_RANGE", benchmark_coverage: 93,
    calibration_result: { note: "UNSUPPORTED_CALIBRATION" }, audit_result: { note: "UNSUPPORTED_AUDIT" }, potential_band: 9,
    xp_awarded_total: 25, xp_breakdown: { activity_xp: 20, score_bonus: 5 }, xp_level_after: 4, xp_current_streak: 3,
    ...overrides,
  };
}
module.exports = { writingResult };
