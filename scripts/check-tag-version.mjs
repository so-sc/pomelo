import { readFileSync } from "node:fs";

const tag = process.argv[2] || process.env.GITHUB_REF_NAME || "";
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

if (tag !== `v${version}`) {
  console.error(`Tag "${tag}" does not match package.json version "v${version}". Bump the version before tagging.`);
  process.exit(1);
}
console.log(`Tag ${tag} matches package.json version.`);
