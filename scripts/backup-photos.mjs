// Downloads every visit photo out of the private storage bucket into a local
// folder — the database backup workflow covers the rows, this covers the files.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup-photos.mjs ./backups
//
// The service-role key is the "skip every permission" key: run this on a
// trusted computer only, paste the key into the terminal for that one run,
// never into a file that gets committed. Re-running skips files already saved.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see the comment at the top of this file).");
  process.exit(1);
}
const outRoot = join(process.argv[2] ?? "./backups", `photos-${new Date().toISOString().slice(0, 10)}`);
const sb = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "visit-photos";

async function listAll(prefix = "") {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const e of data ?? []) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id) out.push(path); // files have ids; folders don't
      else out.push(...(await listAll(path)));
    }
    if (!data || data.length < 1000) return out;
    offset += 1000;
  }
}

const paths = await listAll();
console.log(`${paths.length} photos in ${BUCKET}`);
let saved = 0, skipped = 0, failed = 0;
for (const p of paths) {
  const target = join(outRoot, p);
  if (existsSync(target)) { skipped++; continue; }
  const { data, error } = await sb.storage.from(BUCKET).download(p);
  if (error || !data) { failed++; console.error("failed:", p, error?.message); continue; }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Buffer.from(await data.arrayBuffer()));
  saved++;
  if (saved % 50 === 0) console.log(`  ${saved} saved…`);
}
console.log(`done: ${saved} saved, ${skipped} already present, ${failed} failed -> ${outRoot}`);
if (failed) process.exit(1);
