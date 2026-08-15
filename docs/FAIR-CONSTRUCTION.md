# FairLeave for Fair Construction Ltd

**Product brief & capability guide**  
**Version:** 1.0  
**Prepared for:** Fair Construction leadership, HR, and operations

### Prepared by

| | |
|---|---|
| **Name** | Ishimwe Jean Francois |
| **Title** | Senior Software Engineer |
| **Phone** | +250 786 096 228 |
| **Email** | [ishimwe0427@gmail.com](mailto:ishimwe0427@gmail.com) |

Available for product walkthroughs, customization, deployment support, and ongoing improvements.

---

## Why FairLeave exists for Fair Construction

Fair Construction runs sites, offices, and teams across real working calendars — not a single desk schedule. Leave decisions affect coverage, payroll planning, and site continuity. FairLeave was built so Fair Construction can:

- Request and approve leave in a clear, auditable path  
- Keep HR and leadership (MD / GM) in the right order  
- Onboard large numbers of workers without spreadsheets chaos  
- Brand the system as Fair Construction’s own leave OS  

This document is written for Fair Construction stakeholders. It explains what the system does today and why it fits your organization.

---

## What Fair Construction gets

### 1. A leave process that matches your hierarchy

| Stage | Who | What happens |
|--------|-----|----------------|
| Request | Employee / worker | Submits leave type, dates, reason; uploads evidence when required (e.g. sick leave) |
| Optional first review | Line manager | If enabled in Policies — manager reviews before HR |
| HR review | HR Admin | Confirms policy, documents, and coverage — not always the final word |
| Final decision | MD / GM (or Super Admin) | Approves or denies; request stays **pending** until this step |
| Outcome | Employee | In-app notification + official email |

HR can escalate to leadership. MD/GM can also finalize from earlier stages when needed. Until MD/GM finish, the request is not “done.”

### 2. Roles built for Fair Construction

| Role | Purpose |
|------|---------|
| **Employee** | Request leave, see balances and own requests |
| **Manager** | Team visibility; optional first leave review |
| **HR** | Add users + reset/change passwords only |
| **HR Admin** | Users, policies, departments, imports, HR approval stage, audit |
| **Admin** | Company admin: users, policies, reports, audit (not System Studio) |
| **Managing Director (MD)** | Final executive approval + user management |
| **General Manager (GM)** | Final executive approval + user management |
| **Super Admin** | Full control + System Studio (logo, colors, design look, tabs). Only Super Admin can manage other Super Admins |

**Gender-aware leave:** female employees see maternity (+ shared types); male employees see paternity (+ shared types).

**Audit log:** who / when / what, with Excel download for security reviews.

### 3. Departments you control

Add, rename, activate/deactivate, or remove departments (when empty). Assign every user to a department so HR, Team, and exports stay organized around Fair Construction’s structure (HR, Operations, Engineering, Finance, Fleet, Executive, and any new unit you add).

### 4. Documents for HR and leadership

When a leave type requires proof (sick leave, etc.), the employee uploads a file. **HR, MD, GM, Admin, and Super Admin** can:

- **View** the document in the browser  
- **Download** it for records  

No more chasing WhatsApp attachments for formal approval.

### 5. Notifications and official email

| Event | In-app | Email |
|-------|--------|-------|
| New leave request | HR (and manager when relevant) | — |
| HR clears stage | Employee + MD/GM alert | — |
| Final approve / deny | Employee | Official decision email |
| New account created | Employee | Welcome email with temp password + login link |
| Leave starts tomorrow | Leadership reminder | — |

Configure company SMTP (e.g. Gmail / Microsoft 365) so mail reaches real Fair Construction inboxes. Setup steps: `docs/EMAIL.md`.

### 6. Workforce at Fair Construction scale

- User directory with search and filters  
- **Bulk Excel/CSV import** with one-time credential download  
- Excel exports: all users, all leave requests, pending, denied/cancelled  
- Country-aware policies (e.g. RW and other countries you operate in)  
- Holidays, blackouts, balances, carry-over, notice rules  

### 7. Visibility for managers and leadership

- **Dashboard** with balances, pending items, and leave trend charts  
- **Calendar** of approved leave  
- **Team** coverage view  
- **Reports** by leave type and month  
- **Approvals** queue with search: waiting / done / denied  

### 8. Fair Construction branding — System Studio

Super Admin can set:

- Logo and brand colors  
- Product name, company name, login & landing copy  
- Which sidebar tabs appear and how they are named  
- Feature flags (self-request, manager-first approval, reports, bulk import, etc.)  

The product looks and feels like Fair Construction’s system — not a generic tool.

---

## Security & trust

- Strong passwords and forced change of temporary passwords  
- Session cookies with CSRF protection  
- Lockout after repeated failed logins  
- Audit trail of key actions  
- Role-based access — workers only see what they need  

---

## How Fair Construction should use it day to day

1. **Super Admin** completes first-time setup and System Studio branding.  
2. **HR** creates departments and roles, then adds users (or bulk imports).  
3. New users receive welcome email (or temp password once on screen).  
4. Employees request leave; sick leave includes document upload.  
5. HR reviews (and views documents); MD/GM give final approval.  
6. Employee is notified in the app and by email.  
7. Leadership exports Excel when they need workforce or leave reports.  

---

## Value for Fair Construction

| Challenge | FairLeave answer |
|-----------|------------------|
| “Who approved this and when?” | Clear stages + audit + notifications |
| “Sick leave without paper?” | Required upload + view/download for HR & leadership |
| “Hundreds of workers to onboard?” | Bulk import + credentials |
| “Does it look like our company?” | System Studio white-label |
| “Can MD/GM stay in control?” | Final approval stage before leave is done |
| “Can we grow departments & roles?” | Full department & custom role management |

---

## Technology (for IT)

Next.js · PostgreSQL · Prisma · TypeScript · Tailwind · Docker (local database)  
Local development typically runs at `http://127.0.0.1:3010`.

---

## Next step for Fair Construction

Adopt FairLeave as the official leave operating system for your workforce: brand it in System Studio, connect company email, load departments and users, and run the HR → MD/GM approval path on live requests.

For a walkthrough, training, or further customization for Fair Construction, contact:

**Ishimwe Jean Francois** · Senior Software Engineer  
Phone: **+250 786 096 228** · Email: **ishimwe0427@gmail.com**

For email configuration details, see **EMAIL.md**.  
For a company-neutral product pitch (external partners), see **PRODUCT-OVERVIEW.md**.
