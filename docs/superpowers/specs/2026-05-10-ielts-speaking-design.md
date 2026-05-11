# IELTS Speaking Dedicated Module Design

## Goal

PrimeScore ga dedicated IELTS Speaking module qo'shish:

- `Gemini API Live` asosida real-time mock examiner
- full speaking test yoki `Part 1` / `Part 2` / `Part 3` ni alohida topshirish
- strict IELTS-like flow
- hidden live telemetry + post-session deep grading
- admin paneldan speaking topic/test bank CRUD
- seeded 20+ `Part 1`, 20+ `Part 2`, 20+ `Part 3` real-reported topic bank

Bu modul reading/listening attempt engine ichiga zo'rlab tiqilmaydi; alohida speaking domain bo'ladi va faqat catalog/history/dashboard darajasida umumiy yuzalar bilan bog'lanadi.

## External Constraints And Findings

### IELTS format

Official IELTS Speaking formatga ko'ra test `11-14` daqiqa, `3` qismdan iborat:

- `Part 1`: introduction/interview, `4-5` minutes
- `Part 2`: cue card + `1` minute preparation + long turn, `3-4` minutes
- `Part 3`: abstract discussion tied to Part 2, `4-5` minutes

Official marking criteria:

- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation

Sources:

- IELTS official speaking format: <https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking>
- IELTS official speaking band descriptors PDF: <https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf>

### Gemini Live constraints

As of May 10, 2026, official Gemini API docs indicate:

- Live API is WebSocket-based and supports low-latency audio sessions
- automatic VAD is supported
- transcription can be enabled for user and model audio
- client-to-server with ephemeral tokens is the recommended production pattern
- the latest Gemini Developer API native-audio Live model exposed in official docs is `gemini-2.5-flash-native-audio-preview-12-2025`

Sources:

- Gemini Live API overview: <https://ai.google.dev/gemini-api/docs/live-api>
- Gemini Live capabilities: <https://ai.google.dev/gemini-api/docs/live-api/capabilities>
- Gemini API release notes: <https://ai.google.dev/gemini-api/docs/changelog>
- Gemini models page: <https://ai.google.dev/models/gemini>

### Pricing and cost behavior

Official Gemini Developer API pricing currently shows Live API billed separately from standard calls. Design implication:

- session duration must stay tight
- keep context small
- avoid unnecessary proactive listening
- do final grading in a single post-session evaluation call rather than bloating the live session

Source:

- Gemini Developer API pricing: <https://ai.google.dev/gemini-api/docs/pricing>

### Current-topic sourcing

IELTS does not publish the active speaking question bank. Therefore:

- official IELTS docs define format and scoring only
- recent seeded topic bank must be inferred from reported-question aggregators
- this is an inference, not a claim of official leaked question sets

For initial seed content, use recent reported-topic aggregations and normalize them into PrimeScore-owned prompts. Seed content should avoid copying third-party pages verbatim.

Reference sources used for topic trend inference:

- Cathoven 2026 topic rotation overview: <https://resources.cathoven.com/ielts-speaking/topics-2026>
- AllThingsIELTS 2026 topic roundup: <https://allthingsielts.com/ielts-speaking/speaking-topics-2026.php>

## Product Scope

### Included in v1

- speaking catalog in user app
- full test and single-part entry modes
- dedicated speaking session runtime
- examiner audio in English only
- smart but strict repair handling
- hard integrity policy with warning/termination logic
- per-turn transcript persistence
- deterministic diarization by turn ownership
- raw candidate phrasing preserved in stored evidence
- final deep grading with rubric scores and actionable feedback
- admin CRUD for topic bank and published speaking sets
- seed data with 20+ prompts per speaking part
- results/history surfaces

### Explicit non-goals for v1

- human examiner review workflow
- peer review
- automatic phoneme-level forced alignment
- live on-screen scoring during the exam
- broad multi-provider realtime abstraction
- `frontend/app/admin/*` legacy admin surface support

## Architecture Decision

Use a dedicated speaking domain instead of extending the existing `Attempt` engine.

Reasoning:

- current attempt engine is objective-question centric
- speaking needs session state, live provider ids, turn logs, cue-card prep timer, audio assets, integrity events, and subjective grading artifacts
- keeping speaking isolated reduces schema contamination and lowers regression risk for reading/listening

## High-Level System Design

### Frontend

User app in `frontend/` gets a new speaking surface:

- speaking catalog/list page
- speaking start/setup page
- live speaking room
- results page
- history/detail page

The live speaking room responsibilities:

- fetch speaking session bootstrap from backend
- request ephemeral token from backend
- open Live API session from browser
- stream mic audio only during candidate turns
- stop or ignore mic input while examiner is speaking
- render examiner/candidate transcript timeline
- manage Part 2 prep timer and speaking timer
- show minimal exam UI, not coaching UI

### Backend

FastAPI backend responsibilities:

- admin CRUD for speaking tests/topics
- user session creation and lifecycle control
- ephemeral token minting endpoint
- event ingestion endpoints for transcript/telemetry/audio manifests
- integrity policy state tracking
- audio asset finalization
- post-session evaluation orchestration
- reporting/result endpoints

### Live model role split

#### Live examiner

`Gemini API Live` only acts as the examiner:

- asks scripted/adaptive IELTS-style questions
- speaks English only
- never reveals scores
- never coaches during exam
- never leaves the allowed exam persona

#### Final evaluator

A separate non-live backend evaluation call grades the completed performance using:

- session transcript
- per-turn metadata
- integrity events
- audio asset references
- live telemetry summaries

This separation keeps live latency lower and makes grading deterministic and reviewable.

## Data Model

Add dedicated SQLAlchemy models plus Alembic migration(s).

### `speaking_tests`

Published containers for available speaking experiences.

Fields:

- `id`
- `title`
- `slug`
- `status` (`draft`, `published`, `archived`)
- `access_type`
- `mode_kind` (`full`, `part_only`)
- `source`
- `source_detail`
- `description`
- `estimated_minutes`
- `version`
- `created_by`
- `created_at`, `updated_at`

### `speaking_test_parts`

Defines which parts a test includes and how prompts are selected.

Fields:

- `id`
- `speaking_test_id`
- `part_number` (`1`, `2`, `3`)
- `selection_strategy` (`fixed`, `random_from_pool`, `linked_followup`)
- `prompt_count`
- `prep_seconds` nullable, primarily for `Part 2`
- `response_target_seconds`
- `metadata`

### `speaking_topics`

Admin-managed topic bank items.

Fields:

- `id`
- `part_number`
- `topic_title`
- `prompt_text`
- `bullet_points` JSON for Part 2 cue card prompts
- `followup_group_key` to link Part 2 and Part 3
- `difficulty_label`
- `topic_tags` JSON
- `source_kind` (`real_reported`, `editorial`, `custom`)
- `source_note`
- `active`
- `seed_rank`
- `metadata`

Usage by part:

- `Part 1`: short familiar-topic interview questions, grouped by topic
- `Part 2`: cue card prompt with bullet points
- `Part 3`: linked abstract follow-up cluster

### `speaking_topic_question_items`

Concrete question rows attached to a topic item.

Fields:

- `id`
- `speaking_topic_id`
- `position`
- `question_text`
- `role` (`main`, `followup`, `repair`)
- `metadata`

This keeps topic CRUD flexible and avoids stuffing multiple questions into opaque JSON only.

### `speaking_sessions`

Primary runtime entity for one candidate attempt.

Fields:

- `id`
- `user_id`
- `speaking_test_id`
- `status` (`queued`, `ready`, `in_progress`, `completed`, `terminated`, `grading`, `graded`, `failed`)
- `entry_mode` (`full`, `part_1`, `part_2`, `part_3`)
- `current_part`
- `live_provider` (`gemini_api`)
- `live_model_code`
- `live_session_id`
- `ephemeral_session_token_id` nullable
- `warning_count`
- `termination_reason` nullable
- `started_at`
- `ended_at`
- `graded_at`
- `metadata`

### `speaking_session_parts`

Part-level state so users can do one part or all parts.

Fields:

- `id`
- `speaking_session_id`
- `part_number`
- `status`
- `topic_id`
- `started_at`
- `ended_at`
- `prep_started_at`
- `prep_ended_at`
- `response_seconds`
- `metadata`

### `speaking_turns`

Every examiner/candidate turn is stored as a first-class row.

Fields:

- `id`
- `speaking_session_id`
- `speaking_session_part_id`
- `speaker_role` (`examiner`, `candidate`, `system`)
- `turn_index`
- `text_raw`
- `text_normalized` nullable
- `language_code`
- `started_at`
- `ended_at`
- `audio_asset_id` nullable
- `interruption_type` nullable
- `metadata`

`text_raw` is the source of truth for evidence. Mispronounced or malformed candidate wording must not be silently fixed there.

### `speaking_audio_assets`

Audio persistence index.

Fields:

- `id`
- `speaking_session_id`
- `speaking_session_part_id` nullable
- `speaker_role`
- `storage_path`
- `mime_type`
- `duration_ms`
- `channel_kind` (`full_mix`, `candidate_input`, `examiner_output`, `chunk_manifest`)
- `metadata`

### `speaking_events`

Audit/event stream for integrity, timing, and runtime state.

Fields:

- `id`
- `speaking_session_id`
- `event_type`
- `payload`
- `created_at`

Examples:

- `warning_issued`
- `repeat_question`
- `candidate_non_english`
- `integrity_terminated`
- `part_2_prep_started`
- `part_2_long_turn_started`

### `speaking_evaluations`

Stores final rubric result.

Fields:

- `id`
- `speaking_session_id`
- `overall_band`
- `fluency_band`
- `lexical_band`
- `grammar_band`
- `pronunciation_band`
- `integrity_penalty_applied`
- `integrity_penalty_reason`
- `summary_feedback`
- `strengths` JSON
- `critical_issues` JSON
- `pronunciation_issues` JSON
- `grammar_issues` JSON
- `lexical_issues` JSON
- `improvement_actions` JSON
- `deep_feedback_markdown`
- `evaluator_model`
- `rubric_version`
- `created_at`

### `speaking_part_scores`

Optional but recommended summary table.

Fields:

- `id`
- `speaking_session_id`
- `part_number`
- `fluency_band`
- `lexical_band`
- `grammar_band`
- `pronunciation_band`
- `overall_band`
- `feedback_summary`

Needed because the user specifically wants single-part sessions and combined full speaking support.

## Runtime Flow

### Session creation

1. User chooses a published speaking test and mode.
2. Backend creates `speaking_session` plus part rows.
3. Backend returns:
   - session ids
   - live model code
   - ephemeral token endpoint data
   - selected topic payload for current part
   - UI timing config

### Live connection

Frontend connects directly to Gemini Live using ephemeral token.

Reason:

- lower latency
- less backend media proxy complexity
- aligned with official recommended production pattern

### Turn gating

Default policy:

- when examiner audio is playing, candidate mic stream is not sent as exam content
- after examiner finishes, candidate turn opens
- client streams mic frames with VAD-enabled realtime input
- when candidate stops, turn closes and next examiner prompt is triggered

This is intentionally stricter than a casual assistant.

### Smart repair behavior

Allowed repair intents:

- `repeat_question`
- `audio_problem`
- `clarify_instruction`

Behavior:

- one repeat is allowed without penalty
- repeated repair abuse becomes warningable
- repair intents are logged in `speaking_events`

### Part behavior

#### Part 1

- 1 familiar topic cluster at a time
- 4 to 6 short questions
- examiner can ask short follow-ups if candidate answer is too thin

#### Part 2

- show cue card
- `60` seconds prep
- notes allowed only on-screen or local scratch expectation; no AI help
- examiner starts the long-turn prompt
- candidate gets up to configured long-turn window
- 1 or 2 short follow-up questions may be asked

#### Part 3

- abstract discussion tied to the Part 2 theme
- deeper “why / compare / future / policy / society” style follow-ups

## Integrity Policy

### Minor violation

Examples:

- brief non-English reply
- one off-topic drift
- candidate asks examiner for hints

Behavior:

- issue one warning
- log event
- continue if corrected

### Major violation

Examples:

- abuse, hate, sexual content, threats
- repeated refusal to answer in English
- obvious role-break or prompt-injection attempts
- repeated attempts to make the examiner score/coach/live-correct

Behavior:

- terminate session
- store termination reason
- send to grading with integrity penalty

### Penalty model

Do not blindly force every terminated session to the same score.

Recommended rule set:

- severe abusive termination before meaningful performance: cap overall band in `1.0-2.0`
- repeated manipulation with some usable speech evidence: cap in `2.0-3.0`
- repeated non-English/off-topic after warning: cap in `3.0-4.0`

The evaluator should apply policy-based caps, but still record underlying rubric observations where enough evidence exists.

## Transcript, Diarization, And Audio Evidence

### Diarization approach

Do not rely on post-hoc speaker clustering for the core two-speaker exam.

Instead:

- examiner audio is system-owned
- candidate audio is user-owned
- turn ownership gives deterministic diarization labels

Store:

- `speaker_role`
- turn start/end
- raw transcript per turn
- audio asset link per turn or per part

If later we need fine-grained overlap labeling, that can be added, but v1 does not need probabilistic diarization to satisfy the product requirement.

### Raw wording preservation

Critical requirement:

- candidate transcript evidence must keep the raw recognized wording
- evaluation feedback may include suggested correction
- original evidence must remain unchanged

This is required for trustworthy pronunciation and fluency review.

Recommended storage pattern:

- `text_raw`: exact transcript as received/stored
- `text_normalized`: optional cleaned comparison string for internal analysis only

## Grading Design

### Inputs

Evaluator receives:

- session metadata
- part structure
- full transcript by turn
- raw candidate phrasing
- warning/termination events
- candidate audio asset references
- live telemetry summary

### Hidden live telemetry

During live runtime, collect non-user-visible signals into backend summaries:

- response latency per turn
- interruptions
- silence duration
- repeated repairs
- VAD close/open frequency
- apparent unfinished clauses
- pronunciation suspicion markers from transcript/audio comparison summaries

These signals inform grading but are not shown live to the user.

### Output shape

Final result must include:

- overall band
- 4 criterion bands
- short summary
- strengths
- critical weaknesses
- exact quoted evidence snippets
- pronunciation observations
- grammar and lexical issues
- “what to fix next” recommendations
- deep feedback block

### Feedback tone

The user explicitly wants:

- strict and critical where needed
- correct praise where deserved
- full feedback and deep feedback

So evaluator prompt should demand:

- no sugarcoating
- no generic praise
- every praise claim must point to evidence
- every weakness must be actionable

## Prompting Strategy

### Live examiner system instruction

The live examiner prompt must encode:

- English only
- IELTS-speaking examiner persona
- exact part sequencing
- no coaching
- no rubric discussion
- no topic drift beyond allowed repair logic
- integrity policy hooks
- turn discipline

### Evaluator system instruction

The evaluator prompt must encode:

- official four speaking criteria
- part-aware interpretation
- integrity penalty rules
- preserve raw candidate wording in evidence quotes
- distinguish transcript uncertainty from genuine language weakness when necessary
- output structured JSON plus markdown feedback

## Admin Experience

Primary surface is `admin/`, not `frontend/app/admin/*`.

### Admin features

- speaking tests list/create/edit/publish/archive
- speaking topic bank CRUD
- linked Part 2 / Part 3 follow-up editor
- tag/topic filtering
- source annotation
- seed import visibility

### Suggested admin IA

- `Speaking Tests`
- `Speaking Topics`
- `Speaking Sessions`
- `Speaking Results`

### CRUD behavior

#### Topic bank CRUD

Admin can:

- create a Part 1 topic with multiple short questions
- create a Part 2 cue card with bullets
- create a Part 3 linked question cluster
- link Part 3 cluster to a follow-up key
- assign one or more topic categories

## Topic Category Taxonomy

Topic bank faqat “random prompt list” bo'lib qolmasligi kerak. Admin va seed logic quyidagi taxonomy bilan ishlaydi.

### Part 1 core categories

These are based on official familiar-topic framing plus recent reported pools.

- accommodation
- hometown
- work_study
- daily_routine
- hobbies_leisure
- food_cooking
- friends_social_life
- travel_holidays
- weather_seasons
- sport_fitness
- shopping
- music
- reading_news
- mobile_phones_apps
- clothes_fashion

Rationale:

- official IELTS framing repeatedly points to home, family, work, studies, interests, and common experiences
- recent reported pools show recurring stable Part 1 categories such as travel, weather, shopping, music, and phone usage

Sources:

- IELTS official familiar-topic framing: <https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking>
- Cathoven 2026 Part 1 rotation summary: <https://resources.cathoven.com/ielts-speaking/topics-2026>
- IDP speaking topics overview: <https://ielts.idp.com/bangladesh/about/news-and-articles/article-ielts-speaking-topics>

### Cross-part high-frequency thematic categories

These are the major abstract domains used especially for Part 2 and Part 3 seeding.

- education
- technology
- health
- environment
- work_careers
- society_community
- travel_tourism
- culture_traditions
- media_communication
- economy_public_policy

Rationale:

- recent 2026 speaking trend roundups repeatedly highlight technology, environment, education, and health as dominant Part 3 themes
- work, travel, media, and society also recur across reported Part 2 and Part 3 sets

Sources:

- Cathoven 2026 speaking trends: <https://resources.cathoven.com/ielts-speaking/topics-2026>
- Cathoven speaking vocabulary themes: <https://resources.cathoven.com/ielts-speaking/vocabulary>
- AllThingsIELTS 2026 topic roundup: <https://allthingsielts.com/ielts-speaking/speaking-topics-2026.php>
- IDP AI/topic vocabulary note showing AI crossing education, health, environment, employment, and society: <https://ielts.idp.com/prepare/article-master-ai-vocabulary-for-ielts-essays-and-speaking-topics>

### Category assignment rules

- every `speaking_topic` row must have at least one category tag
- Part 1 topics should use one primary category
- Part 2 cue cards may use one primary and one secondary category
- Part 3 follow-up clusters should mirror the linked Part 2 primary category and may add broader society/policy tags
- admin filters must support category-based search

#### Speaking test CRUD

Admin can:

- build full or part-only experiences
- choose fixed prompts or random pool strategy
- publish/archive versioned tests

## Seed Content Strategy

Seed at least:

- `20+` Part 1 topic groups
- `20+` Part 2 cue cards
- `20+` Part 3 follow-up clusters

Additionally, enforce category coverage:

- every active Part 1 core category must have at least `2` topic groups
- every active cross-part category must have at least `2` Part 2 cue cards
- every active cross-part category must have at least `2` Part 3 follow-up clusters

Seed content should be paraphrased and normalized into PrimeScore-owned wording inspired by recent reported themes such as:

- home and hometown
- work and study
- travel
- weather and seasons
- shopping
- music
- education
- health
- technology
- clothing/fashion

Part 2 and Part 3 should also include linked thematic sets, for example:

- memorable trip -> tourism, sustainability, transport
- useful skill -> education, online learning, future skills
- person with unusual clothes -> identity, fashion, conformity

### Minimum seed matrix

The initial seed should intentionally cover the taxonomy instead of clustering too many prompts into only a few popular domains.

Recommended minimum matrix:

- Part 1:
  - `accommodation`, `hometown`, `work_study`, `daily_routine`, `hobbies_leisure`, `food_cooking`, `friends_social_life`, `travel_holidays`, `weather_seasons`, `sport_fitness`, `shopping`, `music`, `reading_news`, `mobile_phones_apps`, `clothes_fashion`
  - at least `2` topic groups each
- Part 2:
  - `education`, `technology`, `health`, `environment`, `work_careers`, `society_community`, `travel_tourism`, `culture_traditions`, `media_communication`, `economy_public_policy`
  - at least `2` cue cards each
- Part 3:
  - `education`, `technology`, `health`, `environment`, `work_careers`, `society_community`, `travel_tourism`, `culture_traditions`, `media_communication`, `economy_public_policy`
  - at least `2` follow-up clusters each

This produces a healthier starting bank than a flat `20/20/20` count, while still satisfying the minimum count requirement.

## Cost Optimization

To keep Live cost under control:

- use one current-part context, not full historical essay-like replay
- avoid proactive listening outside candidate windows
- keep examiner prompts concise
- summarize prior turns into compact backend metadata if session resumes
- run final evaluation once after completion
- store audio once per part or merged stream, not every tiny chunk as separate permanent blob

## API Surface

Add dedicated active routes under `backend/app/api/routes/` for example:

- `GET /api/speaking/tests`
- `GET /api/speaking/tests/{id}`
- `POST /api/speaking/sessions`
- `GET /api/speaking/sessions/{id}`
- `POST /api/speaking/sessions/{id}/ephemeral-token`
- `POST /api/speaking/sessions/{id}/events`
- `POST /api/speaking/sessions/{id}/turns`
- `POST /api/speaking/sessions/{id}/complete`
- `GET /api/speaking/sessions/{id}/result`

Admin routes:

- `GET /api/admin/speaking/tests`
- `POST /api/admin/speaking/tests`
- `PATCH /api/admin/speaking/tests/{id}`
- `GET /api/admin/speaking/topics`
- `POST /api/admin/speaking/topics`
- `PATCH /api/admin/speaking/topics/{id}`
- `DELETE /api/admin/speaking/topics/{id}`

## Frontend UX Direction

UI should stay simple and explicit:

- one strong “exam room” layout
- no noisy analytics during the exam
- visible part state and timer
- transcript panel can be minimal or hidden during live exam if it feels too revealing
- result page can be richer with strengths/issues/deep feedback

Important UX rule:

- examiner speaking state must visibly lock candidate capture state
- user should understand when system is listening and when it is not

## Persistence And History

User should be able to:

- complete one part only
- complete all three parts in one session
- later view part-level and combined results

History integration should appear in the user app alongside other activity, but speaking records remain backed by dedicated tables/endpoints.

## Testing Strategy

### Backend

Add tests for:

- session creation
- topic selection logic
- integrity warning/escalation behavior
- termination caps
- result serialization
- admin CRUD validations

### Frontend

Given the repo has little frontend automation today, keep frontend tests targeted:

- speaking setup route behavior
- live-room state reducer/helpers if added
- result rendering for rubric feedback payload

### Manual verification

Must verify:

- mic gating while examiner speaks
- Part 2 prep timer
- single-part and full-test flows
- termination on major violation
- raw transcript evidence persists unfixed
- grading payload stores deep feedback

## Risks

- Gemini Live native-audio model is still preview-era technology; wrap provider integration behind a service module so model upgrades are isolated.
- Transcript quality and pronunciation inference will never be perfect; feedback must avoid pretending to have phonetic certainty when evidence is weak.
- Overly long live context can inflate cost; session summarization discipline is necessary.

## Rollout Order

1. Backend schema and CRUD
2. Seed content
3. User catalog/setup/result APIs
4. Live room bootstrap and browser session integration
5. Event/turn persistence
6. Final evaluator
7. Admin UI
8. Result/history polish

## Acceptance Criteria

- User can start a full speaking test or a single part from the frontend.
- Examiner runs through IELTS-like Part 1/2/3 logic in English only.
- Candidate speech is not treated as normal input while examiner is speaking.
- Topic bank is admin-manageable from `admin/`.
- Seed bank contains at least 20+ usable entries for each part.
- Backend stores deterministic speaker-labeled turns and audio references.
- Final grading returns official-criterion-style scores and deep actionable feedback.
- Major integrity violations auto-terminate the session and apply policy-based score caps.
- Raw evidence snippets preserve the candidate's spoken wording instead of silently correcting it.
