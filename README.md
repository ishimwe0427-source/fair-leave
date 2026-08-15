# FairLeave

Enterprise leave management system — multi-stage approvals, departments & roles, documents, notifications, email, bulk import, exports, audit log, gender-aware leave types, and white-label **System Studio**.

**Stack:** Next.js 16 · PostgreSQL · Prisma · TypeScript · Tailwind CSS  
**Version:** 1.0.0  

**Author:** Ishimwe Jean Francois · Senior Software Engineer  
**Phone:** +250 786 096 228 · **Email:** ishimwe0427@gmail.com

## Live / share

Deploy to Vercel with a hosted Postgres (`DATABASE_URL`) and set `AUTH_SECRET` (32+ chars) + `NEXT_PUBLIC_APP_URL` to your Vercel URL.

## Documentation

| Audience | Document |
|----------|----------|
| **Fair Construction** (Word) | [`docs/FairLeave-Fair-Construction.docx`](docs/FairLeave-Fair-Construction.docx) |
| **Other companies / partners** (Word) | [`docs/LeaveOS-Product-Overview.docx`](docs/LeaveOS-Product-Overview.docx) |
| Index | [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) |
| SMTP / email | [`docs/EMAIL.md`](docs/EMAIL.md) |

## Local quick start

```bash
docker compose up -d
npm install
cp .env.example .env   # set AUTH_SECRET (32+ chars)
npm run db:push
npm run db:seed
npm run db:review-users   # optional QA accounts
npm run dev
```

Open **http://127.0.0.1:3010**

Postgres host port: **55433**. Dev server: **3010**.

### Review login accounts (after `npm run db:review-users`)

Password for **all** accounts: `FairLeave!2026`

| Role | Email |
|------|--------|
| Employee | employee@fairleave.demo |
| Manager | manager@fairleave.demo |
| HR | hr@fairleave.demo |
| HR Admin | hradmin@fairleave.demo |
| Admin | admin@fairleave.demo |
| MD | md@fairleave.demo |
| GM | gm@fairleave.demo |
| Super Admin | superadmin@fairleave.demo |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:seed` | Baseline catalog |
| `npm run db:review-users` | Upsert QA accounts per role |
| `npm run db:reset` | Reset data + baseline |
| `npm run db:studio` | Prisma Studio |
| `npm run vercel-build` | Vercel build (generate + push schema + Next build) |
