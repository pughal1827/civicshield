# Phase 7D.4 — Department Workload & Operational Intelligence Design

## 1. Executive Summary & Product Purpose
Phase 7D.4 introduces **Department Workload & Operational Intelligence** to CivicShield AI. The purpose is to provide municipal leaders and department heads with real-time operational visibility into department capacity, backlog distribution, SLA compliance, unassigned critical queues, resolution performance, and deterministic operational pressure indicators.

This feature consumes real incident master records, SLA metrics, hotspot data, and recurrence signals to provide objective decision support for resource allocation.

---

## 2. Department Data Sources & Entity Mapping

### Primary Datasets Reused
1. **Incidents Table (`incidents`)**: Primary master records (`department_id`, `category`, `status`, `priority_score`, `priority_tier`, `created_at`, `assigned_at`, `resolved_at`, `verified_at`).
2. **Citizen Reports (`reports`)**: Attached citizen submission volume (`citizenReportCount`).
3. **SLA Monitoring Engine (`lib/intelligence/sla.ts`)**: Evaluates real-time SLA risk/breach status per department.
4. **Recurrence Engine (`lib/intelligence/recurring.ts`)**: Evaluates spatial-temporal recurring problem clusters by category and assigned department.
5. **Time Utilities (`lib/intelligence/time-windows.ts` & `trends.ts`)**: Period-over-period 7-day trend calculations.

---

## 3. Department Pressure Formula & Classification

Department operational pressure (0–100) is derived using a normalized, deterministic weighting formula:

$$\text{Pressure Score} = 0.40 \cdot S_{\text{active}} + 0.25 \cdot S_{\text{critical}} + 0.20 \cdot S_{\text{sla}} + 0.15 \cdot S_{\text{recurring}}$$

### Sub-Score Normalization
- **Active Workload Score ($S_{\text{active}}$)**: $\min\left(100, \frac{\text{activeIncidents}}{20} \times 100\right)$
- **Critical/High Score ($S_{\text{critical}}$)**: $\min\left(100, \frac{\text{criticalCount} \times 2 + \text{highCount}}{10} \times 100\right)$
- **SLA Risk Score ($S_{\text{sla}}$)**: $\min\left(100, \frac{\text{slaBreachedCount} \times 2 + \text{slaAtRiskCount}}{5} \times 100\right)$
- **Recurrence Score ($S_{\text{recurring}}$)**: $\min\left(100, \frac{\text{recurringProblemCount}}{3} \times 100\right)$

### Pressure Classification Tiers
- `0–24`: **NORMAL** (Low operational strain)
- `25–49`: **MODERATE** (Steady operational load)
- `50–74`: **ELEVATED** (High operational load, monitoring recommended)
- `75–100`: **HIGH** (Severe operational pressure, resource intervention required)

### Deterministic Explanation & Bottleneck Signal
- Every department pressure result includes human-readable reasons (e.g. `23 active incidents, 8 critical/high, 4 SLA risks, 3 recurring locations`).
- Bottleneck detection: Flagged as `Possible workload bottleneck` if $\text{assignedCount} + \text{inProgressCount} \ge 10$ and resolution throughput $< 20\%$ of active backlog.

---

## 4. Unassigned Critical & High Priority Queue
- **Unassigned Critical Queue**: Active primary master incidents (`master_incident_id IS NULL` and `department_id IS NULL` and `priority_score >= 80` or `priority_tier == 'CRITICAL'`).
- **Unassigned High Queue**: Active primary master incidents with `60 <= priority_score < 80` and `department_id IS NULL`.
- **Ordering**: Sorted by operational urgency (Critical priority score descending, then submission timestamp oldest first).
- **Privacy Guarantee**: Returns `caseId`, `title`, `category`, `priorityScore`, `createdAt`, and sanitized general location area. Zero citizen PII (emails, names, phone numbers, tracking secrets) exposed.

---

## 5. Resolution & Verification Metrics
- **Resolution Hours**: Calculated from $\text{resolved\_at} - \text{assigned\_at}$ (or $\text{created\_at}$).
  - `averageResolutionHours`, `minResolutionHours`, `maxResolutionHours`. If `resolvedCount == 0`, returns `null`.
- **Verification Rate**: $\frac{\text{verifiedCount}}{\text{resolvedCount}} \times 100\%$. If `resolvedCount == 0`, returns `null`.
- **Reopen / Rejection Rate**: $\frac{\text{rejectedVerificationCount}}{\text{resolvedCount}} \times 100\%$. If `resolvedCount == 0`, returns `null`.

---

## 6. Security, Privacy & Failure Handling
- **RBAC**: API `GET /api/authority/intelligence/departments` restricted to `AUTHORITY` and `ADMIN` roles (`403 Forbidden` for citizens).
- **Production Mode Failure**: Database or network failures yield `HTTP 503 Service Unavailable` with an explicit alert message.
- **Explicit Demo Mode**: Uses `mockStore` records with identical computation logic.
