import { existsSync } from "node:fs";

const required = [
  "public/index.html",
  "public/adminpanel/index.html",
  "functions/api/doctors/index.js",
  "functions/api/doctors/[id].js",
  "functions/api/admin/login.js",
  "functions/api/settings/index.js"
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error("Missing files:\n" + missing.join("\n"));
  process.exit(1);
}
console.log("Project structure looks good.");
