# Auto Deploy Manual (Lenza ERP, Docker Blue/Green)

## Prerequisites
- Initial setup done (`./deploy.sh` already executed once).
- Secrets in `/opt/lenza_erp/.env` (or fallback `/opt/lenza_erp/deploy/.env`).
- DNS A record for `erp.lenza.uz` points to the server; nginx/certbot already configured.
- User running commands has Docker permissions (or use root/sudo).

## Deploy a New Release
1. SSH to the server: `ssh user@server`.
2. Go to project: `cd /opt/lenza_erp`.
3. Pull code: `git pull origin main` (or your target branch).
4. Deploy to the inactive stack (example: green): `INITIAL_STACK=green ./update.sh`.
   - Wait for image builds and health checks to finish.

## Run Migrations (only if needed manually)
- `docker compose -f deploy/docker-compose.green.yml exec -T backend_green python manage.py migrate --noinput`

## Smoke Tests on the New Stack
- Backend health (inside network): `curl -f http://lenza_backend_green:8000/api/health/`
- Frontend container: `curl -I http://lenza_frontend_green`

## Switch Live Traffic
- Point nginx to the new stack (example helper): `./deploy/switch_stack.sh green`
- Reload: `nginx -t && systemctl reload nginx`

## Verify Live
- Open `https://erp.lenza.uz` and `https://erp.lenza.uz/api/health/`
- Logs: `docker compose -f deploy/docker-compose.green.yml logs -f`

## Cleanup Old Stack (after confidence)
- If green is live and stable, stop old blue: `docker compose -f deploy/docker-compose.blue.yml down`
- (Optional) keep old stack running for quick rollback.

## Rollback
- Switch nginx upstream back to the previous stack and reload nginx.

## SSL Renewal Check
- Renewal is automated. Test anytime: `certbot renew --dry-run`
