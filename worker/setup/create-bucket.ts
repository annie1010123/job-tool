import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const resp = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      id: "resumes",
      name: "resumes",
      public: false,
      file_size_limit: 10 * 1024 * 1024,
      allowed_mime_types: ["application/pdf"],
    }),
  });

  const data = await resp.json();
  if (!resp.ok && !data.error?.includes("already exists")) {
    console.error("Failed:", data); process.exit(1);
  }
  console.log("✅ Bucket 'resumes' ready");

  const list = await fetch(`${url}/storage/v1/bucket`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const buckets = await list.json();
  console.log("All buckets:", buckets.map((b: { name: string }) => b.name).join(", "));
}

main().catch(console.error);
