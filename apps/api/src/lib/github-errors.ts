import { RequestError } from '@octokit/request-error';
import { HttpError } from '../middleware/error-handler.js';

export function mapGithubError(err: unknown, context: string): never {
  if (err instanceof RequestError) {
    if (err.status === 404) {
      throw new HttpError(404, `${context}_not_found`);
    }
    if (err.status === 403) {
      throw new HttpError(
        403,
        'github_forbidden — token may lack repo scope or rate limit hit',
      );
    }
    if (err.status === 401) {
      throw new HttpError(401, 'github_unauthorized — log in again via GitHub');
    }
    if (err.message.includes('Timeout') || err.message.includes('timeout')) {
      throw new HttpError(504, 'github_timeout — check internet/VPN and retry');
    }
    throw new HttpError(err.status || 502, `github_error: ${err.message}`);
  }
  throw err;
}
