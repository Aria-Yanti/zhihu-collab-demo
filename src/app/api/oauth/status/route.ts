import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("zhihu_access_token")?.value;
  return NextResponse.json({ ok: true, authenticated: Boolean(token) });
}
