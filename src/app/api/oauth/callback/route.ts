import { NextRequest, NextResponse } from "next/server";
import {
  ZHIHU_TOKEN_URL,
  fingerprint,
  oauthConfig,
  requirePublicRedirectUri,
  statesMatch
} from "@/lib/zhihu-oauth";

export const dynamic = "force-dynamic";

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("oauth", "error");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const error = requestUrl.searchParams.get("error");
  if (error) return redirectWithError(request, "你取消了知乎授权。");

  const code = requestUrl.searchParams.get("authorization_code") || requestUrl.searchParams.get("code");
  const receivedState = requestUrl.searchParams.get("state") || "";
  const expectedState = request.cookies.get("zhihu_oauth_state")?.value || "";
  if (!code) return redirectWithError(request, "知乎没有返回授权码。");
  if (!expectedState || !receivedState || !statesMatch(expectedState, receivedState)) {
    return redirectWithError(request, "OAuth 状态校验失败，请重新授权。");
  }

  const { appId, appKey, redirectUri } = oauthConfig();
  if (!appId || !appKey || !redirectUri) {
    return redirectWithError(request, "服务端 OAuth 配置不完整。");
  }

  try {
    requirePublicRedirectUri(redirectUri);
    const form = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code
    });
    const tokenResponse = await fetch(ZHIHU_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form
    });
    if (!tokenResponse.ok) {
      console.error(`[OAuth] token exchange failed: HTTP ${tokenResponse.status}`);
      return redirectWithError(request, "知乎授权交换失败，请检查回调地址和应用配置。");
    }

    const tokenData: unknown = await tokenResponse.json();
    if (
      typeof tokenData !== "object" ||
      tokenData === null ||
      !("access_token" in tokenData) ||
      typeof tokenData.access_token !== "string" ||
      !tokenData.access_token
    ) {
      console.error("[OAuth] token response did not contain an access token");
      return redirectWithError(request, "知乎未返回有效的登录凭证。");
    }

    const expiresIn =
      "expires_in" in tokenData && typeof tokenData.expires_in === "number"
        ? Math.max(60, tokenData.expires_in - 60)
        : 3600;
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("zhihu_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn
    });
    response.cookies.set("zhihu_oauth_state", "", { httpOnly: true, expires: new Date(0), path: "/" });
    console.info(`[OAuth] authorization completed; token fingerprint=${fingerprint(tokenData.access_token)}`);
    return response;
  } catch (error) {
    console.error(`[OAuth] token exchange failed: ${error instanceof Error ? error.message : String(error)}`);
    return redirectWithError(request, "知乎授权暂时无法完成，请稍后重试。");
  }
}
