<div align="center">

# JobTrack

**A production-grade Job Application Tracker & Career Pipeline Command Center.**  
Engineered for private daily use and zero-signup portfolio evaluation from a single codebase.

[![CI Status](https://github.com/omarg/JobTrack/actions/workflows/ci.yml/badge.svg)](https://github.com/omarg/JobTrack/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.2_App_Router-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_%2F_Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/Tests-207_Vitest_%2B_5_Playwright-10B981?logo=vitest&logoColor=white)](#testing--quality-gates)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B.svg)](LICENSE)

[**Features**](#key-features) · [**Screenshots**](#product-tour) · [**Quickstart**](#local-development) · [**Deployment**](#deployment) · [**Architecture & Security**](ARCHITECTURE.md)

</div>

---

<p align="center">
  <img src="docs/screenshots/hero-showcase.png" alt="JobTrack Flagship Studio Command Center" width="100%" />
</p>

---

## Why JobTrack?

Tracking a modern engineering job search in a spreadsheet breaks down once you are juggling dozens of active roles, multiple tailored resume versions, multi-round technical interviews, and timezone-sensitive follow-up deadlines.

**JobTrack** was built as a personal daily driver to manage the author's own job search (`APP_MODE="personal"`), and includes a built-in interactive sandbox mode (`APP_MODE="demo"`) so anyone checking out the project can explore the full workflow with sample data:

- **`APP_MODE="personal"` (Private Daily Tracker)**: Built for private daily job hunting, locked behind **Auth.js v5** (GitHub & Google OAuth) and a strict `ALLOWED_EMAILS` allowlist gate so only the owner can sign in.
- **`APP_MODE="demo"` (Interactive Portfolio Sandbox)**: Visitors click **"Try the Interactive Demo"** on the landing page and receive an isolated 7-day guest session (`jt_guest_id` HMAC-SHA256 signed cookie) pre-populated with 30 realistic applications, 3 resume versions, 10 interview rounds, notes, contacts, and historical status transitions.

> For deep-dive system diagrams, ER models, Architectural Decision Records (ADRs), and security internals, read **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## Product Tour

<table>
  <tr>
    <td width="50%" valign="top">
      <h4 align="center">Analytics Funnel &amp; Resume A/B Testing</h4>
      <img src="docs/screenshots/analytics-dashboard.png" alt="Analytics Dashboard" width="100%" />
      <p align="center"><sub>Historical stage conversion funnel, weekly velocity, average days per stage, and per-resume callback rates with <code>&lt; 5 apps</code> sample warnings.</sub></p>
    </td>
    <td width="50%" valign="top">
      <h4 align="center">URL-Synced Table &amp; Multi-Facet Filters</h4>
      <img src="docs/screenshots/table-view.png" alt="Table View and Filters" width="100%" />
      <p align="center"><sub>TanStack Table with sticky <code>&lt;th scope="row"&gt;</code> company headers, sortable columns, and URL-persisted search &amp; filter facets.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4 align="center">7-Column Calendar Month Grid</h4>
      <img src="docs/screenshots/calendar-view.png" alt="Calendar Month Grid" width="100%" />
      <p align="center"><sub>Timezone-normalized month grid and chronological mobile agenda for interview rounds and overdue follow-ups.</sub></p>
    </td>
    <td width="50%" valign="top">
      <h4 align="center">Global Interview Rounds Tracker</h4>
      <img src="docs/screenshots/interviews-view.png" alt="Interviews Tracker" width="100%" />
      <p align="center"><sub>Date-grouped upcoming and past interview rounds with 48-hour alerts, prep notes, and automatic status move prompts.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4 align="center">Deep-Linked Detail Drawer (<code>?app=ID</code>)</h4>
      <img src="docs/screenshots/application-drawer.png" alt="Application Detail Drawer" width="100%" />
      <p align="center"><sub>600ms debounced inline autosave, Notes, Contacts, Interview rounds, and immutable <code>StatusHistory</code> timeline.</sub></p>
    </td>
    <td width="50%" valign="top">
      <h4 align="center">4-Step CSV Import Wizard &amp; Settings</h4>
      <img src="docs/screenshots/csv-import-wizard.png" alt="CSV Import Wizard" width="100%" />
      <p align="center"><sub>Smart header auto-mapping, row-level Zod validation preview, full JSON backup/restore, and IANA timezone preferences.</sub></p>
    </td>
  </tr>
</table>

<details>
<summary><strong>View Landing Page &amp; Mobile Responsive Screenshots (<code>375px</code> Viewport)</strong></summary>
<br />
<table>
  <tr>
    <td width="65%" valign="top">
      <h4 align="center">Public Demo Landing Page (<code>/</code>)</h4>
      <img src="docs/screenshots/landing.png" alt="Landing Page" width="100%" />
    </td>
    <td width="35%" valign="top">
      <h4 align="center">Mobile Chronological Agenda (<code>375px</code>)</h4>
      <img src="docs/screenshots/mobile-agenda.png" alt="Mobile Agenda View" width="100%" />
    </td>
  </tr>
</table>
</details>

---

## Key Features

- **Fluid Kanban Board (`@dnd-kit`)**: Mouse and keyboard drag-and-drop across `Wishlist`, `Applied`, `Phone Screen`, `Interview`, `Offer`, and `Rejected` with optimistic TanStack Query mutations, automatic rollback on error, and `O(1)` float midpoint positioning with automatic column rebalancing (`< 0.001` gap threshold).
- **URL-Synced Table & Drawer (`?view=table` & `?app=ID`)**: Every filter (`q`, `status`, `source`, `priority`, `locationType`, `resumeVersionId`, `from`, `to`, `archived`, `sort`, `page`) and the active application drawer sync with the URL for shareable links and native browser `Back`/`Forward` navigation.
- **SSRF-Safe Job URL Autofill (`/api/metadata`)**: Paste a job posting URL to autofill company, role, and location via OpenGraph parsing—protected by DNS resolution checks blocking private/loopback/metadata IPs, `redirect: "error"`, a `4000ms` timeout, a `256 KB` stream cap, and a `10 req/min/user` rate limit.
- **Timezone-Aware Reminders & Notification Bell**: Evaluates overdue follow-up dates in the user's IANA timezone and highlights interviews scheduled within the next 48 hours, with one-click `"Mark followed up"` and `"Snooze +3d"` actions.
- **Historical Pipeline Analytics & Resume A/B Tracking**: Computes stage conversion funnels and average days per stage from immutable `StatusHistory` records rather than just current status, and flags resume versions with `< 5 applications` to prevent misleading small-sample conclusions.
- **Data Portability & Backup Safety**: 4-step PapaParse + Zod CSV Import Wizard, RFC 4180 CSV export, full relational JSON backup export/restore (guarded by an empty-account check), and a 30-day backup reminder banner.
- **Command-First Workflow (`cmdk`)**: Global `Cmd/Ctrl + K` Command Palette and single-key shortcuts (`N`/`C` new application, `/` search, `G` + `B/T/I/C/D/S` navigation, `?` shortcut help modal).

---

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework & Language** | Next.js 15.2 (App Router, Server Actions), React 19, TypeScript 5.7 (`strict: true`, `noUncheckedIndexedAccess: true`) |
| **Database & ORM** | PostgreSQL 16 (Neon Serverless in prod, Docker Alpine locally), Prisma ORM 6.4 |
| **Authentication** | Auth.js v5 (`next-auth` + `@auth/prisma-adapter`) for Personal Mode; HMAC-SHA256 signed cookies for Demo Mode |
| **UI & Styling** | Tailwind CSS 3.4, `shadcn/ui`, `lucide-react`, `next-themes`, `cmdk`, `sonner` |
| **Data & Interactions** | TanStack Query v5, TanStack Table v8, `@dnd-kit/core` & `@dnd-kit/sortable`, Recharts, React Hook Form + Zod |
| **Dates & Parsing** | `date-fns` + `@date-fns/tz`, `Intl.DateTimeFormat`, `papaparse` |
| **Testing & CI** | Vitest + React Testing Library, Playwright (Chromium), GitHub Actions CI |

---

## Local Development

### 1. Prerequisites
- **Node.js** `>= 20.x` and **pnpm** `>= 9.x`
- **Docker** (for the local PostgreSQL 16 container)

### 2. Clone, Install & Start Database
```bash
git clone https://github.com/omarg/JobTrack.git
cd JobTrack
pnpm install

# Start local PostgreSQL 16 container on localhost:5432
pnpm db:up
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Default local `.env` configuration:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobtrack_dev?schema=public"
APP_MODE="demo"
AUTH_SECRET="local-dev-secret-key-minimum-32-characters-long"
CRON_SECRET="local-dev-cron-secret"
```

### 4. Migrate, Seed & Launch
```bash
pnpm prisma migrate deploy
pnpm db:seed
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Testing & Quality Gates

The project is verified by **207 Vitest unit and live PostgreSQL integration tests** across 9 test files and **5 Playwright Chromium E2E tests** across 3 spec files:

```bash
pnpm prisma validate   # Validate Prisma schema
pnpm run typecheck     # Strict TypeScript check (0 errors, 0 'any' types)
pnpm run lint          # ESLint check (0 warnings, 0 errors)
pnpm test              # Run 207 unit + live PostgreSQL isolation tests (Vitest)
pnpm run build         # Production Next.js build
pnpm test:e2e          # Run 5 Chromium E2E & responsive/a11y specs (Playwright)
```

---

## Deployment

JobTrack is designed for turnkey deployment on **Vercel** (or any Node.js hosting platform) backed by a managed **PostgreSQL** database (such as Neon Serverless Postgres or Supabase).

Depending on how you run JobTrack, set the `APP_MODE` environment variable:
- **Personal Mode (`APP_MODE="personal"`)**: Your private daily tracker. Configure OAuth credentials (`AUTH_GITHUB_ID`/`SECRET` or `AUTH_GOOGLE_ID`/`SECRET`) and add your email to `ALLOWED_EMAILS`.
- **Demo Sandbox Mode (`APP_MODE="demo"`)**: Public showcase mode allowing visitors to spin up isolated guest sessions with realistic sample data without signing up.

### Production Environment Variables

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (pooled connection recommended for serverless) |
| `APP_MODE` | Operating mode: `"personal"` (private daily tracker) or `"demo"` (public sandbox) |
| `AUTH_SECRET` | 32+ character random string for Auth.js session encryption & HMAC cookie signing |
| `CRON_SECRET` | Bearer token secret for authorizing `/api/cron/cleanup` housekeeping requests |
| `ALLOWED_EMAILS` | Comma-separated list of authorized email addresses (required when `APP_MODE="personal"`) |
| `AUTH_GITHUB_ID` / `SECRET` | GitHub OAuth application credentials (when `APP_MODE="personal"`) |
| `AUTH_GOOGLE_ID` / `SECRET` | Google OAuth credentials (optional, when `APP_MODE="personal"`) |

Always run migrations in production using the non-destructive deploy command:
```bash
pnpm prisma migrate deploy
```

---

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Deep-dive into the application architecture, Mermaid Entity-Relationship & Sequence diagrams, Composite Indexes, ADRs (Float Midpoint Positioning, URL State, Historical Funnel Calculation, Timezone Engine), and Security / SSRF protections.
- **[LICENSE](LICENSE)**: MIT License.
