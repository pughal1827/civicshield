# Phase 7D.4 — Department Operations & Workload Intelligence

## 1. Formulas & Operations Model

### Department Operational Pressure (0–100)
Department pressure is derived deterministically from four normalized component scores:

$$\text{Pressure Score} = 0.40 \cdot S_{\text{active}} + 0.25 \cdot S_{\text{critical}} + 0.20 \cdot S_{\text{sla}} + 0.15 \cdot S_{\text{recurring}}$$

* **Active Workload Score ($S_{\text{active}}$)**: $\min\left(100, \frac{\text{activeIncidents}}{20} \times 100\right)$
* **Critical/High Score ($S_{\text{critical}}$)**: $\min\left(100, \frac{\text{criticalCount} \times 2 + \text{highCount}}{10} \times 100\right)$
* **SLA Risk Score ($S_{\text{sla}}$)**: $\min\left(100, \frac{\text{slaBreachedCount} \times 2 + \text{slaAtRiskCount}}{5} \times 100\right)$
* **Recurrence Score ($S_{\text{recurring}}$)**: $\min\left(100, \frac{\text{recurringProblemCount}}{3} \times 100\right)$

### Classification Tiers
* `0–24`: **NORMAL**
* `25–49`: **MODERATE**
* `50–74`: **ELEVATED**
* `75–100`: **HIGH**

---

## 2. Resolution & Verification Metrics
- **Average Resolution Hours**: Mean duration from assignment ($\text{assigned\_at}$) to resolution ($\text{resolved\_at}$). Returns `null` if no resolved incidents exist.
- **Verification Rate**: $\frac{\text{verifiedCount}}{\text{resolvedCount} + \text{verifiedCount}} \times 100\%$. Returns `null` if zero completed incidents.
- **Reopen Rate**: $\frac{\text{rejectedVerificationCount}}{\text{resolvedCount} + \text{verifiedCount}} \times 100\%$. Returns `null` if zero completed incidents.

---

## 3. Unassigned Queues
- Primary active master incidents without an assigned department (`department_id IS NULL`).
- **Unassigned Critical Queue**: Priority score $\ge 80$ / `CRITICAL` tier.
- **Unassigned High Queue**: Priority score $60–79$ / `HIGH` tier.
- Sorted by priority score descending and submission timestamp oldest first.

---

## 4. Security, Privacy & Failure Handling
- **Server RBAC**: API `GET /api/authority/intelligence/departments` requires `AUTHORITY` or `ADMIN` clearance. Citizen role receives `403 Forbidden`.
- **Privacy Guarantee**: Returns aggregate operational metrics and sanitized incident case IDs. Zero citizen PII (emails, names, phone numbers, tracking codes) exposed.
- **Fail-Safe Mode**: Database or network failures yield `HTTP 503 Service Unavailable`.
