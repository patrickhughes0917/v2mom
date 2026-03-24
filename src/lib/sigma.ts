/**
 * Sigma API helpers - auth and export
 * Docs: https://help.sigmacomputing.com/docs/get-started-with-sigmas-api
 */

const DEFAULT_BASES = [
  "https://aws-api.sigmacomputing.com",
  "https://api.sigmacomputing.com",
];

async function tryAuth(base: string, clientId: string, clientSecret: string): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${base}/v2/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; accessToken?: string };
  return data.access_token ?? data.accessToken ?? null;
}

export async function getSigmaAccessToken(): Promise<string> {
  const { token } = await getSigmaAuth();
  return token;
}

export async function getSigmaAuth(): Promise<{ token: string; baseUrl: string }> {
  const clientId = (process.env.SIGMA_CLIENT_ID || "").trim();
  const clientSecret = (process.env.SIGMA_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("SIGMA_CLIENT_ID and SIGMA_CLIENT_SECRET required");
  }

  const bases = process.env.SIGMA_API_BASE_URL
    ? [process.env.SIGMA_API_BASE_URL.replace(/\/$/, "")]
    : DEFAULT_BASES;

  for (const base of bases) {
    const token = await tryAuth(base, clientId, clientSecret);
    if (token) {
      return { token, baseUrl: base };
    }
  }

  throw new Error(
    "Sigma auth failed. Check credentials and SIGMA_API_BASE_URL (try https://aws-api.sigmacomputing.com)."
  );
}
