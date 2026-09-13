# Phase 7D.5 — Emergency Escalation Engine Design

## 1. Executive Summary & Product Purpose
The **Emergency Escalation Engine** in CivicShield AI monitors active primary master incidents to identify issues requiring immediate, high-priority municipal authority attention.

### Operational Boundaries
- **Priority Formula Preservation**: The existing 5-factor priority formula (30% Safety Risk, 25% Public Impact, 20% Severity, 15% Recurrence, 10% Location Sensitivity) remains unchanged. Escalation logic consumes calculated priority scores.
- **No Automatic Dispatch**: The escalation engine alerts human authority personnel. It does NOT automatically contact emergency services.
- **Authority Review**: Escalation alerts can be marked as reviewed by authenticated authority officers, creating audit log entries without modifying underlying priority scores or deleting evidence.

---

## 2. Escalation Level Classifications & Rules

| Escalation Level | Trigger Criteria | Recommended Operational Action |
| :--- | :--- | :--- |
| **EMERGENCY_REVIEW** | Priority Score $\ge 80$ (`CRITICAL`) AND (Safety Risk Score $\ge 85$ OR Citizen Reports $\ge 3$ OR SLA Breached) | Immediate dispatch & emergency field verification |
| **URGENT** | Priority Score $\ge 60$ (`HIGH`) AND (SLA Breached OR SLA At-Risk OR Recurring Location) | High-priority department dispatch within 4 hours |
| **WATCH** | Priority Score $40–59$ (`MEDIUM`) OR High Safety Risk score with low overall priority | Monitor timeline & SLA countdown |
| **NONE** | Standard priority incidents within SLA limits | Routine queue management |

---

## 3. Auditability & Review Flow
- Endpoint: `POST /api/authority/intelligence/escalations/review`
- Requirements:
  - Authenticated session with `AUTHORITY` or `ADMIN` role.
  - Payload: `{ incidentId: string, notes?: string }`.
  - Creates an audit record in `audit_logs` (`action: "ESCALATION_REVIEWED"`).
  - Updates incident review state (`is_escalation_reviewed: true`, `escalation_reviewed_at`, `escalation_reviewed_by`).
  - Leaves original escalation evidence, priority score, and priority tier intact.

---

## 4. Security, Privacy & Error Handling
- **RBAC**: APIs `GET /api/authority/intelligence/escalations` and `POST /api/authority/intelligence/escalations/review` are restricted to `AUTHORITY` and `ADMIN` roles (`403 Forbidden` for citizens).
- **Privacy**: Exposes case ID, category, priority, safety risk, SLA state, report count, and sanitized location. Zero citizen PII exposed.
- **Fail-Safe Mode**: Production database errors return `HTTP 503 Service Unavailable`.
