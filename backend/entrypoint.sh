#!/bin/bash

# Exit on error
set -e

echo "Starting Lenza ERP Backend..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up!"

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Compile translation messages if .po files exist
if ls locale/*/LC_MESSAGES/*.po 1> /dev/null 2>&1; then
  echo "Compiling translation messages..."
  python manage.py compilemessages --ignore=.venv || true
fi

# Create superuser if it doesn't exist (optional, for initial setup)
# python manage.py shell -c "from users.models import User; User.objects.create_superuser('admin', 'admin@lenza.uz', 'admin123') if not User.objects.filter(username='admin').exists() else None"

# Start Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
