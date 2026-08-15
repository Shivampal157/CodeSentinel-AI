import { OAUTH_STATE_TTL_SEC, REDIS_KEYS } from '@codesentinel/shared';
import { env, requireGitHubOAuth } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { UserModel } from '../models/user.model.js';
import {
  createOAuthState,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from './token.service.js';

type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

export async function buildGitHubAuthorizeUrl(): Promise<{ url: string; state: string }> {
  const { clientId } = requireGitHubOAuth();
  const state = createOAuthState();
  await redis.set(REDIS_KEYS.oauthState(state), '1', 'EX', OAUTH_STATE_TTL_SEC);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email repo',
    state,
    allow_signup: 'true',
  });

  return {
    url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    state,
  };
}

async function exchangeCode(code: string): Promise<string> {
  const { clientId, clientSecret } = requireGitHubOAuth();
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  const body = (await response.json()) as GitHubTokenResponse & { error?: string };
  if (body.error || !body.access_token) {
    throw new Error(`GitHub token exchange error: ${body.error ?? 'missing_token'}`);
  }
  return body.access_token;
}

async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'CodeSentinel-AI',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub user fetch failed: ${response.status}`);
  }
  return (await response.json()) as GitHubUser;
}

export async function handleGitHubCallback(code: string, state: string) {
  const stateOk = await redis.get(REDIS_KEYS.oauthState(state));
  if (!stateOk) {
    throw new Error('invalid_oauth_state');
  }
  await redis.del(REDIS_KEYS.oauthState(state));

  const githubAccessToken = await exchangeCode(code);
  const ghUser = await fetchGitHubUser(githubAccessToken);

  const user = await UserModel.findOneAndUpdate(
    { githubId: String(ghUser.id) },
    {
      $set: {
        login: ghUser.login,
        name: ghUser.name ?? undefined,
        email: ghUser.email ?? undefined,
        avatarUrl: ghUser.avatar_url,
        accessToken: githubAccessToken,
        lastLoginAt: new Date(),
      },
      $setOnInsert: {
        githubId: String(ghUser.id),
      },
    },
    { upsert: true, new: true },
  );

  const accessToken = signAccessToken(user._id.toString(), user.login);
  const refreshToken = await issueRefreshToken(user._id.toString(), user.login);

  logger.info('github oauth login', { userId: user._id.toString(), login: user.login });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      login: user.login,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function refreshSession(refreshToken: string) {
  const rotated = await rotateRefreshToken(refreshToken);
  return {
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
  };
}

export async function logout(refreshToken?: string) {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
}
