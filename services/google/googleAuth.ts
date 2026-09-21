import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';

import { GOOGLE_SCOPES, GOOGLE_TOKEN_KEYS } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/services/logger';
import { AppError } from '@/types/errors';

WebBrowser.maybeCompleteAuthSession();

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

function getClientId(): string {
  return env.googleAndroidClientId || env.googleClientId;
}

export function isGoogleConfigured(): boolean {
  return getClientId().length > 0;
}

export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'locationtracker',
    path: 'oauthredirect',
  });
}

async function readTokens(): Promise<GoogleTokens | null> {
  const accessToken = await SecureStore.getItemAsync(GOOGLE_TOKEN_KEYS.accessToken, secureOptions);
  const refreshToken = await SecureStore.getItemAsync(GOOGLE_TOKEN_KEYS.refreshToken, secureOptions);
  const expiresAtRaw = await SecureStore.getItemAsync(GOOGLE_TOKEN_KEYS.expiresAt, secureOptions);
  if (!accessToken) {
    return null;
  }
  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAtRaw ? Number(expiresAtRaw) : 0,
  };
}

async function writeTokens(tokens: GoogleTokens): Promise<void> {
  await SecureStore.setItemAsync(GOOGLE_TOKEN_KEYS.accessToken, tokens.accessToken, secureOptions);
  await SecureStore.setItemAsync(GOOGLE_TOKEN_KEYS.expiresAt, String(tokens.expiresAt), secureOptions);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(
      GOOGLE_TOKEN_KEYS.refreshToken,
      tokens.refreshToken,
      secureOptions,
    );
  }
}

export async function clearGoogleTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEYS.accessToken);
  await SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEYS.refreshToken);
  await SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEYS.expiresAt);
}

export async function isGoogleSignedIn(): Promise<boolean> {
  const tokens = await readTokens();
  return Boolean(tokens?.accessToken);
}

export async function signInWithGoogle(): Promise<GoogleTokens> {
  const clientId = getClientId();
  if (!clientId) {
    throw new AppError(
      'google_api_error',
      'Google OAuth client ID is not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID.',
    );
  }

  const redirectUri = getRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: [...GOOGLE_SCOPES],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  const result = await request.promptAsync({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  });

  if (result.type !== 'success' || !result.params.code) {
    throw new AppError('google_api_error', 'Google sign-in was cancelled or failed.');
  }

  const tokenResponse = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: clientId,
      code: result.params.code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: request.codeVerifier ?? '',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  const accessToken = String(tokenResponse.data.access_token ?? '');
  const refreshToken = tokenResponse.data.refresh_token
    ? String(tokenResponse.data.refresh_token)
    : null;
  const expiresIn = Number(tokenResponse.data.expires_in ?? 3600);
  if (!accessToken) {
    throw new AppError('google_api_error', 'Google token exchange returned no access token.');
  }

  const tokens: GoogleTokens = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  await writeTokens(tokens);
  logger.info('Google OAuth completed');
  return tokens;
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = getClientId();
  try {
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const accessToken = String(tokenResponse.data.access_token ?? '');
    if (!accessToken) {
      throw new Error('empty access token');
    }
    const expiresIn = Number(tokenResponse.data.expires_in ?? 3600);
    const tokens: GoogleTokens = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    await writeTokens(tokens);
    return tokens;
  } catch (error) {
    await clearGoogleTokens();
    throw new AppError('oauth_expired', 'Google access expired. Sign in again.', error);
  }
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) {
    throw new AppError('oauth_expired', 'Google Drive is not connected.');
  }
  if (tokens.expiresAt - 60_000 > Date.now()) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    throw new AppError('oauth_expired', 'Google access expired and no refresh token is stored.');
  }
  const refreshed = await refreshAccessToken(tokens.refreshToken);
  return refreshed.accessToken;
}
