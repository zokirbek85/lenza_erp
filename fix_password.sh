#!/bin/bash
cd /opt/lenza_erp

# Backup
cp .env .env.backup_password

# Fix POSTGRES_PASSWORD (line 15)
sed -i '15s/.*/POSTGRES_PASSWORD="Nurmuhammad2017."/' .env

echo "Password updated! Checking:"
sed -n '15p' .env
