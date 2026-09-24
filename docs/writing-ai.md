# Writing AI

Writing text models are selected by the existing database-backed AI Workspace
bindings: `writing_grader`, `writing_improver`, and `writing_roast`. GPU.uz uses
the OpenAI-compatible text endpoint; it is not an image or audio provider in this
integration. Keep `writing_image_summary` bound to a supported vision model.

## Configure

From `backend/`, with the intended `DATABASE_URL` and deployed application code:

```sh
python -m app.scripts.configure_writing_gpu --model google/gemma-4-31B-it --activate
```

The key is requested without terminal echo (or read from `GPU_UZ_API_KEY`). Model
discovery and structured-output inference must succeed before the transaction
updates provider/model records and the three text bindings. Omitting `--activate`
only registers the provider and models. No user, test, payment or essay is changed.
Back up the database outside the repository before production configuration.
Do not insert the new provider into a database still served by old application
code. Configuration caches expire after 30 seconds.

## Verify

```sh
python -m app.scripts.smoke_writing --task-type task_1
python -m app.scripts.smoke_writing --task-type task_2
python -m app.scripts.smoke_writing --task-type task_2 --case prompt-only
python -m app.scripts.smoke_writing --task-type task_2 --case wrong-task
```

These explicit live checks use synthetic text and configured bindings/prompts.
They create no submissions, users, tests, or notifications. They exercise the
provider and report stage timing/token usage; they do not prove grading accuracy.
Unit tests mock network responses and require no provider key.

Official IELTS descriptors control assessment. Configured benchmarks are
supplementary references, not evidence that an independent calibration or audit
was performed. Feedback remains an AI estimate, not an official IELTS result.
Validate score accuracy against expert-scored essays before making accuracy claims.

Prompt-only input receives a non-retryable `WRITING_INPUT_REJECTED:` failure;
the original text remains saved. An assessable but off-topic response is still
graded against the assigned task and carries a visible task-fit warning. It does
not receive an invented blanket-zero penalty. Stage timings/token counts are
stored in the evaluation-run audit JSON, not a fabricated confidence score.

Update known prompt defaults through `python -m app.services.writing_prompt_defaults
--profile-id UUID` (preview), then add `--publish --expected-version N`. The
publisher keeps the previous profile, preserves custom entries and records an
audit event. The bundled official descriptor policy controls conflicting advice.
