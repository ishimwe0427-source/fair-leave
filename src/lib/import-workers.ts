import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Role } from "@prisma/client";

export type WorkerImportRow = {
  email: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
  role?: string;
  jobTitle?: string;
  phone?: string;
  departmentCode?: string;
  managerEmail?: string;
  country?: string;
  hireDate?: string;
  status?: string;
};

export type ParsedWorkerRow = {
  rowNumber: number;
  data: WorkerImportRow;
  error?: string;
};

const ROLE_MAP: Record<string, Role> = {
  employee: "EMPLOYEE",
  manager: "MANAGER",
  hr: "HR",
  "hr officer": "HR",
  hr_officer: "HR",
  hr_admin: "HR_ADMIN",
  "hr admin": "HR_ADMIN",
  admin: "ADMIN",
  md: "MD",
  "managing director": "MD",
  gm: "GM",
  "general manager": "GM",
  super_admin: "SUPER_ADMIN",
  "super admin": "SUPER_ADMIN",
};

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const FIELD_ALIASES: Record<string, keyof WorkerImportRow> = {
  email: "email",
  workemail: "email",
  firstname: "firstName",
  first: "firstName",
  lastname: "lastName",
  last: "lastName",
  employeecode: "employeeCode",
  staffid: "employeeCode",
  empcode: "employeeCode",
  role: "role",
  jobtitle: "jobTitle",
  title: "jobTitle",
  phone: "phone",
  mobile: "phone",
  department: "departmentCode",
  departmentcode: "departmentCode",
  dept: "departmentCode",
  manageremail: "managerEmail",
  manager: "managerEmail",
  country: "country",
  hiredate: "hireDate",
  startdate: "hireDate",
  status: "status",
};

function mapRow(raw: Record<string, unknown>): WorkerImportRow {
  const mapped: Partial<WorkerImportRow> = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = FIELD_ALIASES[normalizeKey(key)];
    if (!field) continue;
    const text = value == null ? "" : String(value).trim();
    if (text) mapped[field] = text;
  }
  return mapped as WorkerImportRow;
}

export function parseRole(value?: string): Role {
  if (!value) return "EMPLOYEE";
  const normalized = value.trim().toLowerCase();
  return ROLE_MAP[normalized] || ROLE_MAP[normalized.replace(/\s+/g, "_")] || "EMPLOYEE";
}

export function parseWorkbook(buffer: Buffer, filename: string): ParsedWorkerRow[] {
  const lower = filename.toLowerCase();
  let rows: Record<string, unknown>[] = [];

  if (lower.endsWith(".csv")) {
    const parsed = Papa.parse<Record<string, unknown>>(buffer.toString("utf8"), {
      header: true,
      skipEmptyLines: true,
    });
    rows = parsed.data;
  } else {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
  }

  return rows.map((raw, index) => {
    const data = mapRow(raw);
    const rowNumber = index + 2;
    if (!data.email || !data.firstName || !data.lastName) {
      return {
        rowNumber,
        data,
        error: "email, firstName and lastName are required",
      };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { rowNumber, data, error: "Invalid email" };
    }
    return { rowNumber, data };
  });
}

export const IMPORT_TEMPLATE_HEADERS = [
  "email",
  "firstName",
  "lastName",
  "employeeCode",
  "role",
  "jobTitle",
  "phone",
  "departmentCode",
  "managerEmail",
  "country",
  "hireDate",
  "status",
];
