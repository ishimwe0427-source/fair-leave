import net from "net";
import { spawn, execSync } from "child_process";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const preferred = Number(process.env.PORT || 3010);
const require = createRequire(import.meta.url);

function canListenOnHost(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

/** Check both IPv4 and IPv6 — Windows often binds Next on :::port */
async function canListen(port) {
  const v4 = await canListenOnHost(port, "0.0.0.0");
  if (!v4) return false;
  const v6 = await canListenOnHost(port, "::");
  return v6;
}

function killPid(pid) {
  if (!pid || Number.isNaN(pid)) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    // already gone
  }
}

/** Stop leftover `next dev` for this project so Next's single-instance lock doesn't block us. */
function clearStaleNextDev() {
  const lockPath = path.join(projectRoot, ".next", "dev", "lock");
  if (fs.existsSync(lockPath)) {
    try {
      const raw = fs.readFileSync(lockPath, "utf8").trim();
      // lock may be JSON or plain PID depending on Next version
      let pid = Number(raw);
      if (Number.isNaN(pid)) {
        try {
          const parsed = JSON.parse(raw);
          pid = Number(parsed.pid || parsed.PID || 0);
        } catch {
          pid = 0;
        }
      }
      if (pid > 0) {
        console.log(`Stopping previous FairLeave dev server (PID ${pid})...`);
        killPid(pid);
      }
    } catch {
      // ignore
    }
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  }

  // Windows: also sweep node processes whose command line is next dev in this project
  if (process.platform === "win32") {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Where-Object { $_.CommandLine -match 'fair-leave' -and $_.CommandLine -match 'next' } | Select-Object -ExpandProperty ProcessId"`,
        { encoding: "utf8" },
      );
      for (const line of out.split(/\r?\n/)) {
        const pid = Number(line.trim());
        if (pid > 0 && pid !== process.pid) {
          console.log(`Stopping leftover node process (PID ${pid})...`);
          killPid(pid);
        }
      }
    } catch {
      // ignore
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

clearStaleNextDev();
await sleep(800);

let port = null;
for (const candidate of [preferred, ...Array.from({ length: 29 }, (_, i) => preferred + 1 + i)]) {
  if (await canListen(candidate)) {
    port = candidate;
    break;
  }
  // If preferred is still busy after cleanup, try once more to free project next processes
  if (candidate === preferred) {
    console.log(`Port ${candidate} still busy — clearing again...`);
    clearStaleNextDev();
    await sleep(800);
    if (await canListen(candidate)) {
      port = candidate;
      break;
    }
  }
  console.log(`Port ${candidate} busy — trying next...`);
}

if (!port) {
  console.error("No free port found between", preferred, "and", preferred + 29);
  process.exit(1);
}

console.log(`Starting FairLeave on http://localhost:${port}`);

// Spawn Next via node (not npx.cmd) — Windows Node 24 throws spawn EINVAL for .cmd without shell.
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", "127.0.0.1", "-p", String(port)],
  {
    stdio: "inherit",
    shell: false,
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
    },
  },
);

child.on("error", (err) => {
  console.error("Failed to start Next.js:", err.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 0));
