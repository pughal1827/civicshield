# Phase 7D.5 — Root-Cause Signal Engine Design

## 1. Executive Summary & Product Purpose
The **Root-Cause Signal Engine** in CivicShield AI analyzes spatial, temporal, category, recurrence, and hotspot patterns to detect potential underlying common issues behind clusters of civic complaints.

### Product Language Boundaries
- **DO NOT CLAIM**: "Confirmed root cause", "AI proved the cause", "This is definitely caused by X".
- **DO USE**: "Possible common cause", "Related incident cluster", "Potential underlying issue", "Needs field verification".
- **Mandatory Policy**: All signals represent decision-support intelligence for authority personnel. Field verification by municipal officers is mandatory before physical infrastructure work.

---

## 2. Signal Engine Architecture & Composable Data Inputs

The Root-Cause Signal Engine composes outputs from existing Phase 7D intelligence utilities rather than duplicating calculations:

```
Incidents & Reports Datasets
   │
   ├── Spatial & Category Clustering (Haversine distance <= radiusMeters)
   ├── Temporal Density Analysis (Incidents created within lookback window)
   ├── Recurrence Signals (Phase 7D.3 detectRecurringProblems)
   └── Hotspot Indicators (Phase 7D.2 detectCivicHotspots)
```

---

## 3. Signal Score Formula & Classifications

The deterministic **Root-Cause Signal Score** (0–100) evaluates signal strength:

$$\text{Signal Score} = 0.35 \cdot S_{\text{spatial}} + 0.25 \cdot S_{\text{temporal}} + 0.20 \cdot S_{\text{category}} + 0.20 \cdot S_{\text{recurrence}}$$

### Sub-Score Definitions
1. **Spatial Sub-Score ($S_{\text{spatial}}$)**: $\min\left(100, \frac{\text{incidentCount}}{\text{minIncidents}} \times 50 + \left(1 - \frac{\text{radiusMeters}}{\text{maxRadius}}\right) \times 50\right)$
2. **Temporal Sub-Score ($S_{\text{temporal}}$)**: $\min\left(100, \frac{\text{incidentsInLast48h}}{\text{incidentCount}} \times 100\right)$
3. **Category Sub-Score ($S_{\text{category}}$)**: $100$ if all incidents belong to same category; $75$ if dominant category $\ge 70\%$.
4. **Recurrence Sub-Score ($S_{\text{recurrence}}$)**: $100$ if spatial location matches a known recurring cluster; $50$ if previous occurrences exist; $0$ otherwise.

### Signal Strength Tiers
- `0–39`: **LOW**
- `40–59`: **MODERATE**
- `60–79`: **STRONG**
- `80–100`: **VERY_STRONG**

---

## 4. Evidence & Recommended Actions
Every root-cause signal object contains:
- `evidence`: Bulleted reasons explaining spatial concentration, time recency, category consistency, and recurrence.
- `recommendedAction`: Actionable advice (e.g. `"Field verification recommended for drainage main line."`).
- `requiresFieldVerification`: `true`.

---

## 5. Security, Privacy & API Specifications
- **RBAC**: Endpoint `GET /api/authority/intelligence/root-causes` restricted to `AUTHORITY` and `ADMIN` roles (`403 Forbidden` for citizens).
- **Privacy**: Aggregate metrics only. Zero citizen PII (emails, names, phone numbers, tracking codes) exposed.
- **Fail-Safe Mode**: Database or network failures yield `HTTP 503 Service Unavailable`.
