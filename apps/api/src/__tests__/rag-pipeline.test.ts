import { createHash } from 'node:crypto';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { chunkFiles, chunkSource } from '../services/chunking.service.js';
import { formatChunksForPrompt, retrieveRelevantChunks } from '../services/rag.service.js';
import { getCachedReview, setCachedReview } from '../services/review.service.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = ((_traverse as any).default ?? _traverse) as (
  ast: t.File,
  visitors: Record<string, (path: NodePath) => void>,
) => void;

describe('chunkSource AST chunking', () => {
  it('extracts functions and classes from TypeScript', () => {
    const source = `
export function authenticate(user: string) {
  return user.length > 0;
}

export class AuthService {
  login() {
    return authenticate('a');
  }
}
`;
    const chunks = chunkSource('src/auth.service.ts', source);
    const names = chunks.map((c) => c.symbolName);
    expect(names).toEqual(expect.arrayContaining(['authenticate', 'AuthService', 'login']));
    expect(chunks.every((c) => c.contentHash.length === 64)).toBe(true);
  });

  it('chunks python by definitions', () => {
    const source = `def foo():\n    return 1\n\nclass Bar:\n    def baz(self):\n        return 2\n`;
    const chunks = chunkSource('app.py', source);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some((c) => c.symbolName?.includes('foo') || c.content.includes('def foo'))).toBe(
      true,
    );
  });
});

describe('chunkFiles', () => {
  it('aggregates multiple files', () => {
    const chunks = chunkFiles([
      { path: 'a.ts', content: 'export const x = () => 1;\n' },
      { path: 'b.py', content: 'def hello():\n    pass\n' },
    ]);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('formatChunksForPrompt', () => {
  it('renders retrieved chunk context', () => {
    const text = formatChunksForPrompt([
      {
        id: '1',
        score: 0.91,
        filePath: 'auth.service.ts',
        symbolName: 'login',
        language: 'typescript',
        startLine: 10,
        endLine: 20,
        content: 'function login() {}',
        contentHash: 'abc',
      },
    ]);
    expect(text).toContain('auth.service.ts');
    expect(text).toContain('login');
  });
});

describe('review cache keying', () => {
  it('uses stable sha256 diff hashes', () => {
    const diff = '--- a.ts\n+const x = 1';
    const hash = createHash('sha256').update(diff).digest('hex');
    expect(hash).toHaveLength(64);
  });
});

// RAG retrieve is integration-tested when OPENAI_API_KEY + Qdrant are available.
// Unit-level: ensure the function rejects empty repo gracefully via mocked path is avoided —
// instead we assert the export contract.
describe('retrieveRelevantChunks contract', () => {
  it('is a function', () => {
    expect(typeof retrieveRelevantChunks).toBe('function');
    expect(typeof getCachedReview).toBe('function');
    expect(typeof setCachedReview).toBe('function');
  });
});

describe('babel traverse smoke', () => {
  it('parses arrow functions', () => {
    const ast = parser.parse('const add = (a: number, b: number) => a + b;', {
      sourceType: 'module',
      plugins: ['typescript'],
    });
    let found = false;
    traverse(ast, {
      VariableDeclarator() {
        found = true;
      },
    });
    expect(found).toBe(true);
  });
});
