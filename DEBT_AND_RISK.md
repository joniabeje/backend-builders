# Risk & Technical Debt Inventory

**Team:** Backend Builders  
**Project:** CEA Event Space Reservation System  
**Repository:** [joniabeje/backend-builders](https://github.com/joniabeje/backend-builders)  
**Module:** 1 – Senior Project II Reset: From Prototypes to Products  
**Date:** 2026-09-17  
**Prototype origin:** Lovable.dev (`@lovable.dev/vite-tanstack-config`)  
**Audit method:** Manual code review + Cursor-assisted repository scan (VIBE: Verify)

---

## Executive Summary

The current codebase is a **Lovable.dev-generated frontend prototype**, not a production reservation system. README claims (backend API, conflict detection, service notifications, AWS deployment) are **aspirational**—the app runs on hardcoded room catalogs and in-memory mock requests with **no authentication, no persistence, no tests, and no API boundary**.

This inventory documents structural debt and agentic risks so the team can refactor before scaling features.

---

## Part 1: Technical Debt Audit

### TD-01 — Mock Data Layer Instead of a Real Backend

| Field | Detail |
| --- | --- |
| **Item Name** | Mock-only data plane (no API / database) |
| **Category** | Architectural Debt |
| **Description** | Reservation and admin flows depend on static modules `src/lib/rooms.ts` and `src/lib/mock-requests.ts`. Submitting a reservation in `src/routes/reserve.tsx` only flips local React state (`setSubmitted(true)`); nothing is persisted. Admin approvals in `src/routes/admin.tsx` mutate client-side `useState` copies of `MOCK_REQUESTS` and are lost on refresh. There is no REST/GraphQL layer, no ORM, and no server-side validation despite the architecture diagram in the README. |
| **Evidence** | `MOCK_REQUESTS`, `ROOMS`; form `onSubmit` never calls a network API; package.json has no DB/auth client. |
| **Why not production-ready** | Concurrent users, audit trails, scheduling integrity, and multi-office workflows cannot exist without a shared source of truth. |
| **Remediation Plan** | Introduce a backend API (Node/Flask/Cloudflare Workers) with a `reservations` and `rooms` schema; replace mock imports with typed API clients; keep mocks only behind a `DEV_MOCK` flag for local demos. |

---

### TD-02 — Missing Authentication & Authorization Boundaries

| Field | Detail |
| --- | --- |
| **Item Name** | Unprotected admin and requester surfaces |
| **Category** | Architectural Debt |
| **Description** | Routes `/admin`, `/dashboard`, and `/reserve` are publicly reachable with no login, session, role checks, or org membership model. Any visitor can open the Dean's Office admin dashboard and click Approve/Reject. README lists “Authentication system” under Future Work—confirming this was deferred for the prototype. |
| **Evidence** | No auth libraries in `package.json`; no protected route wrappers in the router tree. |
| **Why not production-ready** | Privilege escalation is trivial; FERPA/campus PII and approval integrity are unprotected. |
| **Remediation Plan** | Add Auth (e.g., Supabase Auth / Auth0 / Azure AD for Howard SSO) with roles: `student`, `advisor`, `admin`, `facilities`. Guard `/admin` server-side; scope `/dashboard` to the authenticated requester. |

---

### TD-03 — Business Rules Embedded in UI Components

| Field | Detail |
| --- | --- |
| **Item Name** | Monolithic client-side validation & risk logic |
| **Category** | Architectural Debt |
| **Description** | Capacity checks, after-hours detection, and warning rules live inline inside `ReservePage` (`src/routes/reserve.tsx`). Risk scoring lives in `riskScore()` in `mock-requests.ts` but is only used for display—not enforced on submit. Room recommendation (`recommendRooms`) is a simple capacity heuristic with no calendar conflict detection, despite README promising conflict detection and service auto-notification. |
| **Evidence** | Validation arrays built inside the React component; no shared domain module or API contract; no scheduling overlap checks against other bookings. |
| **Why not production-ready** | Rules can be bypassed by editing client code; duplication across pages will diverge; AI regenerations will rewrite rules inconsistently. |
| **Remediation Plan** | Extract a `domain/` package: `validateReservation()`, `detectConflicts()`, `computeRisk()`, `recommendRooms()`. Enforce the same rules on the server. Add integration tests against policy fixtures from CEA requirements. |

---

### TD-04 — Zero Automated Test Coverage

| Field | Detail |
| --- | --- |
| **Item Name** | Complete absence of unit/integration/E2E tests |
| **Category** | Test Debt |
| **Description** | The repository contains **no** `*.test.*` / `*.spec.*` files and no test runner scripts in `package.json` (only `dev`, `build`, `lint`, `format`). Critical AI-generated logic—`recommendRooms`, `riskScore`, form validators—has no “trust but verify” harness. |
| **Evidence** | Glob for tests returns 0 files; no Vitest/Jest/Playwright dependencies. |
| **Why not production-ready** | Refactors and AI agent edits can silently break scheduling/risk behavior without detection. |
| **Remediation Plan** | Add Vitest for domain functions; add Playwright smoke tests for reserve → dashboard → admin flows; require CI checks on PRs; treat AI-generated PRs as unverified until tests pass (VIBE Verify gate). |

---

### TD-05 — Documentation Drift & Missing Requirement Traceability

| Field | Detail |
| --- | --- |
| **Item Name** | README / product claims vs. implemented reality |
| **Category** | Documentation Debt |
| **Description** | README advertises Backend API, conflict detection, automatic IT/custodial/security notifications, analytics, and AWS deployment. The codebase implements a UI shell with mock data. Package name remains Lovable default `tanstack_start_ts`. Wrangler app name is generic `tanstack-start-app`. There are no ADRs, OpenAPI specs, or links from UI features back to Agile user stories / acceptance criteria. AI-generated UI component sprawl (`src/components/ui/*`) lacks guidance on which pieces are in-use vs. scaffold noise. |
| **Evidence** | README “Key Features” vs. `reserve.tsx` / `admin.tsx` behavior; dual lockfiles (`bun.lockb` + `package-lock.json`) with conflicting install instructions. |
| **Why not production-ready** | Stakeholders and AI agents will optimize for documented features that do not exist, increasing hallucination and scope confusion. |
| **Remediation Plan** | Rewrite README “Current vs. Planned” sections; add `docs/ARCHITECTURE.md` + ADRs; map each backlog epic to code modules; standardize on one package manager; document env vars and trust boundaries. |

---

### TD-06 — Hardcoded Inventory & Static Availability

| Field | Detail |
| --- | --- |
| **Item Name** | Hardcoded room catalog with fake availability flags |
| **Category** | Architectural Debt |
| **Description** | Six rooms are hardcoded with a static `status: "available" \| "reserved"` that does not change with bookings. Building naming is inconsistent across entries (e.g., “L.K. Downing Hall” vs “L.K. Downing Engineering Building” vs “Downing Hall”). Mock request rooms (`"L.K. Downing 1018"`, `"Mackey Atrium"`) do not consistently match `ROOMS` IDs/names—data model inconsistency left by rapid AI generation. |
| **Evidence** | `src/lib/rooms.ts` vs. room strings in `MOCK_REQUESTS`. |
| **Why not production-ready** | False availability and broken joins will corrupt scheduling decisions. |
| **Remediation Plan** | Normalize room IDs as foreign keys; compute availability from the reservation calendar; seed CEA’s real room inventory from an admin-managed table. |

---

## Part 2: AI & System Risk Assessment

### RISK-01 — Reliability / Hallucination: Fabricated Capabilities in Docs & Code

| Field | Detail |
| --- | --- |
| **Area** | Reliability / Hallucination |
| **Risk** | Lovable/Cursor agents may “complete” features by inventing APIs, notification emails, conflict engines, or auth that look finished in the UI but are stubs. The README already overstates system capability—evidence of hallucination bleed into documentation. Future Planner/Coder agents may assume a backend exists and generate broken client calls. |
| **Impact** | Demo failures, false stakeholder confidence, regressions when wiring real services. |
| **Likelihood** | High (already observed in docs/UI mismatch). |
| **Mitigation** | Human-in-the-loop review for every AI PR; Definition of Done requires working integration tests; maintain a `VERIFIED.md` checklist of what actually works; ban README claims without linked issue + test. |

---

### RISK-02 — Security & Ethics: Open Admin + Sensitive Event Data

| Field | Detail |
| --- | --- |
| **Area** | Security & Ethics |
| **Risk** | Unauthenticated admin actions allow anyone to approve/reject events. Reservation forms collect organization, advisor, attendance, and guest flags—campus-sensitive operational data. If AI features (chat assistants, auto-approval, NLP policy checks) are added later without input sanitization, **prompt injection** could manipulate recommendations or leak mock/real PII into model context. Bias risk: riskScore heuristics overweight “external guests / after-hours / food” and could unfairly flag certain student organizations. |
| **Impact** | Unauthorized approvals, data leakage, discriminatory flagging of org events. |
| **Likelihood** | High for access control; Medium for prompt injection once agentic features land. |
| **Mitigation** | AuthZ before any write path; never send raw student data to external LLMs without redaction; document risk-score thresholds with CEA policy owners; add audit logs for admin actions; establish trust boundaries (human must confirm high-risk approvals). |

---

### RISK-03 — Dependency Risk: Lovable / TanStack Start / Cloudflare Coupling

| Field | Detail |
| --- | --- |
| **Area** | Dependency Risk |
| **Risk** | Project depends on `@lovable.dev/vite-tanstack-config`, TanStack Start, Cloudflare Vite plugin, and a Lovable-hosted preview URL. Platform or config package changes can break local builds. Dual Bun/npm lockfiles increase “works on my machine” risk. External AI APIs (if used for scheduling optimization per Future Work) create cost, rate-limit, and vendor-change exposure. |
| **Impact** | Blocked development, non-reproducible deploys, forced emergency refactors mid-semester. |
| **Likelihood** | Medium–High. |
| **Mitigation** | Pin dependency versions; choose one package manager; vendor-critical config into-repo; design a thin adapter around any AI/scheduling vendor; keep a non-Lovable deployment path (e.g., Cloudflare Workers or AWS) documented and tested early. |

---

## Part 3: Backlog Integration

### Top 3 Technical Debt Items → GitHub Issues

These items were selected for highest production blockers (data integrity, security, verifiability).

| Priority | Debt ID | Proposed Issue Title | Label |
| --- | --- | --- | --- |
| 1 | TD-01 | Replace mock data layer with persistent reservation API | `technical-debt`, `refactor` |
| 2 | TD-02 | Add authentication and role-based route protection | `technical-debt`, `security` |
| 3 | TD-04 | Establish Vitest + Playwright verification harness | `technical-debt`, `testing` |

### AI-Aware Acceptance Criteria (drafted with LLM, human-reviewed)

#### Issue A — Replace mock data layer with persistent reservation API
**Acceptance Criteria**
1. Creating a reservation via `/reserve` persists a record that remains after page refresh and appears on `/dashboard` and `/admin`.
2. Approve/Reject on `/admin` updates the same persisted record for all clients (not local React state only).
3. `src/lib/mock-requests.ts` is unused in production builds (or gated behind `VITE_USE_MOCKS=true`).
4. OpenAPI (or equivalent) documents `POST /reservations`, `GET /reservations`, `PATCH /reservations/:id`.
5. Integration test covers create → list → status transition.

#### Issue B — Add authentication and role-based route protection
**Acceptance Criteria**
1. Unauthenticated users cannot access `/admin` (redirect to login).
2. Only `admin` (or Dean's Office) role can change reservation status.
3. `/dashboard` shows only the authenticated user’s requests.
4. Session is validated server-side (client-only checks are insufficient).
5. Security smoke test asserts 401/403 on unauthorized admin mutations.

#### Issue C — Establish Vitest + Playwright verification harness
**Acceptance Criteria**
1. `npm test` (or `bun test`) runs Vitest unit tests for `recommendRooms` and `riskScore`.
2. Playwright smoke test submits a valid reservation form and asserts success UI.
3. CI workflow fails the PR if tests fail.
4. README documents how to run unit vs. e2e suites.
5. Coverage report (even if low initially) is generated for `src/lib/**`.

### Project Board Actions (Scrum Master)

1. Create label `technical-debt` (and `refactor` / `testing` / `security` as needed) on the GitHub repo.
2. Open the three issues above with the acceptance criteria.
3. Add issues to the team GitHub Project Board Backlog column.
4. Link each issue back to this document (`DEBT_AND_RISK.md#td-01`, etc.).

---

## VIBE Coding Alignment

| Principle | How this audit applied it |
| --- | --- |
| **Verify** | Compared README claims to actual code paths; confirmed zero tests and no auth/API. |
| **Improve** | Converted findings into concrete remediation plans and backlog issues. |
| **Build** | Next sprint should implement Issues A–C before new feature work. |
| **Execute** | Human review remains required for AI-generated PRs touching auth, persistence, or risk scoring. |

---

## Appendix A — Inventory Snapshot

| Area | Current State |
| --- | --- |
| Frontend | React 19 + TanStack Router/Start + Vite |
| Backend API | Not implemented |
| Database | Not implemented |
| Auth | Not implemented |
| Tests | None |
| Deploy | Lovable preview + Wrangler stub (`tanstack-start-app`) |
| Package managers | Both Bun and npm lockfiles present |

## Appendix B — Suggested Additional Backlog (not top-3)

- Extract domain validation module from `reserve.tsx` (TD-03)
- Normalize room IDs across mock/real data (TD-06)
- Rewrite README Current vs Planned (TD-05)
- Implement real conflict detection against booking calendar
- Service notification webhooks (IT / custodial / security)

---

*End of inventory. Team submission artifact: this file (`DEBT_AND_RISK.md`). Individual submissions: export/print this document to PDF.*
