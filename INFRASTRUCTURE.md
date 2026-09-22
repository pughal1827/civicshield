# CivicShield AI — Exact Infrastructure Requirements for Production

---

## OPTION A: FASTEST PATH (What You Can Deploy This Week)

| Layer | Service | Why | Cost/Month |
|-------|---------|-----|------------|
| Frontend hosting | **Vercel** (Hobby → Pro) | Next.js-native, zero-config deploy, edge CDN, auto HTTPS | Free → $20 |
| Backend API | **Vercel Serverless Functions** (Next.js API routes) | Same deploy, auto-scaling, no server management | Included |
| Database | **Supabase** (Free → Pro) | Managed PostgreSQL, built-in auth, row-level security, pgvector | Free → $25 |
| Auth | **Supabase Auth** (built-in) | Email/password, OAuth, session management — zero extra cost | Included |
| File storage | **Supabase Storage** | Image uploads for reports and resolution evidence | Free (50MB) → included |
| AI — NLP | **Google Gemini API** (gemini-3.6-flash) | Primary text classification, smart NLP fallback is local | Free tier → ~$50 |
| AI — Vision | **Run locally on CPU** (YOLOv8n + CLIP) | Both models run on the Next.js server for low traffic | $0 (included) |
| Cache | **None initially** | Not needed below 1,000 users/day | $0 |
| Queue | **None initially** | Synchronous processing is fine at low volume | $0 |
| Monitoring | **Sentry** (free tier) + **Vercel Analytics** | Error tracking + frontend performance | Free |
| **Total (pilot, 100-1,000 users/day)** | | | **~$45-95/month** |

**This is a real, working stack. You could deploy CivicShield today with this.**

---

## OPTION B: PRODUCTION SCALE (1,000–10,000 Users/Day)

Add these on top of Option A:

| Layer | Service | Why | Cost/Month |
|-------|---------|-----|------------|
| Frontend | **Vercel Pro** | Edge caching, faster builds, image optimization | $20 |
| Database | **Supabase Pro** | 8GB DB, 100GB storage, 100K MAU, pgBouncer connection pooling | $25 |
| Cache | **Redis Cloud** (free tier → paid) | Cache hotspot/recurrence/duplicate spatial query results — reduces DB load by 80% | Free → $5-25 |
| AI — Vision | **GPU EC2 instance** (g4dn.xlarge) OR **Hugging Face Inference Endpoints** | YOLO + CLIP on GPU: 10-50x faster than CPU. Essential above 500 reports/day. | $100-300 (AWS) or $50-200 (HF) |
| AI — NLP | **Google Gemini API** (Production tier) | Reliable SLA, higher rate limits | $100-300 |
| Queue | **BullMQ + Redis** | Async job queue for AI pipeline — web requests return instantly, AI processes in background | $0 (same Redis) |
| Monitoring | **Sentry Pro** + **Prometheus + Grafana** (self-hosted on same GPU instance) | Error tracking, AI latency monitoring, queue depth alerts | $0-26 |
| File CDN | **Vercel Image Optimization** (included) | Auto WebP/AVIF conversion, lazy loading | Included |
| **Total (production, 1,000–10,000 users/day)** | | | **~₹30,000-80,000/month** |

---

## OPTION C: ENTERPRISE SCALE (10,000–100,000+ Users/Day)

Full AWS architecture:

| Layer | AWS Service | Purpose | Cost/Month |
|-------|------------|---------|------------|
| Frontend hosting | **CloudFront + S3** (or Vercel Enterprise) | Global CDN, edge caching for static assets | $50-200 |
| Backend API | **API Gateway + ECS Fargate** (or EKS) | Containerized Next.js/API, auto-scaling containers | $200-1,000 |
| Load Balancer | **Application Load Balancer (ALB)** | Distributes traffic across API containers, health checks | $25-75 |
| Database | **RDS PostgreSQL** (or stay on Supabase Enterprise) | Managed PostgreSQL, automated backups, Multi-AZ | $500-3,000 |
| Cache | **ElastiCache Redis** (cluster mode) | Session store, spatial query cache, job queue backend | $100-500 |
| AI Microservice | **ECS Fargate + GPU instances** (g4dn.4xlarge cluster) | FastAPI workers running YOLO + CLIP + RF + IF | $1,000-5,000 |
| AI Job Queue | **Amazon SQS** | Decoupled job queue between API and AI workers | $10-50 |
| File Storage | **S3 + CloudFront** | Image uploads, resolution evidence, public CDN | $50-200 |
| Auth | **Cognito** (or keep Supabase Auth) | User management, MFA, social login | $0-50 |
| Search | **OpenSearch** (or pgvector on RDS) | Full-text search across reports, advanced embedding search | $100-300 |
| Monitoring | **CloudWatch + X-Ray + Sentry** | APM, distributed tracing, alerting | $100-300 |
| CI/CD | **GitHub Actions** | Automated testing, building, deployment | Free → $50 |
| DNS | **Route53** | Custom domain management | $1-5 |
| WAF | **AWS WAF** | DDoS protection, rate limiting, SQL injection blocking | $10-50 |
| **Total (enterprise, 10,000–100,000 users/day)** | | | **~₹2.5L-10L/month** |

---

## EXACT SERVER SPECIFICATIONS

### AI Inference Server (GPU)

| Stage | Instance | GPU | VRAM | vCPUs | RAM | Use |
|-------|----------|-----|------|-------|-----|-----|
| Stage 1 (dev/pilot) | CPU only | None | — | 2 | 4GB | Run YOLO + CLIP on CPU (slow but works for <100/day) |
| Stage 2 (production) | g4dn.xlarge | T4 | 16GB | 4 | 16GB | Single GPU, handles 500-1,000 reports/day |
| Stage 2 (high load) | g4dn.2xlarge | T4 | 16GB | 8 | 32GB | Higher throughput, batch processing |
| Stage 3 (scale) | g4dn.4xlarge | T4 | 16GB | 16 | 64GB | Heavy load, multiple models loaded |
| Stage 3 (cluster) | p3.2xlarge | V100 | 16GB | 8 | 61GB | Highest throughput, model parallel if needed |

**Recommendation for hackathon/prototype:** g4dn.xlarge (~$100/month on-demand, ~$30/month spot instance).

### Web/API Server

| Stage | Instance | vCPUs | RAM | Use |
|-------|----------|-------|-----|-----|
| Stage 1 | Vercel Hobby (shared) | Shared | Shared | Free, auto-scaling |
| Stage 1b | Vercel Pro | Shared | Shared | $20/month, edge functions |
| Stage 2 | ECS Fargate (1 vCPU, 2GB) | 1 | 2GB | Next.js API, scales to 2-5 containers |
| Stage 3 | EKS (3 nodes, t3.medium each) | 3×2 | 3×4GB | Full K8s cluster |

---

## DATABASE SETUP

### Option A: Supabase (Recommended for Prototype → Production)

| Component | Config |
|-----------|--------|
| PostgreSQL version | 15+ |
| Extensions | uuid-ossp, pgvector, postgis (Stage 2+) |
| Connection pooling | pgBouncer (included in Pro) |
| Backup | Automated daily (Pro), point-in-time recovery |
| Replication | Not needed until Stage 3 (read replicas) |

### Option B: AWS RDS (For Full AWS Stack)

| Component | Config |
|-----------|--------|
| Engine | PostgreSQL 15+ |
| Instance | db.t3.medium (Stage 2) → db.r6g.large (Stage 3) |
| Storage | 20GB GP3 → 500GB GP3 (auto-scaling) |
| Multi-AZ | Enabled (Stage 3) |
| Parameter group | Enable pgvector extension via aws_pgvector extension |

---

## AI PROVIDER SETUP

### Primary: Google Gemini API

| Detail | Configuration |
|--------|-------------|
| Model | gemini-3.6-flash |
| API key storage | Environment variable `GEMINI_API_KEY` — never in client code |
| Timeout | 3.5 seconds per request |
| Temperature | 0.1 (deterministic, low creativity) |
| Rate limits | Free: 15 RPM, Paid: 2,000+ RPM |
| Fallback chain | Gemini → Gemini backup → Smart NLP (local) |

### Local Models (Run on GPU Server)

| Model | Size | Runtime | Library |
|-------|------|---------|---------|
| YOLOv8n | 6MB | ultralytics (PyTorch) | ultralytics Python package |
| CLIP ViT-B/32 | 350MB | transformers (PyTorch) | Hugging Face transformers |
| Random Forest ×2 | ~1MB each | scikit-learn | joblib serialization |
| Isolation Forest | ~1MB | scikit-learn | joblib serialization |

**Total local model size:** ~360MB loaded into GPU VRAM (fits easily on a T4's 16GB).

---

## CACHE STRATEGY

### What to Cache (and Why)

| Data | Cache Key Pattern | TTL | Why |
|------|-------------------|-----|-----|
| Hotspot clusters | `hotspot:ward:{wardId}:date:{date}` | 1 hour | Expensive O(n²) clustering, doesn't change minute-to-minute |
| Recurrence patterns | `recurrence:category:{cat}:lat:{lat}:lng:{lng}:r:{radius}` | 6 hours | Historical analysis, very expensive query |
| Duplicate search results | `dup:category:{cat}:lat:{lat}:lng:{lng}:r:{radius}` | 15 minutes | Spatial radius query, frequent repeat searches |
| AI analysis results | `ai:report:{reportId}` | Forever (immutable) | Don't re-analyze same image |
| Department config | `dept:list` | 24 hours | Rarely changes |
| Session data | `sess:{sessionToken}` | 7 days (match session TTL) | Faster than DB lookup per request |

### Cache Invalidation

| Event | Action |
|-------|--------|
| New report created | Invalidate hotspot + duplicate keys for that ward |
| Incident resolved | Invalidate hotspot key for that area |
| New incident created | Invalidate recurrence for that category + location |
| Department config updated | Invalidate `dept:list` |

---

## SECURITY INFRASTRUCTURE

| Layer | Service/Tool | Configuration |
|-------|-------------|--------------|
| HTTPS/TLS | **Vercel/CloudFront** (auto-provisioned Let's Encrypt) | TLS 1.3, HSTS header |
| WAF | **AWS WAF** (Stage 3) or **Vercel DDoS Protection** (included) | Rate limiting, SQL injection rules, geo-blocking |
| API Rate Limiting | **Upstash Rate Limit** or **Vercel Edge Middleware** | 5 attempts per 60s per identifier on login/signup |
| Secrets Management | **AWS Secrets Manager** or **Supabase Vault** | API keys, database credentials, JWT secrets |
| CI/CD Security | **Dependabot** (GitHub) + **Snyk** | Automated dependency vulnerability scanning |
| Container Security | **Trivy** (if using Docker/K8s) | Image vulnerability scanning |

---

## EXACT DEPLOYMENT PIPELINE

### Stage 1: Deploy in 30 Minutes

```
1. Push code to GitHub
2. Connect repo to Vercel (one-click)
3. Set environment variables in Vercel dashboard:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - GEMINI_API_KEY
   - NODE_ENV=production
4. Run Supabase migration scripts (SQL files in /supabase/migrations/)
5. Deploy — Vercel auto-builds and deploys
6. Enable Supabase Auth (email provider in dashboard)
7. Done — app is live at your-domain.vercel.app
```

### Stage 2: Add AI Microservice

```
1. Create FastAPI project in /ai-service/
2. Write Dockerfile
3. Push to AWS ECR (Elastic Container Registry)
4. Deploy to ECS Fargate (1 task, g4dn.xlarge)
5. Set environment variables:
   - GEMINI_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
6. Add Redis (ElastiCache or Redis Cloud)
7. Update Next.js API routes to call FastAPI service instead of running AI inline
8. Add BullMQ queue between Next.js and FastAPI
9. Done — AI runs on GPU, web tier is unblocked
```

---

## COMPLETE COST BREAKDOWN (REAL NUMBERS)

### Pilot Phase (First 3 Months)

| Item | Service | Monthly Cost |
|------|---------|-------------|
| Hosting | Vercel Hobby/Pro | $0-20 |
| Database | Supabase Free/Pro | $0-25 |
| AI API | Google Gemini free tier | $0 |
| GPU (if needed) | AWS g4dn.xlarge (spot) | $30 |
| Domain | Namecheap/GoDaddy | $1 |
| Email (for auth) | Supabase (free) | $0 |
| Error tracking | Sentry free | $0 |
| **Total** | | **~$31-76/month (₹2,500-6,000/month)** |

### Production Phase (Months 4-12)

| Item | Service | Monthly Cost |
|------|---------|-------------|
| Hosting | Vercel Pro | $20 |
| Database | Supabase Pro | $25 |
| AI API | Google Gemini paid | $100 |
| GPU server | AWS g4dn.xlarge | $100 |
| Cache | Redis Cloud | $10 |
| Error tracking | Sentry | $26 |
| **Total** | | **~$281/month (₹23,000/month)** |

### Scale Phase (Year 2+)

| Item | Service | Monthly Cost |
|------|---------|-------------|
| Frontend | Vercel Enterprise | $500 |
| Backend | ECS Fargate cluster | $500 |
| Database | Supabase Team/Enterprise | $500 |
| GPU cluster | 3× g4dn.xlarge | $900 |
| Cache | ElastiCache Redis cluster | $300 |
| Queue | SQS | $50 |
| Storage | S3 + CloudFront | $100 |
| Monitoring | CloudWatch + Sentry | $200 |
| WAF + Security | AWS WAF + Shield | $100 |
| **Total** | | **~$3,150/month (₹2.6L/month)** |

---

## MINIMUM VIABLE INFRASTRUCTURE (For Hackathon Demo)

If you need to show a working demo RIGHT NOW with zero budget:

| Need | Solution |
|------|----------|
| Frontend | Vercel (free) or Netlify (free) |
| Backend | Vercel Serverless Functions (free, 100GB bandwidth) |
| Database | Supabase Free (500MB, 10K MAU — enough for demo) |
| Auth | Supabase Auth (free) |
| File storage | Supabase Storage (free, 50MB — enough for demo images) |
| AI — NLP | Google Gemini free tier (15 RPM — enough for demo) |
| AI — Vision | Run YOLO + CLIP on CPU (slow but free) |
| Cache | None needed for demo |
| Domain | Free .vercel.app subdomain |
| **Total cost: $0** | **Fully functional demo** |

---

## ENVIRONMENT VARIABLES CHECKLIST

```
# Supabase (database + auth + storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Google Gemini (AI classification)
GEMINI_API_KEY=AIzaSyxxx...

# AI Service (Stage 2+ — FastAPI microservice)
AI_SERVICE_URL=http://xxx.elasticbeanstalk.com
AI_QUEUE_REDIS_URL=redis://xxx.elasticache.amazonaws.com:6379

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://civicshield.vercel.app
SESSION_SECRET=<256-bit random hex>
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=60000

# Storage (Stage 3 — S3)
AWS_REGION=ap-south-1
AWS_S3_BUCKET=civicshield-uploads
AWS_ACCESS_KEY_ID=AKIAxxx...
AWS_SECRET_ACCESS_KEY=xxx...

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```
