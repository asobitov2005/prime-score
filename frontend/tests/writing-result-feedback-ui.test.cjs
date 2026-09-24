const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { writingResult } = require("./fixtures/writing-result.cjs");
const { WritingResultReport } = loadTypeScript("components/writing/writing-result-report.tsx");
const { WritingResultFailure } = loadTypeScript("components/writing/writing-result-failure.tsx");
const { revisionFocus, writingCriteria, annotatedSegments, annotationContext, validAnnotation, hasRoast, formatBand, writingInputRejection, taskFitFeedback } = loadTypeScript("lib/writing-feedback.ts");
const render = (result = writingResult()) => renderToStaticMarkup(React.createElement(WritingResultReport, { result }));

test("uses all four official criteria and the correct task criterion", () => {
  assert.equal(writingCriteria(writingResult())[0].label, "Task Response");
  assert.equal(writingCriteria(writingResult({ task_type: "task_1" }))[0].label, "Task Achievement");
  assert.match(render(), /Coherence and Cohesion/);
  assert.match(render(), /Grammatical Range and Accuracy/);
  assert.match(render(), /ielts-writing-key-assessment-criteria.pdf/);
});

test("focus preserves supplied priorities, text and direct provenance without mutating input", () => {
  const result = writingResult();
  const focus = revisionFocus(result);
  assert.equal(focus.length, 5);
  assert.deepEqual(focus[0], { title: "Action 4", instruction: "Instruction 4.", reason: "Action rationale 4.", examples: ["Action example 4."], source: "Priority action", sourceId: "writing-action-4" });
  assert.equal(result.target_action_plan[0].title, "Action 0");
  assert.match(render(result), /Showing 3 of 5 actions/);
  assert.match(render(result), /id="writing-action-0"/);
});

test("a single real action is not padded with generic priorities", () => {
  const result = writingResult();
  result.target_action_plan = result.target_action_plan.slice(0, 1);
  assert.equal(revisionFocus(result).length, 1);
  assert.equal(revisionFocus(result)[0].title, "Action 0");
});

test("fallback focus uses supplied advice in source order, not the lowest band or fuzzy matching", () => {
  const result = writingResult({ target_action_plan: [], action_plan: null, next_steps: [], checklist: [] });
  assert.equal(revisionFocus(result)[0].instruction, "Task improvement.");
  assert.equal(revisionFocus(result)[0].sourceId, "writing-task_achievement");
  result.next_steps = ["An actual next step."];
  assert.equal(revisionFocus(result)[0].instruction, "An actual next step.");
  assert.deepEqual(revisionFocus(result)[0].examples, []);
});

test("missing actions and checklist do not imply success or invent advice", () => {
  const empty = { band: 6, summary: "", strengths: [], improvements: [], evidence_quotes: [], reasoning: "" };
  const result = writingResult({ target_action_plan: [], action_plan: null, next_steps: [], checklist: [], task_achievement: empty, coherence: empty, lexical: empty, grammar: empty });
  assert.deepEqual(revisionFocus(result), []);
  assert.match(render(result), /No specific revision actions were provided/);
  assert.doesNotMatch(render(result), /checklist is clear|highest-impact|protect this score/);
});

test("does not display heuristic confidence, ranges, audit, calibration or predicted gains", () => {
  const html = render();
  assert.doesNotMatch(html, /UNSUPPORTED_|93%|Band 8\.0\+|Potential band|Final band|Medium confidence|Band ceiling/);
  assert.match(html, /not an official IELTS score/);
  assert.match(html, /not a separately graded response/);
  assert.doesNotMatch(html, /Regrade revision|Apply fixes|Use improved/);
});

test("full disclosure retains every supplied feedback family and untruncated items", () => {
  const html = render();
  for (const text of ["Grammar reasoning.", "Check evidence 0.", "Check fix 6.", "Vocabulary rationale 7.", "Vocabulary example 7.", "Action rationale 0.", "Action example 0.", "Supplied impact 0.", "History example three", "Historical supplied fix.", "Boundary explanation.", "Boundary requirement.", "Booster explanation.", "Booster practice.", "Booster value.", "Sentence fix full sentence.", "Sentence fix explanation.", "Sentence fix impact.", "Revision rationale.", "Reference lesson.", "Reference sign.", "Additional supplied note."]) {
    assert.ok(html.includes(text), "Missing feedback: " + text);
  }
  assert.match(html, /1 reported occurrences/);
  assert.match(html, /<details/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test("all annotation explanations, alternatives, sentence and tips are reachable", () => {
  const html = render();
  for (const text of ["regularly use", "The plural subject needs a plural verb.", "Agreement errors affect grammatical accuracy.", "Check the verb against its subject.", "Many people use public transport every day."]) assert.ok(html.includes(text), text);
  assert.match(html, /All correction notes/);
  assert.match(html, /aria-controls="writing-selected-note"/);
});

test("annotation segments preserve the exact essay and reject invalid or mismatched offsets", () => {
  const result = writingResult();
  const annotation = result.inline_annotations[0];
  const segments = annotatedSegments(result.essay_text, [annotation, { ...annotation }, { ...annotation, offset: -1 }, { ...annotation, original: "wrong text" }]);
  assert.equal(segments.map((segment) => segment.text).join(""), result.essay_text);
  assert.equal(segments.filter((segment) => segment.annotationIndex !== undefined).length, 1);
  assert.equal(annotationContext(result.essay_text, annotation), "Many people uses public transport every day.");
  assert.equal(annotationContext(result.essay_text, { ...annotation, offset: 9999 }), null);
});

test("unlocatable annotations remain in the full list, not misattached to essay text", () => {
  const result = writingResult();
  result.inline_annotations[0].offset = 9999;
  const html = render(result);
  assert.match(html, /Subject-verb agreement/);
  assert.doesNotMatch(html, /data-annotation=/);
});

test("Python codepoint offsets locate a phrase after an astral character", () => {
  const essay = "\u{1F642} Many people uses buses.";
  const annotation = { ...writingResult().inline_annotations[0], offset: 14 };
  assert.equal(validAnnotation(essay, annotation), true);
  assert.deepEqual(annotatedSegments(essay, [annotation]), [
    { text: "\u{1F642} Many people " }, { text: "uses", annotationIndex: 0 }, { text: " buses." },
  ]);
  assert.equal(annotationContext(essay, annotation), essay);
  assert.match(render(writingResult({ essay_text: essay, inline_annotations: [annotation] })), /data-annotation="0"/);
});

test("annotation lengths also use codepoints and never split an astral character", () => {
  const essay = "A \u{1F68D} arrives. Next sentence.";
  const annotation = { ...writingResult().inline_annotations[0], offset: 2, length: 1, original: "\u{1F68D}" };
  assert.equal(validAnnotation(essay, annotation), true);
  const segments = annotatedSegments(essay, [annotation]);
  assert.equal(segments[1].text, "\u{1F68D}");
  assert.equal(segments.map(segment => segment.text).join(""), essay);
  assert.equal(annotationContext(essay, annotation), "A \u{1F68D} arrives.");
  assert.equal(validAnnotation(essay, { ...annotation, offset: Array.from(essay).length }), false);
});

test("roast survives even when only a secondary field was returned", () => {
  assert.equal(hasRoast(null), false);
  for (const field of ["one_liner", "grammar_zinger", "pep_talk"]) {
    const roast = { [field]: "Only supplied roast text." };
    const html = render(writingResult({ roast }));
    assert.equal(hasRoast(roast), true);
    assert.match(html, /Only supplied roast text/);
    assert.match(html, /Roast feedback/);
  }
  const html = render();
  for (const text of ["Task roast.", "Coherence roast.", "Lexical roast.", "Grammar roast.", "Roast tip.", "Roast encouragement."]) assert.ok(html.includes(text));
});

test("partial flags stay visible without asserting how the backend handled them", () => {
  const html = render(writingResult({ pipeline_status: "partial", word_count: 140, flags: { non_english: true, injection_attempt_detected: true } }));
  assert.match(html, /This report is partial/);
  assert.match(html, /140 words submitted/);
  assert.match(html, /flagged non-English/);
  assert.doesNotMatch(html, /excluded from scoring/);
});

test("missing or invalid bands are not turned into zero scores", () => {
  for (const value of [null, undefined, "", "garbage", -1, 10]) assert.equal(formatBand(value), "Not provided");
  assert.equal(formatBand(0), "0.0");
  assert.equal(formatBand("6.5"), "6.5");
});

test("input rejection strips the protocol prefix and does not offer same-essay retries", () => {
  for (const message of ["WRITING_INPUT_REJECTED: Submit your own response.", "WRITING_INPUT_REJECTED:"]) {
    const html = renderToStaticMarkup(React.createElement(WritingResultFailure, { message, retrying: false, onRetry() {} }));
    assert.match(html, /This response needs a revision/);
    assert.match(html, /Write a new response/);
    assert.match(html, /href="\/writing"/);
    assert.doesNotMatch(html, /WRITING_INPUT_REJECTED|Try again/);
    assert.ok(writingInputRejection(message));
  }
  assert.equal(writingInputRejection("Provider unavailable"), null);
  const html = renderToStaticMarkup(React.createElement(WritingResultFailure, { message: "Provider unavailable", retrying: false, onRetry() {} }));
  assert.match(html, /Try again/);
});

test("task mismatch findings show conspicuous explanations but preserve assessed scores", () => {
  for (const task_relation of ["partial", "off_topic", "wrong_task", "uncertain"]) {
    const task_fit = { task_relation, explanation: "Supplied task-fit explanation.", essay_evidence: ["Supplied essay evidence."], task_evidence: ["Supplied task evidence."] };
    const result = writingResult({ audit_result: { task_fit } });
    assert.deepEqual(taskFitFeedback(result), task_fit);
    const html = render(result);
    assert.match(html, /writing-task-fit-title/);
    assert.match(html, /Supplied task-fit explanation/);
    assert.match(html, /Supplied essay evidence/);
    assert.match(html, /Supplied task evidence/);
    assert.match(html, /not a rejected submission/);
    assert.match(html, /Estimated band/);
    assert.match(html, /6\.5/);
    assert.match(html, /Grammar reasoning/);
  }
});

test("task fit accepts only the explicit protocol, never guessing from explanations", () => {
  for (const task_fit of [null, [], "off_topic", { task_relation: "unknown", explanation: "Off topic" }, { verdict: "wrong_task", explanation: "Off topic" }]) {
    assert.equal(taskFitFeedback(writingResult({ audit_result: { task_fit } })), null);
  }
  const html = render(writingResult({ audit_result: { task_fit: { task_relation: "on_task", explanation: "The response addresses the task.", essay_evidence: [], task_evidence: [] } } }));
  assert.match(html, /Task relevance review/);
  assert.doesNotMatch(html, /writing-task-fit-title/);
});
