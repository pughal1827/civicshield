# CivicShield AI — Technical Deep-Dive for Judges

## What This Project Is

CivicShield AI is an AI-powered civic issue reporting and management platform built with **Next.js 16 + React 19 + TypeScript**. It enables citizens to report civic problems (potholes, garbage overflow, broken streetlights, electrical hazards, etc.) through a mobile-first web interface. The platform automatically classifies, verifies, prioritizes, routes, and clusters these reports using a multi-layered AI pipeline.

---

## Architecture Overview

```
Citizen Uploads Image + Description
           │
           ▼
┌─────────────────────────────────────────────────────┐
│         4-Tier AI Verification Pipeline              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────┐ │
│  │  TIER 1  │  │  TIER 2  │  │  TIER 3  │  │T4   │ │
│  │  YOLOv8  │  │  CLIP    │  │   RF     │  │  IF  │ │
│  │  Object  │  │ Cross-   │  │ Category │  │Anomal│ │
│  │Detection │  │Modal     │  │&Severity │  │Detect│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────┘ │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│          Gemini-Powered NLP Classification           │
│    (Primary) with Smart NLP Rule-Based Fallback      │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│          Intelligence & Analytics Layer               │
│  Duplicate Detection | Hotspot Clustering |          │
│  Recurrence Analysis | SLA Monitoring | Escalation   │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│          Supabase Backend (PostgreSQL + RLS)          │
│   Vector Embeddings | Real-time Auth | File Storage   │
└─────────────────────────────────────────────────────┘
           │
           ▼
    Citizens | Workers | Authorities (3 role dashboards)
```

---

## Core AI Algorithms

### 1. YOLOv8 — Real-Time Object Detection (TIER 1)

**What it does:** Detects physical objects in uploaded citizen images (vehicles, people, bottles, debris, etc.) to ground-truth verify what's actually in the scene.

**Algorithm:**
- Uses **YOLOv8n** (nano variant, ~6MB) — a single-shot detector that divides the image into a grid and predicts bounding boxes with class probabilities in one forward pass.
- Non-Maximum Suppression (NMS) with configurable IoU threshold (0.45) to eliminate overlapping duplicate detections.
- Confidence threshold of 0.35 filters weak predictions.
- Falls back gracefully to CPU when GPU is unavailable (auto-detects CUDA/MPS/CPU).
- COCO-pretrained class IDs are mapped to civic hazard labels (e.g., car/bus/truck → "vehicle").

**Why it matters:** Converts raw pixel data into structured, interpretable detections that feed into the feature vector for downstream ML models.

---

### 2. CLIP — Cross-Modal Semantic Verification (TIER 2)

**What it does:** Verifies whether the uploaded *image* actually matches the citizen's *text description* — preventing mismatched or fraudulent submissions.

**Algorithm:**
- Uses **OpenAI CLIP (ViT-B/32)** — a Vision Transformer trained on 400M image-text pairs.
- Image is processed through a Vision Transformer (ViT) patch encoder → 512-dim embedding.
- Text description is tokenized (max 77 tokens, truncated) and encoded through a Transformer text encoder → 512-dim embedding.
- Both embeddings are **L2-normalized**, so cosine similarity reduces to a simple dot product.
- Three-way classification:
  - **MATCHED** (score >= 0.35): Image and text describe the same thing.
  - **SUSPICIOUS** (0.25 ≤ score < 0.35): Possible mismatch, flagged for moderation.
  - **MISMATCHED** (score < 0.25): Image and text are unrelated → hard reject.

**Why it matters:** This is the fraud/spam gate. It catches people uploading random stock photos or unrelated images to game the system.

---

### 3. Random Forest — Category & Severity Classification (TIER 3)

**What it does:** Predicts the civic incident category (12 classes) and severity level (LOW/MEDIUM/HIGH/CRITICAL) from a multi-modal feature vector.

**Algorithm:**
- **Two Random Forest classifiers** (scikit-learn `RandomForestClassifier`) trained independently:
  - **Category classifier**: 100 trees, max depth 12, trained on 2000 synthetic samples → 12-class output.
  - **Severity classifier**: 100 trees, max depth 10 → 4-class output.
- **10-dimensional feature vector** combining signals from all tiers:
  | Index | Feature | Source |
  |-------|---------|--------|
  | 0 | CLIP similarity score | TIER 2 |
  | 1 | YOLO top confidence | TIER 1 |
  | 2 | YOLO detection count (norm) | TIER 1 |
  | 3 | Has relevant civic object (binary) | TIER 1 |
  | 4 | Text length (normalized) | Text analysis |
  | 5 | Civic keyword density | Text analysis |
  | 6 | Sentiment score (-1 to +1) | Text analysis |
  | 7 | Image aspect ratio | Image stats |
  | 8 | Image brightness | Image stats |
  | 9 | Image edge density | Image stats |

**Additional text features extracted:**
- 36 civic-specific keywords (pothole, garbage, leak, sparking, etc.) → keyword density score.
- Sentiment analysis: urgent/negative words (danger, emergency, broken) vs. positive (fixed, resolved) → sentiment score from -1 to +1.

**Category confirmation logic:** The RF prediction is "confirmed" if it matches the citizen's self-selected category OR if CLIP returned MATCHED. This creates a self-consistency check.

---

### 4. Isolation Forest — Anomaly & Fraud Detection (TIER 4)

**What it does:** Identifies spam, fraud, corrupted files, memes, screenshots, and out-of-distribution submissions that slip through the other tiers.

**Algorithm:**
- **Isolation Forest** (scikit-learn, 150 trees, contamination=0.20) trained exclusively on normal civic images — an unsupervised anomaly detection approach.
- Isolation Forest works by randomly partitioning data; anomalies are isolated in fewer splits than normal points.
- **10-dimensional feature vector** with specialized civic-focused features:
  | Index | Feature | Purpose |
  |-------|---------|---------|
  | 0 | Brightness (norm) | Detect blank/overexposed images |
  | 1 | Edge density (Laplacian variance) | Blank images have near-zero edges |
  | 2 | Extreme aspect ratio | Screenshots, cropped images |
  | 3 | Text length (norm) | Empty descriptions are suspicious |
  | 4 | CLIP similarity | Very low = content mismatch |
  | 5 | YOLO confidence | No recognizable objects |
  | 6 | YOLO count (norm) | Too many objects = busy scene |
  | 7 | Color variance | Stock photos vs real photos |
  | 8 | Bottom region interest | Civic issues are ground-level |
  | 9 | Horizontal line score | Screenshots have many horizontal lines |

- **5 synthetic anomaly types** in training data: blank/dark images, screenshots, stock photos, overexposed images, and memes/manipulated content.
- Rule-based flags supplement the ML decision (BLANK_IMAGE, OVEREXPOSED, LOW_YOLO_CONFIDENCE, EXTREME_ASPECT_RATIO, etc.).

**Decision logic:** If `is_fraud_or_spam` is True → hard **REJECT**. If `is_anomaly` with flags → **FLAGGED_ANOMALY** for human moderation.

---

### 5. Gemini Multi-Modal NLP Classification

**What it does:** LLM-powered classification of the citizen's description (and optionally the image) into structured civic categories with severity, safety risk scores, and department routing.

**Algorithm:**
- **Google Gemini API** (`gemini-3.6-flash` primary, with 3 fallback models) with multi-modal input (text + image).
- Structured system prompt defines 12 civic categories, 4 severity levels, department routing rules, and safety risk scoring (0-100).
- Temperature = 0.1 for deterministic, consistent output.
- **Cascading fallback chain**: Gemini → Smart NLP Rule-Based Categorizer → Generic fallback.
- **Quota-aware**: Detects 429/resource-exhausted errors and instantly falls back to local NLP.

---

### 6. Smart NLP Rule-Based Categorizer (Fallback Engine)

**What it does:** A sophisticated regex + keyword-based classification system that runs entirely locally when Gemini is unavailable.

**Algorithm:**
- **12 category rules**, each with:
  - Curated keyword lists (15-25 domain-specific terms per category).
  - Regex patterns for contextual phrase matching (e.g., `/(open|broken|missing|damaged)\s*(manhole|chamber|drain\s*cover)/i`).
  - Default severity and base safety risk scores.
- **Scoring:** Each regex pattern match = +40 points, each keyword match = +25 points.
- **Contextual severity elevation:**
  - Urgency words (danger, emergency, fatal, school, hospital, accident) → bump severity up by one level, increase risk score by 12.
  - Minimizing words (minor, small, cosmetic) → bump severity down, decrease risk score by 15.
- **Public impact assessment** based on safety risk thresholds (85+ = Critical, 65+ = High, 40+ = Moderate).
- Confidence score: `min(0.98, max(0.78, 0.72 + score * 0.008))`.

---

### 7. Vector Embeddings — Semantic Search Infrastructure

**What it does:** Converts civic reports into 3072-dimensional vector embeddings for semantic similarity search and duplicate detection.

**Algorithm:**
- **Gemini Embedding API** (`gemini-embedding-001`) → 3072-dim vectors.
- Normalized text format: `Category: X | Complaint: Y | Summary: Z`.
- Vectors stored in Supabase for cosine similarity search between new and existing reports.

---

### 8. Spatial Intelligence Algorithms

#### a) Haversine Distance
- Great-circle distance between two lat/lng points on Earth.
- Used for all spatial queries (clustering, duplicates, hotspots, recurrence).
- Formula: `d = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)))`

#### b) Density-Based Spatial Clustering (Hotspots & Recurrence)
- Custom DBSCAN-style clustering: for each incident, find all neighbors within a configurable radius (default 500m for hotspots, 250m for recurrence).
- Clusters with >= min incidents (default 3) are retained.
- **Overlapping cluster merging** via iterative expansion (union-find pattern): if two clusters share any incident, they are merged.

#### c) Duplicate Detection — Weighted Multi-Modal Scoring
- Combines three signals with learned weights:
  - **Semantic similarity** (65%): Cosine similarity between Gemini embedding vectors (3072-dim).
  - **Geospatial proximity** (35%): Normalized Haversine distance within 100m radius.
  - **Category bonus** (text-only fallback): +0.25 if categories match.
- Thresholds: semantic similarity >= 0.75 AND combined score >= 0.78.
- Falls back to **token overlap** (Jaccard-like on words > 3 chars) when embeddings unavailable.

#### d) Trend Analysis
- Period-over-period comparison: `percentageChange = ((current - previous) / previous) × 100`.
- Handles zero-baseline edge cases gracefully (returns null instead of Infinity).

#### e) SLA Monitoring
- Tiered SLA targets: CRITICAL = 4h, HIGH = 24h, MEDIUM = 72h, LOW = 168h.
- Three SLA states: **ON_TRACK**, **AT_RISK** (≤25% time remaining), **BREACHED** (deadline passed).
- Deterministic calculation — no randomness.

#### f) Escalation Engine
- Rule-based multi-factor escalation with three levels: **EMERGENCY_REVIEW**, **URGENT**, **WATCH**.
- Combines: priority score, safety risk, report count, SLA state, recurrence signals.
- Emergency trigger: CRITICAL tier + (safety risk >= 85 OR 3+ reports OR SLA breached).

---

### 9. Priority Scoring System

Multi-factor weighted scoring (0-100) for incident prioritization:
- **Safety Risk** (highest weight): Life-threatening potential.
- **Public Impact**: Population density, location sensitivity.
- **Severity**: Infrastructure damage extent.
- **Recurrence**: Historical repeat patterns.
- **Location Sensitivity**: Schools, hospitals, main roads.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | Next.js API Routes (App Router) |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **AI/ML** | YOLOv8 (Ultralytics), OpenAI CLIP (ViT-B/32), scikit-learn (RF + IF), Google Gemini API |
| **Maps** | Leaflet + React-Leaflet |
| **Real-time** | LiveKit (audio/video for citizen-officer communication) |
| **Auth** | Supabase Auth with role-based access (Citizen / Worker / Authority) |
| **Storage** | Supabase Storage (images, evidence, audio) |
| **Validation** | Zod schemas |
| **Embeddings** | Gemini Embedding API (3072-dim) |

---

## Key Technical Strengths (Pitch Points)

1. **4-Tier AI Pipeline**: Unique layered architecture — object detection → cross-modal verification → classification → anomaly detection. Each tier catches a different class of problem, creating defense in depth.

2. **True Multi-Modal Understanding**: Not just text or just images — CLIP embeddings bridge the semantic gap between what citizens say and what they show.

3. **Hybrid ML Strategy**: Combines deep learning (YOLO, CLIP, Gemini) with classical ML (Random Forest, Isolation Forest) and rule-based systems (Smart NLP). The cascading fallback ensures the system never breaks.

4. **Production-Grade Resilience**: Every AI call has a timeout, every model has a fallback, and the system degrades gracefully. Gemini quota exceeded → Smart NLP takes over instantly.

5. **Sophisticated Spatial Intelligence**: Haversine distance, density-based clustering with merge logic, weighted multi-modal duplicate detection, and recurrence pattern analysis — all custom-built with no external geo libraries.

6. **Deterministic SLA & Escalation**: Time-critical operations use exact arithmetic with no randomness, ensuring consistent, auditable decisions.

7. **Domain-Specific NLP**: 12 curated civic categories with regex patterns and keyword scoring tuned for Indian municipal governance context (e.g., recognizing "waterlogging" as flood, "manhole without cover" as critical hazard).

8. **Scalable Architecture**: Supabase backend with dual-mode (mock for dev, production for deploy), RLS policies, and clean separation between AI engine (Python) and web app (TypeScript).

---

## Data Flow for a Single Report

```
1. Citizen uploads image + description + GPS location
           │
2. Zod validates the request payload
           │
3. Smart NLP classifies category + severity (instant, local)
           │
4. Gemini multi-modal analysis (image + text → structured JSON)
           │
5. Gemini Embedding → 3072-dim vector stored in DB
           │
6. YOLO detects objects in the image
           │
7. CLIP computes image-text similarity
           │
8. Random Forest predicts category + severity from 10-dim feature vector
           │
9. Isolation Forest checks for anomalies/fraud
           │
10. Decision engine: APPROVE / FLAGGED / REJECT
           │
11. Duplicate detector checks for nearby similar reports
           │
12. If new: creates master incident, auto-routes to department
    If duplicate: links to existing master incident
           │
13. Priority score calculated from 5 weighted factors
           │
14. SLA countdown starts based on priority tier
           │
15. Authority dashboard displays with full AI analysis
```

---

## Innovation Highlights

- **First-of-its-kind 4-tier verification pipeline** specifically designed for civic reporting, combining computer vision, NLP, and classical ML.
- **Safety risk scoring** (0-100) that translates AI predictions into real-world hazard quantification.
- **Intelligent auto-clustering** that merges duplicate citizen reports into master incidents, reducing authority workload.
- **Self-healing AI**: The system has three independent classification engines (Gemini, Smart NLP, Random Forest) with automatic fallback — it literally cannot have a single point of AI failure.
- **Privacy-preserving by design**: Row Level Security in Supabase ensures citizens only see their own reports, while authorities see only their department's incidents.
