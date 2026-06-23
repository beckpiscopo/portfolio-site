#!/usr/bin/env node
// Fetch a static snapshot of GitHub contribution activity and write it to
// assets/data/contributions.json. Re-run to refresh, then redeploy.
//
//   node scripts/build-contributions.mjs            # default user (beckpiscopo)
//   node scripts/build-contributions.mjs someuser   # any GitHub user
//
// Data comes from the public github-contributions-api (jogruber), which reads
// the user's PUBLIC contribution graph. No token required.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const username = process.argv[2] || 'beckpiscopo';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'assets/data/contributions.json');
const api = `https://github-contributions-api.jogruber.de/v4/${username}?y=last`;

const res = await fetch(api);
if (!res.ok) {
  console.error(`Failed to fetch contributions for ${username}: HTTP ${res.status}`);
  process.exit(1);
}
const data = await res.json();
const days = (data.contributions || []).map(({ date, count, level }) => ({ date, count, level }));
const total = days.reduce((sum, d) => sum + d.count, 0);

const snapshot = {
  username,
  generatedAt: new Date().toISOString(),
  total,
  days,
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(snapshot));
console.log(`Wrote ${days.length} days (${total} contributions) for ${username} -> ${outPath}`);
