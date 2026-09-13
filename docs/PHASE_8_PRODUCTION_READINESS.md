# Phase 8 — Production Readiness & Architecture Documentation

## Executive Summary
This document details the production architecture, security controls, error isolation, storage mode configuration, AI fallback mechanics, file upload security, and operational deployment requirements for **CivicShield AI**.

---

## 1. System Mode Configuration (`CIVICSHIELD_MODE`)

CivicShield AI supports two explicit execution modes:

### A. DEMO Mode (`CIVICSHIELD_MODE=demo`)
- **Storage Backend**: Default in-memory mock store (`mockStore`) unless Supabase credentials are explicitly provided and configured.
- **Use Case**: Prototype demonstrations, local dev server testing, synthetic data presentation, zero-dependency evaluation.
- **Data Status**: All displayed incidents and analytics in DEMO mode are marked as **Synthetic Demonstration Data**.

### B. PRODUCTION Mode (`CIVICSHIELD_MODE=production`)
- **Storage Backend**: Supabase PostgreSQL database + pgvector + Supabase Storage.
- **Fail-Safe Policy**: If Supabase or the underlying database connection is unconfigured or unreachable, the application **FAILS CLOSED** and returns **HTTP 503 Service Unavailable** (`"Service temporarily unavailable. Please try again."`).
- **No Mock Fallback**: Under `PRODUCTION` mode, user submissions will **NEVER** silently fall back to mock memory or report fake success.

---

## 2. Authentication & Session Architecture

- **Password Hashing**: `scrypt` key derivation function with random unique salt (`scrypt$<saltHex>$<derivedKeyHex>`).
- **Session Tokens**: 64-character cryptographically secure random hexadecimal strings.
- **Cookies**: HTTP-only, `SameSite=Strict`, `Secure=true` in production (`auth_token`).
- **Role Resolution**: Server-side user identity resolution (`CITIZEN`, `AUTHORITY`, `ADMIN`). Query parameters, client request bodies, and custom headers claiming roles are strictly ignored.
- **Architecture Limitation**: The current session store is in-memory (`mockSessionStore`), suitable for single-node deployments. Multi-instance production clusters require migrating to shared persistent session infrastructure (e.g., Redis or database-backed session tables).

---

## 3. Secret Isolation & Data Privacy

- **Server-Only Secrets**: `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are isolated exclusively in server API routes and server modules. None are exposed through `NEXT_PUBLIC_*` variables.
- **PII Exposure Prevention**: Citizen email addresses, phone numbers, and password hashes are stripped from public incident queries.
- **Tracking Code Security**: Citizen report tracking UUIDs (`tracking_code`) are private to the reporting user.

---

## 4. File Upload & Storage Security (`/api/upload`)

- **Maximum Size**: 10MB (`10 * 1024 * 1024` bytes). Zero-byte and oversized files are rejected with HTTP 400.
- **MIME Type Validation**: Restricted to `image/jpeg`, `image/png`, `image/webp`.
- **Extension Validation**: Safe whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`). Dangerous executable extensions (`.exe`, `.sh`, `.bat`, `.php`, `.js`) are strictly forbidden.
- **Filename Sanitization**: Uploaded filenames are sanitized on the server to prevent directory traversal (`upload_<timestamp>_<sanitized_name>`).

---

## 5. AI Reliability & Fallback Architecture

- **Multimodal AI Analysis**: Powered by Google Gemini (`@google/genai`). Bounded with try-catch safety handlers. Missing API keys or Gemini timeouts invoke deterministic fallback classification without crashing report submission.
- **Vector Embeddings**: Powered by `text-embedding-004` (768d). If embedding generation fails, similarity values remain `null`. Missing embeddings **NEVER** invent artificial similarity or auto-merge duplicates.

---

## 6. Health & Observability Monitoring

- **Health Endpoint**: `GET /api/health` returns status `200 OK` in DEMO mode or active PRODUCTION mode. Unconfigured database under PRODUCTION mode yields `503 Service Unavailable`.
- **Structured Server Logger**: `lib/logging/logger.ts` logs structured JSON events while automatically redacting passwords, session tokens, service role keys, API keys, phone numbers, and tracking UUIDs.

---

## 7. Pre-Deployment Requirements & Limitations

1. **Database Migration**: Apply `supabase/migrations/001_initial_schema.sql` to production Supabase instance.
2. **Environment Variables**: Configure all required secrets in production server host (.env).
3. **Session Store Scaling**: Upgrade from in-memory session map to persistent session storage for horizontally scaled clusters.
