#!/usr/bin/env bash
# Start script for Render - runs Django + Celery together

# Exit on error
set -o errexit

echo "Starting SalusLogica services..."

# Start Celery worker in background
echo "Starting Celery worker..."
celery -A saluslogica worker --loglevel=info --concurrency=2 &
CELERY_WORKER_PID=$!

# Start Celery beat in background
echo "Starting Celery beat..."
celery -A saluslogica beat --loglevel=info &
CELERY_BEAT_PID=$!

# Start Django with Gunicorn (foreground process)
echo "Starting Django server..."
exec gunicorn saluslogica.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --threads 2 --timeout 60

# Cleanup function (not reached due to exec, but good practice)
cleanup() {
    echo "Shutting down services..."
    kill $CELERY_WORKER_PID 2>/dev/null || true
    kill $CELERY_BEAT_PID 2>/dev/null || true
}
trap cleanup EXIT
