import { config } from "dotenv";
config({ path: ".env.local" });

import pg from "pg";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DIRECT_URL! });
  await client.connect();

  await client.query(`ALTER TABLE "Jd" ADD COLUMN IF NOT EXISTS "applicantCount" INTEGER`);
  console.log("✅ applicantCount column added");

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
