# Production Online Deployment Guide

## 1. Architecture Deployment Overview
The application consists of three decoupled components:
1. **Frontend**: Static React single-page application built with Vite (Deployable on Vercel, Netlify, AWS S3/CloudFront, or Docker Nginx).
2. **Backend**: Express REST API in Node.js/TypeScript (Deployable on Render, Railway, DigitalOcean App Platform, Fly.io, or AWS EC2).
3. **Database**: Managed MySQL 8.0 instance (AWS RDS, PlanetScale, Aiven, Clever Cloud, or Railway MySQL).

---

## 2. Option A: 1-Click Containerized Deployment (Docker Compose)
The easiest way to run the full application with MySQL, Backend, and Frontend locally or on a virtual private server (e.g., Ubuntu on DigitalOcean, AWS EC2):

```bash
# Clone the repository
git clone https://github.com/your-username/smart-library-management.git
cd smart-library-management

# Start all three services in background
docker-compose up -d

# Verify services are running
docker-compose ps
```
- Frontend UI: `http://localhost:5173`
- Backend REST API: `http://localhost:5000/api`
- MySQL 8.0: `localhost:3306`

---

## 3. Option B: Cloud Hosting Services

### 3.1 Step 1: Managed MySQL Database (e.g. Aiven, Railway, or AWS RDS)
1. Create a MySQL 8.0 instance on your preferred cloud provider.
2. Note your database credentials:
   - `DATABASE_HOST`
   - `DATABASE_PORT` (usually 3306)
   - `DATABASE_NAME` (`smart_library`)
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`
3. Connect with any MySQL client (e.g. MySQL Workbench, DBeaver, or CLI) and run:
   - `database/schema.sql` (Creates normalized tables and indexes)
   - `database/seed.sql` (Inserts initial locations, books, and default accounts)

---

### 3.2 Step 2: Backend REST API (Render / Railway)
1. Link your Git repository on [Render](https://render.com) or [Railway](https://railway.app).
2. Set root directory to `backend`.
3. Set build command:
   ```bash
   npm install && npm run build
   ```
4. Set start command:
   ```bash
   npm run start
   ```
5. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default for cloud provider)
   - `DB_TYPE`: `mysql`
   - `DATABASE_HOST`: `<your-db-host>`
   - `DATABASE_PORT`: `3306`
   - `DATABASE_NAME`: `smart_library`
   - `DATABASE_USER`: `<your-db-user>`
   - `DATABASE_PASSWORD`: `<your-db-password>`
   - `JWT_SECRET`: `<generate-a-strong-random-key>`
   - `FRONTEND_URL`: `https://your-frontend-domain.vercel.app`
6. Verify deployment by hitting: `https://your-api.onrender.com/api/health`

---

### 3.3 Step 3: Frontend Single Page Application (Vercel / Netlify)
1. Link the repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Set Root Directory to `frontend`.
3. Framework Preset: `Vite`.
4. Build Command:
   ```bash
   npm run build
   ```
5. Output Directory:
   ```bash
   dist
   ```
6. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-api.onrender.com/api`
7. Click **Deploy**. Your smart library application will be live online!
