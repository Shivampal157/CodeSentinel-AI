import { RequestError } from '@octokit/request-error';
import { HttpError } from '../middleware/error-handler.js';
import { mapGithubError } from '../lib/github-errors.js';

describe('mapGithubError', () => {
  it('maps 404 to context_not_found', () => {
    expect(() =>
      mapGithubError(new RequestError('Not Found', 404, { request: { method: 'GET', url: '', headers: {} } }), 'pull_request'),
    ).toThrow(new HttpError(404, 'pull_request_not_found'));
  });

  it('maps timeout messages to github_timeout', () => {
    expect(() =>
      mapGithubError(
        new RequestError('Connect Timeout Error', 500, { request: { method: 'GET', url: '', headers: {} } }),
        'pull_request',
      ),
    ).toThrow(new HttpError(504, 'github_timeout — check internet/VPN and retry'));
  });

  it('rethrows unknown errors', () => {
    expect(() => mapGithubError(new Error('boom'), 'pull_request')).toThrow('boom');
  });
});

describe('HttpError', () => {
  it('carries status code', () => {
    const err = new HttpError(429, 'rate_limit_exceeded');
    expect(err.status).toBe(429);
    expect(err.message).toBe('rate_limit_exceeded');
  });
});
