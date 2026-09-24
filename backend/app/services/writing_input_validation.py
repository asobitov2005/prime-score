"""Shared non-retryable Writing input failure contract for workers and routes."""

WRITING_INPUT_REJECTED_PREFIX = "WRITING_INPUT_REJECTED: "


class WritingInputRejected(ValueError):
    retryable = False
    code = "writing_no_assessable_answer"

    def __init__(self, verdict: dict):
        self.task_fit = verdict
        super().__init__(
            WRITING_INPUT_REJECTED_PREFIX
            + "No assessable answer was found. Submit your own response to the assigned task, "
            + "not only a question or instructions. " + verdict["explanation"]
        )
