import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Daily Supabase keep-alive (Vercel Cron, see vercel.json).
 * Calls the keepalive_ping RPC (a real write) on each free-plan project
 * so Supabase does not auto-pause them after 7 days of inactivity.
 */
const PROJECTS = [
  { name: "travel-app", url: process.env.KEEPALIVE_TRAVEL_SUPABASE_URL, key: process.env.KEEPALIVE_TRAVEL_SUPABASE_KEY },
  { name: "wardrobe", url: process.env.KEEPALIVE_WARDROBE_SUPABASE_URL, key: process.env.KEEPALIVE_WARDROBE_SUPABASE_KEY },
];

async function ping({ name, url, key }: (typeof PROJECTS)[number]) {
  if (!url || !key) return { name, ok: false, error: "Missing env vars" };
  try {
    const res = await fetch(`${url}/rest/v1/rpc/keepalive_ping`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    const body = await res.json();
    return res.ok ? { name, ok: true, pinged_at: body as string } : { name, ok: false, status: res.status, error: body };
  } catch (error) {
    return { name, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.all(PROJECTS.map(ping));
  const ok = results.every((r) => r.ok);
  if (!ok) console.error("Supabase keep-alive failed:", results);

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
