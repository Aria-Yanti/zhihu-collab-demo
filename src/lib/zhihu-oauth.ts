import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const ZHIHU_AUTHORIZE_URL = "https://openapi.zhihu.com/authorize";
export const ZHIHU_TOKEN_URL = "https://openapi.zhihu.com/access_token";

export function oauthConfig() {
  return {
    appId: process.env.ZHIHU_APP_ID?.trim() || "",
    appKey: process.env.ZHIHU_OAUTH_APP_KEY?.trim() || "",
    redirectUri: process.env.ZHIHU_REDIRECT_URI?.trim() || ""
  };
}

export function requirePublicRedirectUri(redirectUri: string): URL {
  const parsed = new URL(redirectUri);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/api/oauth/callback") {
    throw new Error("ZHIHU_REDIRECT_URI must be an HTTPS callback ending in /api/oauth/callback");
  }
  return parsed;
}

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function statesMatch(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
