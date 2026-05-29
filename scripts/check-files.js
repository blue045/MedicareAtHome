import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const required = [
  "public/index.html",
  "public/adminpanel/index.html",
  "functions/api/doctors/index.js",
  "functions/api/doctors/[id].js",
  "functions/api/admin/login.js",
  "functions/api/settings/index.js",
  "functions/_lib/security.js",
  "functions/api/store/auth/verify-email.js"
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error("Missing files:\n" + missing.join("\n"));
  process.exit(1);
}

const shell = process.platform === "win32";
const command = shell ? "cmd" : "bash";
const args = shell
  ? ["/c", "for /r functions %f in (*.js) do node --check \"%f\" && for /r public\\assets\\js %f in (*.js) do node --check \"%f\""]
  : ["-lc", "find functions public/assets/js scripts -name '*.js' -print0 | xargs -0 -n 1 node --check"];
const result = spawnSync(command, args, { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
console.log("Project structure and JavaScript syntax look good.");
