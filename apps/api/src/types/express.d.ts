export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        login: string;
        githubId: string;
      };
    }
  }
}
