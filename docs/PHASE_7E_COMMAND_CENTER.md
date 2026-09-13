# Phase 7E — Civic Operations Command Center Design Specification

## Executive Summary
The **Civic Operations Command Center** serves as the central operational hub for municipal authorities within CivicShield AI. It unifies all completed intelligence modules (Phases 7D.1 through 7D.5) into a single high-density, action-oriented dashboard. Municipal officers can immediately evaluate urgent civic priorities, dispatch unassigned critical cases, track SLA compliance, monitor department operational pressure, inspect geographic hotspots, identify recurring issues, and review cautious root-cause signals.

---

## Architectural Principles & Engine Reuse

```
                              CIVICSHIELD AI PLATFORM
                                         │
 ┌───────────────────────────────────────┴───────────────────────────────────────┐
 │                        CIVIC OPERATIONS COMMAND CENTER                        │
 │                           (/dashboard, /api/.../command-center)              │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         │
        ┌───────────────────┬────────────┼────────────┬───────────────────┐
        ▼                   ▼            ▼            ▼                   ▼
┌───────────────┐   ┌───────────────┐ ┌─────┐ ┌───────────────┐   ┌───────────────┐
│  Phase 7D.1   │   │  Phase 7D.2   │ │7D.3 │ │  Phase 7D.4   │   │  Phase 7D.5   │
│ Data Foundat. │   │ Civic Hotspot │ │SLA &│ │  Department   │   │  Root Causes  │
│  & Trends     │   │    Engine     │ │Recur│ │   Pressure    │   │ & Escalation  │
└───────────────┘   └───────────────┘ └─────┘ └───────────────┘   └───────────────┘
```

The Command Center **strictly consumes** existing Phase 7D intelligence engines without duplicating code or modifying underlying formulas:
- **Priority Scoring & Severity**: Uses existing `calculatePriorityScore` engine.
- **Duplicate Detection**: Retains human-confirmed duplicate relations and master incident linking.
- **Hotspot Detection**: Consumes `detectHotspots` (`lib/intelligence/hotspots.ts`).
- **Recurrence & SLA Monitoring**: Consumes `detectRecurringProblems` and `calculateIncidentSLA` (`lib/intelligence/recurring.ts` & `lib/intelligence/sla.ts`).
- **Department Pressure**: Consumes `getDepartmentOperations` and `calculateDepartmentPressure` (`lib/intelligence/departments.ts`).
- **Root-Cause Signals & Escalations**: Consumes `detectRootCauseSignals` and `getEmergencyEscalations` (`lib/intelligence/root-causes.ts` & `lib/intelligence/escalation.ts`).

---

## Command Center API Architecture (`GET /api/authority/operations/command-center`)

### Parallel Data Aggregation
To minimize round-trip latency and prevent sequential blocking calls, the backend endpoint executes independent engine evaluations concurrently via `Promise.all`:

```typescript
const [
  overview,
  escalations,
  unassignedData,
  departmentData,
  hotspotData,
  recurrenceData,
  rootCauseData,
  slaData,
] = await Promise.all([
  getIntelligenceOverview('last7Days'),
  getEmergencyEscalations({ days: 7 }),
  getDepartmentOperations(),
  getDepartmentOperations(),
  detectHotspots({ days: 7, radius: 500, minIncidents: 3 }),
  detectRecurringProblems({ days: 180, radius: 250, minOccurrences: 3 }),
  detectRootCauseSignals({ days: 7, radius: 500, minIncidents: 2 }),
  getSLAMonitoringData({ status: 'ALL' }),
]);
```

### Action Queue Calculation Logic
The top-priority **Action Queue** evaluates item counts requiring immediate authority action:
1. **Emergency Reviews**: Total incidents categorized as `EMERGENCY_REVIEW` by the escalation engine.
2. **Unassigned Critical & High Cases**: Active master incidents with priority score $\ge 60$ lacking department assignment (`departmentId === null`).
3. **SLA Breaches**: Active incidents whose SLA resolution deadline has passed (`slaStatus === 'BREACHED'`).
4. **Possible Common Cause Signals**: High-confidence root-cause clusters ($\ge 60$ signal score) requiring field verification.

---

## Visual Hierarchy & Priority Levels

| Level | Priority Tier | UI Components | Default Actions |
| :--- | :--- | :--- | :--- |
| **Level 1** | **IMMEDIATE** | Today's Action Queue Banner, Unassigned Priority Cases, Emergency Review Alerts | *[Assign Department]*, *[Inspect Incident]*, *[Review Escalation]* |
| **Level 2** | **OPERATIONAL** | Department Operations Pressure Cards, SLA Health Gauges | *[View Department Operations]*, *[View SLA Monitoring]* |
| **Level 3** | **INTELLIGENCE** | Civic Hotspots, Recurring Problems, Possible Common Issues | *[View Hotspots]*, *[View Recurring]*, *[Review Signals]* |
| **Level 4** | **CONTEXT** | 7-Day Civic Activity Chart, Map Preview | *[Open Full Map]*, *[Export Intelligence Summary]* |

---

## Partial Failure Isolation & Robustness
Each UI card/section in the Command Center is wrapped in isolated state containers. If a single upstream intelligence module errors:
- The affected card transitions to an inline error state: *"Unable to load this section."* with a **Retry** control.
- All other Command Center sections remain fully responsive and operational.
- Production database outages return an explicit HTTP `503 Service Unavailable` response without exposing stack traces or database URLs.

---

## Security, RBAC & Privacy Compliance
- **Server-Side Session Validation**: Uses HTTP-Only session cookies validated via `getSessionByToken`.
- **Role Enforcement**:
  - `AUTHORITY` / `ADMIN`: Granted full read & operational triage access (HTTP `200 OK`).
  - `CITIZEN`: Access strictly denied (HTTP `403 Forbidden`).
  - Unauthenticated: Access denied (HTTP `401 Unauthorized`).
- **Zero PII Exposure**: Command Center responses contain only aggregated counts, incident Case IDs, categories, priorities, SLA states, and public addresses. Citizen emails, phone numbers, secret tracking UUIDs, and password hashes are strictly filtered out.

---

## Mobile & Desktop Responsive Design
- **Mobile Breakpoints (360px, 390px, 430px, 768px)**:
  - Vertical card stacking order: Action Queue $\rightarrow$ Urgent Alerts $\rightarrow$ Unassigned Priority $\rightarrow$ SLA Health $\rightarrow$ Department Operations $\rightarrow$ Hotspots $\rightarrow$ Recurring $\rightarrow$ Common Issues $\rightarrow$ 7-Day Activity.
  - Minimum touch target size: $44\text{px}$.
  - Zero horizontal overflow (`overflow-x: hidden`).
- **Desktop (1024px+)**:
  - Multi-column grid layout optimizing readability and operational awareness.
  - High-density telemetry cards with text + icon indicators.

---

## Non-Causal Wording Safeguards
Root-cause signals presented in the Command Center enforce non-causal language:
- **Approved**: *"Possible common issue"*, *"Related incident cluster"*, *"Needs field verification"*.
- **Prohibited**: *"Confirmed root cause"*, *"AI proved cause"*, *"Definitely caused by"*.
