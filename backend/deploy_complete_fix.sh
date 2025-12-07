#!/bin/bash
# Complete deployment for tmp directory fix and status stats feature

echo " Starting deployment..."

cd /opt/lenza_erp

echo " Pulling latest changes..."
git pull origin main

echo " Creating tmp directory on host..."
mkdir -p /var/www/lenza_erp/media/tmp
chmod 777 /var/www/lenza_erp/media/tmp

echo " Rebuilding backend container..."
docker-compose build backend

echo " Restarting containers..."
docker-compose up -d backend

echo " Waiting for backend to start..."
sleep 10

echo " Verifying tmp directory..."
docker-compose exec -T backend ls -la /app/media/ | grep tmp

echo " Testing orders status stats endpoint..."
docker-compose exec -T backend python manage.py shell -c "
from orders.views import OrderStatusStatAPIView
print('OrderStatusStatAPIView imported successfully')
"

echo " Checking current order stats..."
docker-compose exec -T backend python manage.py shell -c "
from orders.models import Order
from django.db.models import Count
stats = Order.objects.values('status').annotate(count=Count('id'))
print('Order stats:', dict((item['status'], item['count']) for item in stats))
"

echo " Checking backend logs..."
docker-compose logs backend --tail=30

echo " Deployment complete!"
