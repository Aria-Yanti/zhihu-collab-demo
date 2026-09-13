import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("zhihu_access_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  response.cookies.set("zhihu_oauth_state", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
