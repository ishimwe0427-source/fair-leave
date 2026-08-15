import { spawnSync } from "child_process";

const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    FAIRLEAVE_RESET: "1",
  },
});

process.exit(result.status ?? 1);
