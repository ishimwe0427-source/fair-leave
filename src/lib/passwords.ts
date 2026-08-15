import { randomBytes } from "crypto";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

export function generateTempPassword(length = 12) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHA[bytes[i] % ALPHA.length];
  }
  return out;
}

export function generateEmployeeCode(prefix = "EMP") {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}
