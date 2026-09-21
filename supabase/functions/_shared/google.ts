import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6';

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function readServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  }
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key');
  }
  return parsed;
}

export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const sa = readServiceAccount();
  const pem = sa.private_key.replace(/\\n/g, '\n');
  const key = await importPKCS8(pem, 'RS256');
  const jwt = await new SignJWT({ scope: scopes.join(' ') })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience(sa.token_uri ?? 'https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  const response = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('Google token response did not include access_token');
  }
  return json.access_token;
}
