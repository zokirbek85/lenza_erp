# Docker Deployment - Important Notes

## ⚠️ Before Deploying

### 1. Change Default Passwords

**CRITICAL:** Replace all default passwords in production!

Edit `.env.backend`:
```env
DJANGO_SECRET_KEY=generate-a-secure-random-key-minimum-50-characters
POSTGRES_PASSWORD=your-secure-database-password-change-this
```

Edit `.env.db`:
```env
POSTGRES_PASSWORD=your-secure-database-password-change-this
```

**Generate secure SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 2. GitHub Secrets Required

Add these secrets in GitHub repository settings:

- `VPS_HOST` → 45.138.159.195
- `VPS_USER` → root
- `VPS_SSH_KEY` → Your SSH private key

### 3. Environment Files Should NOT Be Committed

Add to `.gitignore`:
```
.env.backend
.env.db
.env
.env.local
.env.production
*.env
```

**Reason:** Contains sensitive passwords and secrets

---

## 🚀 Quick Start

### Local Development

```bash
docker compose build
docker compose up -d
docker compose exec backend python manage.py createsuperuser
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/

### VPS Production Deployment

See detailed instructions in:
- **[VPS_DEPLOY.md](./VPS_DEPLOY.md)** - Complete VPS setup
- **[DOCKER_DEPLOY_GUIDE.md](./DOCKER_DEPLOY_GUIDE.md)** - Full Docker guide

---

## 📝 Files Created

### Docker Configuration
- ✅ `backend/Dockerfile` - Backend container
- ✅ `backend/entrypoint.sh` - Startup script
- ✅ `frontend/Dockerfile` - Frontend container
- ✅ `frontend/nginx.conf` - Frontend Nginx config
- ✅ `docker-compose.yml` - Container orchestration

### Environment & Configuration
- ✅ `.env.backend` - Backend environment variables
- ✅ `.env.db` - Database credentials
- ✅ `nginx/erp.lenza.uz` - VPS Nginx reverse proxy

### CI/CD & Documentation
- ✅ `.github/workflows/deploy.yml` - Auto-deployment
- ✅ `VPS_DEPLOY.md` - VPS deployment guide
- ✅ `DOCKER_DEPLOY_GUIDE.md` - Complete Docker guide

---

## 🔐 Security Checklist

- [ ] Change `DJANGO_SECRET_KEY` in `.env.backend`
- [ ] Change `POSTGRES_PASSWORD` in both `.env.backend` and `.env.db`
- [ ] Add `.env*` files to `.gitignore`
- [ ] Configure firewall on VPS (ports 22, 80, 443 only)
- [ ] Setup SSL certificate with Certbot
- [ ] Use SSH keys instead of passwords
- [ ] Regular security updates: `apt update && apt upgrade`

---

## 📖 Documentation

1. **[DOCKER_DEPLOY_GUIDE.md](./DOCKER_DEPLOY_GUIDE.md)** - Complete guide with:
   - Architecture overview
   - Local development setup
   - GitHub Secrets configuration
   - CI/CD pipeline details
   - Troubleshooting guide
   - Maintenance procedures

2. **[VPS_DEPLOY.md](./VPS_DEPLOY.md)** - Step-by-step VPS deployment:
   - Server setup
   - Docker installation
   - Application deployment
   - Nginx reverse proxy
   - SSL certificate setup
   - Maintenance commands

---

## 🐛 Common Issues

### 1. GitHub Actions: Permission Denied
→ Check `VPS_SSH_KEY` secret is correctly configured

### 2. Container Won't Start
→ Check logs: `docker compose logs backend`

### 3. Database Connection Error
→ Verify passwords match in `.env.backend` and `.env.db`

### 4. Nginx 502 Bad Gateway
→ Ensure backend container is running: `docker compose ps`

See **[DOCKER_DEPLOY_GUIDE.md](./DOCKER_DEPLOY_GUIDE.md)** for detailed troubleshooting.

---

## 🎯 Next Steps

1. Review and update `.env.backend` with production values
2. Add GitHub Secrets for CI/CD
3. Follow [VPS_DEPLOY.md](./VPS_DEPLOY.md) for VPS setup
4. Test deployment by pushing to `main` branch
5. Configure SSL certificate
6. Set up automated backups

---

**Ready to deploy! 🚀**
