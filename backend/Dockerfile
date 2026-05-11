# syntax=docker/dockerfile:1.7

FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./pyproject.toml
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic
COPY app ./app
RUN --mount=type=cache,target=/root/.cache/pip pip install .
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh \
    && useradd --create-home --shell /bin/bash --uid 10001 appuser \
    && mkdir -p /var/lib/primescore/telegram \
    && chown -R appuser:appuser /app /var/lib/primescore
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
