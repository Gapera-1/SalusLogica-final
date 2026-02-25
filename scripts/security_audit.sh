#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[security] repo: ${ROOT_DIR}"

echo "[security] backend: bandit + pip-audit + django check --deploy"
(
  cd "${ROOT_DIR}/backend"
  python -m pip install -r requirements.txt -r requirements-dev.txt
  python -m pip_audit -r requirements.txt
  python -m bandit -r apps saluslogica -ll
  python manage.py check --deploy || true
)

echo "[security] web: npm audit"
(
  cd "${ROOT_DIR}/medicine-reminder"
  npm ci
  npm audit --audit-level=high
)

echo "[security] mobile: pnpm audit"
(
  cd "${ROOT_DIR}/Mobile"
  corepack pnpm install --frozen-lockfile
  corepack pnpm audit --audit-level=high
)

echo "[security] done"

