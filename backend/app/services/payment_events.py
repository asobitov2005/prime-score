"""In-process SSE event bus for real-time payment notifications.

Uses asyncio.Queue per connected user — lightweight, no Redis required.
Each user can have multiple SSE connections (multiple tabs).
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)


class PaymentEventBus:
    """Simple in-process pub/sub for payment SSE streams."""

    def __init__(self) -> None:
        self._subscribers: dict[UUID, list[asyncio.Queue[str | None]]] = defaultdict(list)

    def subscribe(self, user_id: UUID) -> asyncio.Queue[str | None]:
        """Create a new subscription queue for a user."""
        queue: asyncio.Queue[str | None] = asyncio.Queue(maxsize=64)
        self._subscribers[user_id].append(queue)
        logger.debug("SSE subscriber added for user %s (total: %d)", user_id, len(self._subscribers[user_id]))
        return queue

    def unsubscribe(self, user_id: UUID, queue: asyncio.Queue[str | None]) -> None:
        """Remove a subscription queue for a user."""
        queues = self._subscribers.get(user_id)
        if queues is None:
            return
        try:
            queues.remove(queue)
        except ValueError:
            pass
        if not queues:
            del self._subscribers[user_id]
        logger.debug("SSE subscriber removed for user %s", user_id)

    def publish(self, user_id: UUID, event: str, data: dict[str, Any]) -> None:
        """Publish an SSE event to all connected tabs/clients for a user."""
        queues = self._subscribers.get(user_id)
        if not queues:
            return
        payload = _format_sse(event, data)
        stale: list[asyncio.Queue[str | None]] = []
        for queue in queues:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                stale.append(queue)
        # Drop stale/overflowed queues
        for queue in stale:
            try:
                queues.remove(queue)
            except ValueError:
                pass
        logger.info("SSE event '%s' sent to %d client(s) for user %s", event, len(queues), user_id)

    def publish_many(self, user_ids: list[UUID], event: str, data: dict[str, Any]) -> None:
        """Publish an SSE event to multiple users."""
        for user_id in user_ids:
            self.publish(user_id, event, data)

    def has_subscribers(self, user_id: UUID) -> bool:
        """Check if a user has any active SSE connections."""
        return bool(self._subscribers.get(user_id))


def _format_sse(event: str, data: dict[str, Any]) -> str:
    """Format a Server-Sent Event message string."""
    json_data = json.dumps(data, default=str)
    return f"event: {event}\ndata: {json_data}\n\n"


# Global singleton — imported and shared across the app
payment_event_bus = PaymentEventBus()
