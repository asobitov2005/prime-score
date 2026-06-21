"""seed speaking topics

Revision ID: 20260614_000049
Revises: 20260614_000048
Create Date: 2026-06-14
"""

from __future__ import annotations

import json
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260614_000049"
down_revision: str | None = "20260614_000048"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


TOPICS = [
    (1, "Hometown", "Let's talk about your hometown. What is it like?", [], ["home", "daily-life"], 10),
    (1, "Work or Study", "Do you work or are you a student?", [], ["study", "work"], 20),
    (1, "Daily Routine", "What do you usually do on a normal weekday?", [], ["daily-life"], 30),
    (1, "Technology", "How often do you use technology in your daily life?", [], ["technology"], 40),
    (2, "A Helpful Person", "Describe a person who helped you.", ["who this person is", "how they helped you", "why you remember this help", "and explain how you felt about it"], ["people"], 50),
    (2, "A Place You Enjoy", "Describe a place where you like to spend time.", ["where it is", "what you do there", "who you go there with", "and explain why you enjoy it"], ["place"], 60),
    (2, "A Useful Object", "Describe something useful that you use often.", ["what it is", "when you got it", "how you use it", "and explain why it is useful"], ["objects", "technology"], 70),
    (2, "A Skill You Learned", "Describe a skill that you learned.", ["what the skill was", "why you learned it", "how you practiced", "and explain how you use it now"], ["skills", "education"], 80),
    (3, "Education", "Let's discuss education. How has education changed in recent years?", [], ["education"], 90),
    (3, "Technology and Society", "What are the advantages and disadvantages of relying on technology?", [], ["technology", "society"], 100),
    (3, "Work Culture", "Do you think people work harder today than in the past?", [], ["work", "society"], 110),
    (3, "Cities", "What problems do large cities usually have?", [], ["cities", "society"], 120),
]


def upgrade() -> None:
    for part, title, prompt, bullets, tags, rank in TOPICS:
        op.execute(
            sa.text(
                """
                INSERT INTO speaking_topics (
                    id, part_number, topic_title, prompt_text, bullet_points,
                    difficulty_label, category_tags, source_kind, source_note,
                    active, seed_rank, metadata, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid(), :part_number, :topic_title, :prompt_text,
                    CAST(:bullet_points AS jsonb), NULL,
                    CAST(:category_tags AS jsonb), 'seed', 'PrimeScore speaking starter set',
                    true, :seed_rank, '{}'::jsonb, now(), now()
                )
                ON CONFLICT DO NOTHING
                """
            ).bindparams(
                sa.bindparam("part_number", value=part),
                sa.bindparam("topic_title", value=title),
                sa.bindparam("prompt_text", value=prompt),
                sa.bindparam("bullet_points", value=json.dumps(bullets)),
                sa.bindparam("category_tags", value=json.dumps(tags)),
                sa.bindparam("seed_rank", value=rank),
            )
        )


def downgrade() -> None:
    op.execute("DELETE FROM speaking_topics WHERE source_kind = 'seed' AND source_note = 'PrimeScore speaking starter set'")
