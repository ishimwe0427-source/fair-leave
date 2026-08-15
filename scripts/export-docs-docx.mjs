import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  ExternalHyperlink,
} from "docx";

const outDir = path.join(process.cwd(), "docs");

const red = "C62828";
const dark = "101820";
const muted = "5B6775";
const light = "F4F7FB";
const border = "D5DDE7";

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: border };
const borders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0, line: 276 },
    alignment: opts.align,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        size: opts.size ?? 22,
        font: "Calibri",
        color: opts.color ?? dark,
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 200 },
    children: [
      new TextRun({ text, bold: true, size: 36, font: "Calibri", color: dark }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: red, space: 4 },
    },
    children: [
      new TextRun({ text, bold: true, size: 28, font: "Calibri", color: red }),
    ],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text, bold: true, size: 24, font: "Calibri", color: dark }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `•  ${text}`, size: 22, font: "Calibri", color: dark }),
    ],
  });
}

function numbered(n, text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: `${n}.  ${text}`,
        size: 22,
        font: "Calibri",
        color: dark,
      }),
    ],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    borders,
    width: { size: opts.width ?? 2500, type: WidthType.DXA },
    shading: opts.header
      ? { type: ShadingType.CLEAR, fill: red }
      : opts.alt
        ? { type: ShadingType.CLEAR, fill: light }
        : undefined,
    children: [
      new Paragraph({
        spacing: { after: 60, before: 60 },
        children: [
          new TextRun({
            text,
            bold: opts.header || opts.bold,
            size: 20,
            font: "Calibri",
            color: opts.header ? "FFFFFF" : dark,
          }),
        ],
      }),
    ],
  });
}

function table(headers, rows, widths) {
  const w = widths || headers.map(() => Math.floor(9000 / headers.length));
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { header: true, width: w[i] })),
      }),
      ...rows.map(
        (row, ri) =>
          new TableRow({
            children: row.map((c, i) =>
              cell(c, { width: w[i], alt: ri % 2 === 1, bold: i === 0 }),
            ),
          }),
      ),
    ],
  });
}

function contactBlock() {
  return [
    h2("Contact"),
    p("Ishimwe Jean Francois", { bold: true, size: 24 }),
    p("Senior Software Engineer", { color: muted }),
    p("Phone: +250 786 096 228"),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Email: ", size: 22, font: "Calibri", color: dark }),
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: "ishimwe0427@gmail.com",
              style: "Hyperlink",
              size: 22,
              font: "Calibri",
              color: red,
            }),
          ],
          link: "mailto:ishimwe0427@gmail.com",
        }),
      ],
    }),
    p(
      "Available for product walkthroughs, customization, deployment support, and ongoing improvements.",
      { italics: true, color: muted },
    ),
  ];
}

function coverMeta(lines) {
  return lines.map((line) => p(line, { color: muted, after: 60 }));
}

async function writeDoc(filename, children) {
  const doc = new Document({
    creator: "Ishimwe Jean Francois",
    title: filename.replace(/\.docx$/, ""),
    description: "Leave management product documentation",
    styles: {
      default: {
        document: {
          styles: [{ id: "Normal", run: { font: "Calibri", size: 22 } }],
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  const out = path.join(outDir, filename);
  fs.writeFileSync(out, buffer);
  console.log("Wrote", out);
}

async function fairDoc() {
  await writeDoc("FairLeave-Fair-Construction.docx", [
    h1("FairLeave for Fair Construction Ltd"),
    ...coverMeta([
      "Product brief & capability guide  ·  Version 1.0",
      "Prepared for: Fair Construction leadership, HR, and operations",
    ]),
    ...contactBlock(),
    h2("Why FairLeave exists for Fair Construction"),
    p(
      "Fair Construction runs sites, offices, and teams across real working calendars — not a single desk schedule. Leave decisions affect coverage, payroll planning, and site continuity. FairLeave was built so Fair Construction can:",
    ),
    bullet("Request and approve leave in a clear, auditable path"),
    bullet("Keep HR and leadership (MD / GM) in the right order"),
    bullet("Onboard large numbers of workers without spreadsheet chaos"),
    bullet("Brand the system as Fair Construction’s own leave OS"),
    p(
      "This document is written for Fair Construction stakeholders. It explains what the system does today and why it fits your organization.",
    ),

    h2("What Fair Construction gets"),
    h3("1. A leave process that matches your hierarchy"),
    table(
      ["Stage", "Who", "What happens"],
      [
        [
          "Request",
          "Employee / worker",
          "Submits leave type, dates, reason; uploads evidence when required (e.g. sick leave)",
        ],
        [
          "Optional first review",
          "Line manager",
          "If enabled in Policies — manager reviews before HR",
        ],
        [
          "HR review",
          "HR Admin",
          "Confirms policy, documents, and coverage — not always the final word",
        ],
        [
          "Final decision",
          "MD / GM (or Super Admin)",
          "Approves or denies; request stays pending until this step",
        ],
        ["Outcome", "Employee", "In-app notification + official email"],
      ],
      [2200, 2400, 4400],
    ),
    p(
      "HR can escalate to leadership. MD/GM can also finalize from earlier stages when needed. Until MD/GM finish, the request is not “done.”",
      { before: 160 },
    ),

    h3("2. Roles built for Fair Construction"),
    table(
      ["Role", "Purpose"],
      [
        ["Employee", "Request leave, see balances and own requests"],
        ["Manager", "Team visibility; optional first leave review"],
        [
          "HR Admin",
          "Users, policies, departments, imports, HR approval stage",
        ],
        ["Managing Director (MD)", "Final executive approval"],
        ["General Manager (GM)", "Final executive approval"],
        ["Super Admin", "Full control + System Studio (branding & modules)"],
      ],
      [3200, 5800],
    ),
    p(
      "You can also create custom role labels (for example “Site Supervisor”) and map them to the right permission level — without breaking the leave chain.",
      { before: 160 },
    ),

    h3("3. Departments you control"),
    p(
      "Add, rename, activate/deactivate, or remove departments (when empty). Assign every user to a department so HR, Team, and exports stay organized around Fair Construction’s structure (HR, Operations, Engineering, Finance, Fleet, Executive, and any new unit you add).",
    ),

    h3("4. Documents for HR and leadership"),
    p(
      "When a leave type requires proof (sick leave, etc.), the employee uploads a file. HR, MD, GM, Admin, and Super Admin can:",
    ),
    bullet("View the document in the browser"),
    bullet("Download it for records"),
    p("No more chasing WhatsApp attachments for formal approval."),

    h3("5. Notifications and official email"),
    table(
      ["Event", "In-app", "Email"],
      [
        ["New leave request", "HR (and manager when relevant)", "—"],
        ["HR clears stage", "Employee + MD/GM alert", "—"],
        ["Final approve / deny", "Employee", "Official decision email"],
        [
          "New account created",
          "Employee",
          "Welcome email with temp password + login link",
        ],
        ["Leave starts tomorrow", "Leadership reminder", "—"],
      ],
      [3000, 3200, 2800],
    ),
    p(
      "Configure company SMTP (e.g. Gmail / Microsoft 365) so mail reaches real Fair Construction inboxes.",
      { before: 160 },
    ),

    h3("6. Workforce at Fair Construction scale"),
    bullet("User directory with search and filters"),
    bullet("Bulk Excel/CSV import with one-time credential download"),
    bullet("Excel exports: all users, all leave requests, pending, denied/cancelled"),
    bullet("Country-aware policies (e.g. RW and other countries you operate in)"),
    bullet("Holidays, blackouts, balances, carry-over, notice rules"),

    h3("7. Visibility for managers and leadership"),
    bullet("Dashboard with balances, pending items, and leave trend charts"),
    bullet("Calendar of approved leave"),
    bullet("Team coverage view"),
    bullet("Reports by leave type and month"),
    bullet("Approvals queue with search: waiting / done / denied"),

    h3("8. Fair Construction branding — System Studio"),
    p("Super Admin can set:"),
    bullet("Logo and brand colors"),
    bullet("Product name, company name, login & landing copy"),
    bullet("Which sidebar tabs appear and how they are named"),
    bullet("Feature flags (self-request, manager-first approval, reports, bulk import, etc.)"),
    p("The product looks and feels like Fair Construction’s system — not a generic tool."),

    h2("Security & trust"),
    bullet("Strong passwords and forced change of temporary passwords"),
    bullet("Session cookies with CSRF protection"),
    bullet("Lockout after repeated failed logins"),
    bullet("Audit trail of key actions"),
    bullet("Role-based access — workers only see what they need"),

    h2("How Fair Construction should use it day to day"),
    numbered(1, "Super Admin completes first-time setup and System Studio branding."),
    numbered(2, "HR creates departments and roles, then adds users (or bulk imports)."),
    numbered(3, "New users receive welcome email (or temp password once on screen)."),
    numbered(4, "Employees request leave; sick leave includes document upload."),
    numbered(5, "HR reviews (and views documents); MD/GM give final approval."),
    numbered(6, "Employee is notified in the app and by email."),
    numbered(7, "Leadership exports Excel when they need workforce or leave reports."),

    h2("Value for Fair Construction"),
    table(
      ["Challenge", "FairLeave answer"],
      [
        ["Who approved this and when?", "Clear stages + audit + notifications"],
        [
          "Sick leave without paper?",
          "Required upload + view/download for HR & leadership",
        ],
        ["Hundreds of workers to onboard?", "Bulk import + credentials"],
        ["Does it look like our company?", "System Studio white-label"],
        [
          "Can MD/GM stay in control?",
          "Final approval stage before leave is done",
        ],
        [
          "Can we grow departments & roles?",
          "Full department & custom role management",
        ],
      ],
      [4200, 4800],
    ),

    h2("Technology (for IT)"),
    p(
      "Next.js · PostgreSQL · Prisma · TypeScript · Tailwind · Docker (local database). Local development typically runs at http://127.0.0.1:3010.",
      { before: 120 },
    ),

    h2("Next step for Fair Construction"),
    p(
      "Adopt FairLeave as the official leave operating system for your workforce: brand it in System Studio, connect company email, load departments and users, and run the HR → MD/GM approval path on live requests.",
    ),
    p(
      "For a walkthrough, training, or further customization for Fair Construction, contact:",
    ),
    p("Ishimwe Jean Francois · Senior Software Engineer", { bold: true }),
    p("Phone: +250 786 096 228 · Email: ishimwe0427@gmail.com"),
  ]);
}

async function productDoc() {
  await writeDoc("LeaveOS-Product-Overview.docx", [
    h1("Leave OS — Product Overview"),
    ...coverMeta([
      "Enterprise leave management you can shape for any organization",
      "Version 1.0  ·  For decision makers, HR leaders, and partners",
    ]),
    h2("Built & delivered by"),
    p("Ishimwe Jean Francois", { bold: true, size: 24 }),
    p("Senior Software Engineer", { color: muted }),
    p("Phone: +250 786 096 228"),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Email: ", size: 22, font: "Calibri", color: dark }),
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: "ishimwe0427@gmail.com",
              style: "Hyperlink",
              size: 22,
              font: "Calibri",
              color: red,
            }),
          ],
          link: "mailto:ishimwe0427@gmail.com",
        }),
      ],
    }),
    p(
      "I design and adapt this system to each organization’s departments, roles, approval path, branding, and business rules — and I stay available for demos, deployment, and customization.",
      { italics: true, color: muted },
    ),

    h2("The opportunity"),
    p(
      "Most organizations still mix WhatsApp messages, spreadsheets, and email threads to approve leave. That breaks down when you have:",
    ),
    bullet("Multiple departments and job roles"),
    bullet("Managers, HR, and executives who each need a turn"),
    bullet("Supporting documents (medical notes, etc.)"),
    bullet("Hundreds of employees to onboard"),
    bullet("A brand that should feel like your company — not a generic SaaS skin"),
    p(
      "This product is a full leave operating system: request → review → final decision → notify → report — with structure you can adapt to your business.",
    ),

    h2("Why organizations choose it"),
    h3("Built to match your hierarchy — not a fixed template"),
    p("Approval is multi-stage and configurable:"),
    numbered(1, "Employee submits a request"),
    numbered(2, "Manager (optional) can review first if you turn that on"),
    numbered(3, "HR reviews policy and documents"),
    numbered(
      4,
      "Executive roles (e.g. Director / General Manager equivalents) give the final approve or deny",
    ),
    p(
      "Until the final stage completes, the request stays pending. Leadership stays in control.",
    ),

    h3("Departments and roles you define"),
    p("You are not locked into one org chart."),
    bullet("Create, edit, activate/deactivate, or remove departments"),
    bullet(
      "Use standard permission levels (Employee, Manager, HR, Executive, Super Admin)",
    ),
    bullet(
      "Create custom role names for your business (e.g. Branch Lead, Clinic Admin, Site Supervisor) and map them to the right access level",
    ),
    bullet("Assign every person to the right department and reporting manager"),
    p(
      "When you sell or deploy this for another company, departments and roles are reshaped to that business — same engine, their structure.",
    ),

    h3("White-label ready"),
    p("A Super Admin System Studio lets you change:"),
    bullet("Logo and colors"),
    bullet("Company name and product name"),
    bullet("Login and landing page text"),
    bullet("Which modules appear in the menu"),
    bullet(
      "Feature switches (self-service leave, manager-first approval, reports, bulk import, and more)",
    ),
    p("Prospects see their brand from day one."),

    h3("Documents where decisions happen"),
    p(
      "If a leave type requires evidence, employees upload it with the request. Authorized reviewers can view or download the file inside the system — no separate file share.",
    ),

    h3("Notifications people actually see"),
    bullet("In-app alerts when a request needs action"),
    bullet("Alerts when a request is approved or denied"),
    bullet("Welcome message when an account is created"),
    bullet("Reminder when leave is about to start"),
    p(
      "Plus official email for account creation (with temporary password and login link) and for final leave decisions — once SMTP is connected to the organization’s mail.",
    ),

    h3("Scale and reporting"),
    bullet("Bulk Excel/CSV import with one-time credentials for new staff"),
    bullet("Excel exports (users, all requests, pending, denied)"),
    bullet("Dashboard trends, calendar, team coverage, and charts"),
    bullet("Searchable approval queues (waiting / done / denied)"),

    h3("Country-aware policies"),
    p(
      "Leave entitlements, holidays, and working-day calculations can follow the employee’s country — useful for regional or multi-country employers.",
    ),

    h3("Security by default"),
    p(
      "Password rules, temporary password forced change, CSRF protection, session control, login lockout, role-based access, and audit logging.",
    ),

    h2("Who uses it"),
    table(
      ["Persona", "What they do"],
      [
        ["Employee", "Request leave, track balances, see decisions"],
        ["Manager", "See the team; optional first approval"],
        [
          "HR / Admin",
          "Users, departments, roles, policies, HR stage, imports",
        ],
        ["Executive", "Final approve / deny"],
        ["Super Admin", "Branding, modules, full system control"],
      ],
      [2800, 6200],
    ),

    h2("What we customize for each client"),
    p("This is the message for partners and buyers:", { before: 120 }),
    p(
      "The same product can be adapted to your company. We configure departments, user roles, approval path, branding, leave types, policies, and email so the system matches how your business actually works — construction, NGOs, clinics, logistics, education, or any multi-department workforce.",
      { italics: true },
    ),
    table(
      ["Area", "Examples"],
      [
        ["Organization", "Departments, job titles, manager hierarchy"],
        ["Roles", "Custom labels + permission mapping"],
        ["Approval", "Manager on/off; who has final say"],
        [
          "Leave rules",
          "Types, entitlements, documents required, blackouts",
        ],
        ["Brand", "Logo, colors, product name, language of screens"],
        ["Access", "Which menus HR vs managers vs executives see"],
        ["Email", "Company SMTP and wording of official messages"],
      ],
      [2800, 6200],
    ),

    h2("Sample day-one journey (any company)"),
    numbered(1, "Super Admin creates the organization account and branding"),
    numbered(2, "HR defines departments and roles"),
    numbered(3, "Staff are added or bulk-imported"),
    numbered(4, "Employees request leave (with documents when needed)"),
    numbered(5, "Approvers act in the queue; employees get notified and emailed"),
    numbered(6, "Leadership exports Excel or opens reports when needed"),

    h2("Technology snapshot"),
    p(
      "Modern web stack: Next.js, PostgreSQL, TypeScript, Prisma, secure sessions, and Docker-friendly local database. Suitable for internal company deployment or hosted environments.",
    ),

    h2("Call to action"),
    p(
      "If your organization needs leave that is structured, branded, and adaptable:",
    ),
    bullet("See a live walkthrough of request → HR → executive final decision"),
    bullet("Review how departments and custom roles map to your org chart"),
    bullet("Discuss white-label branding and SMTP for official email"),
    p(
      "This product is designed to be reshaped around your business — not the other way around.",
      { bold: true, before: 120 },
    ),
    ...contactBlock(),
    p(
      "Ready to demo the product, map it to your departments and user roles, and modify it for your company or industry use.",
      { italics: true, color: muted },
    ),
  ]);
}

await fairDoc();
await productDoc();
