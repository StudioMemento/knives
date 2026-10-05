import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
let manifest;
try {
  manifest = JSON.parse(readFileSync(resolve(root, "asset-manifest.json"), "utf8"));
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("The asset manifest is empty.");
  }
} catch (error) {
  console.error(`Cannot verify deployment assets: ${error.message}`);
  process.exit(1);
}

const failures = [];
for (const asset of manifest.files) {
  const filename = resolve(root, asset.path);
  if (!filename.startsWith(resolve(root, "public") + sep)) {
    failures.push(`Invalid asset path: ${asset.path}`);
    continue;
  }
  try {
    const data = readFileSync(filename);
    const hash = createHash("sha256").update(data).digest("hex");
    if (data.length !== asset.bytes || hash !== asset.sha256) {
      failures.push(`Incomplete or changed: ${asset.path}`);
    }
  } catch (error) {
    failures.push(`${error.code === "ENOENT" ? "Missing" : "Cannot read"}: ${asset.path}`);
  }
}

if (failures.length) {
  console.error("\nDeployment stopped: required 3D assets, fonts or icons are missing or damaged.");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error("\nRestore the complete public/ folder from the ZIP, then run npm run build again.\n");
  process.exit(1);
}

console.log(`Asset integrity verified: ${manifest.files.length} files, including all five knives.`);
