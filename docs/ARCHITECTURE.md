# Architecture decisions

Decisions for the persistent backend (#13) and sign-in (#14, #59), agreed by the team on 2026-11-17. Each record says what we chose, what we turned down, and what it costs us.

## Current shape

```mermaid
flowchart LR
  Browser["Browser<br/>React pages"] -- "server functions / HTTP" --> Server["TanStack Start server<br/>Node 22"]
  Server -- "Firebase Admin SDK" --> Firestore[("Cloud Firestore")]
  Server -- "imports" --> Domain["src/domain<br/>validation · conflicts · risk · review"]
  Browser -- "imports" --> Domain
```

- Pages read and write through the `ReservationRepository` interface (`src/data/`). The default is `ApiReservationRepository` against `/api` (#57). Set `VITE_USE_MOCKS=true` for the in-memory seed (Playwright, Lovable preview).
- HTTP endpoints live under `/api` (`GET/POST /api/reservations`, `GET/PATCH /api/reservations/:id`, `GET /api/rooms`) and call `ReservationsApi` in `src/server/reservations.server.ts` (#55). Create runs `validateReservation` (400), `findConflicts` (409, transactional in #65) and stores server-computed risk. A 409 is shown on `/reserve` with the same “already booked” copy as live validation and does not clear the form (#66). Overlap → 409 and back-to-back → allowed are covered in integration/HTTP tests (#67). The OpenAPI contract is `docs/openapi.yaml` (#56).
- Every business rule lives once in `src/domain/` and runs in both places: in the browser for live feedback, and on the server as the check that counts.
- Service desk alerts go through `NotificationsApi.notify(service, reservation, details)` (`it` | `custodial` | `security`), stored under `notifications/{reservationId}_{service}` and listable by service (#40). New rows are delivered by a pluggable adapter; the default is `ConsoleNotificationAdapter` (no credentials, `#41`). Set `NOTIFICATION_DELIVERY` later for email. Approving a request with `itNeeds` calls `notify("it", …)` with date, time, room, and equipment (#42); re-approve stays idempotent. Unit tests cover the trigger matrix and single-row idempotency (#43). Approving a request with food or attendance at/above `RISK_POLICY.largeAttendance` calls `notify("custodial", …)` with date, time, room, attendance, and reason (#44).
- The browser never talks to Firestore directly. Only the server does, with the Admin SDK.

## ADR-1: Cloud Firestore for data

**Decision.** Store rooms, reservations, their history, users, sessions and notifications in Cloud Firestore, accessed only from the server through the Firebase Admin SDK.

**Why.**

- Managed, nothing to run or patch, and a free tier that covers a class project.
- Transactions let `POST /reservations` check for a double booking and save in one atomic step (#65).
- The Firebase Emulator runs the same database locally and in CI with no account or credentials.

**Turned down.**

- _Cloudflare D1 (SQLite)_, suggested in #13: a good fit for the old Cloudflare setup, but the team chose Firebase.
- _A separate Express or Flask service_: a second codebase and deploy for no gain, since TanStack Start already runs server code.

**Costs.**

- No SQL schema or migrations. #54 becomes typed collections, converters and indexes instead.
- Queries are limited to what Firestore indexes allow. The date-range and per-room queries (#50, #51) need composite indexes in `firestore.indexes.json`.
- Security rules deny all browser access. If a page ever needs live updates straight from Firestore, the rules must be opened deliberately for that collection.

## ADR-2: Server code runs on Node, inside TanStack Start

**Decision.** API endpoints are TanStack Start server functions and server routes. They run on Node 22: `vite dev` locally and in CI, and a Node build in production.

**Why.** The Admin SDK needs Node APIs. Outside a Lovable sandbox, `@lovable.dev/vite-tanstack-config` already builds without the Cloudflare bundler ("No Lovable context detected — skipping nitro deploy plugin"), so nothing has to change for development or CI.

**Production.** Build with Nitro's `node-server` preset (`NITRO_PRESET=node-server`, which the Lovable config reads) and deploy the container to Firebase App Hosting or Cloud Run. App Hosting does not officially list TanStack Start, so Cloud Run is the fallback. Deployment is a follow-up ticket; nothing in #13 or #14 requires it.

**Costs.** The Lovable preview still builds for Cloudflare Workers, where the Admin SDK cannot run. Once #57 lands, the preview has to run with `VITE_USE_MOCKS=true`, which keeps the in-memory repository.

## ADR-3: Our own email and password sign-in (#59)

**Decision.** Accounts live in a `users` collection with a `role` (`student`, `advisor`, `admin`, `facilities`). Passwords are hashed with scrypt (Node's built-in `crypto`, per-user random salt). Signing in creates a `sessions` document with an expiry, and the browser receives its id in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie that page scripts cannot read. Every protected server endpoint loads the session and checks the role (401 when signed out, 403 for the wrong role). One account per role is seeded for development and demos (#60).

**Why.** No external sign-up or console setup, works the same in the emulator and in CI, and the team owns the whole flow end to end for the course.

**Turned down.**

- _Firebase Auth_ with roles as custom claims: less code and a hosted login page, and the natural choice with Firestore. The team preferred to own the sign-in flow for now.
- _Supabase Auth or Auth0_, suggested in #14: a second vendor next to Firebase.

**Costs.** We are responsible for password storage, session expiry and sign-out, and for rate-limiting sign-in attempts. There is no password reset or email verification yet.

**Later.** Howard SSO replaces the password form when the university provides it. Sessions and role checks stay the same; only how a user proves who they are changes.

## Local development

- Java 21 or newer is required for the Firebase Emulator (`winget install Microsoft.OpenJDK.21` on Windows).
- `npm run emulators` starts Firestore locally under the placeholder project `demo-cea-reserve`. `demo-` projects never reach Google's servers and need no credentials.
- With the emulator running, `npm run seed` loads the room catalog, demo reservations, and one account per role (#60). It is safe to run again. Against a real project (`FIREBASE_PROJECT_ID`) it refuses demo reservations and needs `--rooms-only` (still seeds rooms and accounts).
- Demo passwords (emulator / local only): `student@cea.howard.edu` / `student-demo`, `advisor@cea.howard.edu` / `advisor-demo`, `admin@cea.howard.edu` / `admin-demo`, `facilities@cea.howard.edu` / `facilities-demo`. Sign in at `/login` or `POST /api/auth/sign-in`; the session cookie is `cea_session`. `/admin` redirects signed-out users to `/login` and refuses non-admin roles (#61). `PATCH /api/reservations/:id` also requires an admin session on the server (**401** / **403**, #62). The `Admin` nav link is shown only to admins (#89). `My Requests` is shown only when signed in (#38); `/dashboard` also redirects signed-out visitors to `/login` (#36). With `VITE_USE_MOCKS=true`, `/login` accepts the same demo passwords in-browser so Playwright can sign in without Firestore (#90). Playwright also covers submit → Pending on `/dashboard` (#39).
- For a local UI against Firestore: start `npm run emulators`, run `npm run seed`, then `npm run dev` (no `VITE_USE_MOCKS`). Sign in, submit on `/reserve`, then open `/dashboard` — `GET /api/reservations?requester=me` shows only that user's requests (#36).
- `npm run test:integration` starts the emulator, runs the integration tests against it, and stops it. That suite includes the auth security smoke (#63): PATCH signed out → 401, as a student → 403. It also covers create → admin approve → list shows Approved (#87).
- The real Firebase project id is only needed for deployment.

## Data model

| Collection                  | Holds                                                                                                        | Written by                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `rooms`                     | id, name, building, capacity, features                                                                       | seed script (#58)                 |
| `reservations`              | request fields, `requesterId`, status, risk (`level`, `score`, `requiresReview`, `factors`), `submittedAt`   | `POST` and `PATCH /reservations`  |
| `reservations/{id}/history` | one document per status change: from, to, actor, feedback, at                                                | `PATCH /reservations/:id` (#85)   |
| `users`                     | email, name, role, password hash and salt                                                                    | seed script (#60)                 |
| `sessions`                  | userId, role, expiresAt (ISO); id is the `cea_session` cookie value                                          | `POST /api/auth/sign-in` (#60)    |
| `counters/reservations`     | `lastNumber` for `REQ-<n>` ids                                                                               | seed + transactional create (#65) |
| `notifications`             | id `{reservationId}_{service}`, service, title, details, createdAt — at most one row per request per service | `NotificationsApi.notify` (#40)   |

Reservations are never deleted, including rejected ones, so history and analytics stay complete (#50).

**Indexes** (`firestore.indexes.json`). Composite indexes: `requesterId` + `submittedAt` descending for "my requests" (#36), and `room` + `date` for the transactional double-booking query (#65). Single-field indexes cover the date-range query on `date` (#50) and ordering history by `at`. Add an index here in the same PR as any new query that filters on one field and sorts on another.
