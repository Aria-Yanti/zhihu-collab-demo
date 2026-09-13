import { NextResponse } from "next/server";
import {
  ZHIHU_AUTHORIZE_URL,
  createOAuthState,
  oauthConfig,
  requirePublicRedirectUri
} from "@/lib/zhihu-oauth";

export const dynamic = "force-dynamic";

export function GET() {
  const { appId, redirectUri } = oauthConfig();
  if (!appId || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "OAuth is not configured. Set ZHIHU_APP_ID and ZHIHU_REDIRECT_URI." },
      { status: 503 }
    );
  }

  try {
    requirePublicRedirectUri(redirectUri);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid OAuth redirect URI" },
      { status: 503 }
    );
  }

  const state = createOAuthState();
  const authorizeUrl = new URL(ZHIHU_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("app_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("zhihu_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return response;
}
