import { createHash } from 'node:crypto';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { logger } from '../lib/logger.js';

// babel/traverse CJS interop under NodeNext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = ((_traverse as any).default ?? _traverse) as (ast: t.File, visitors: any) => void;

export type CodeChunk = {
  filePath: string;
  language: string;
  symbolName?: string;
  symbolKind?: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
};

function extLanguage(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    go: 'go',
    java: 'java',
    rs: 'rust',
    rb: 'ruby',
  };
  return map[ext] ?? ext;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function sliceLines(source: string, start: number, end: number): string {
  return source
    .split(/\r?\n/)
    .slice(start - 1, end)
    .join('\n');
}

function chunkJsTs(filePath: string, source: string, language: string): CodeChunk[] {
  const plugins: parser.ParserPlugin[] = [
    'typescript',
    'jsx',
    'classProperties',
    'decorators-legacy',
    'dynamicImport',
    'optionalChaining',
    'nullishCoalescingOperator',
  ];

  let ast: t.File;
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      errorRecovery: true,
      plugins,
    });
  } catch (err) {
    logger.warn('babel parse failed, falling back to file chunk', {
      filePath,
      message: err instanceof Error ? err.message : String(err),
    });
    return [fileChunk(filePath, source, language)];
  }

  const chunks: CodeChunk[] = [];

  const push = (name: string | undefined, kind: string, path: NodePath) => {
    const node = path.node as t.Node & { loc?: t.SourceLocation | null };
    if (!node.loc) return;
    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    if (endLine - startLine < 1 && (!name || name === 'anonymous')) return;
    const content = sliceLines(source, startLine, endLine);
    if (content.trim().length < 8) return;
    chunks.push({
      filePath,
      language,
      symbolName: name,
      symbolKind: kind,
      startLine,
      endLine,
      content,
      contentHash: hashContent(`${filePath}:${startLine}:${endLine}:${content}`),
    });
  };

  traverse(ast, {
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      push(path.node.id?.name ?? 'anonymous', 'function', path);
    },
    ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
      push(path.node.id?.name ?? 'anonymous', 'class', path);
    },
    ClassMethod(path: NodePath<t.ClassMethod>) {
      const key = path.node.key;
      const name = key.type === 'Identifier' ? key.name : 'method';
      push(name, 'method', path);
    },
    ClassProperty(path: NodePath<t.ClassProperty>) {
      if (
        path.node.value &&
        (path.node.value.type === 'ArrowFunctionExpression' ||
          path.node.value.type === 'FunctionExpression')
      ) {
        const key = path.node.key;
        const name = key.type === 'Identifier' ? key.name : 'property';
        push(name, 'method', path);
      }
    },
    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      const id = path.node.id;
      const init = path.node.init;
      if (id.type !== 'Identifier' || !init) return;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
        push(id.name, 'function', path);
      }
    },
    TSInterfaceDeclaration(path: NodePath<t.TSInterfaceDeclaration>) {
      push(path.node.id.name, 'interface', path);
    },
    TSTypeAliasDeclaration(path: NodePath<t.TSTypeAliasDeclaration>) {
      push(path.node.id.name, 'type', path);
    },
    ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
      const decl = path.node.declaration;
      if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') return;
      if (decl.type === 'ArrowFunctionExpression' || decl.type === 'FunctionExpression') {
        push('default', 'function', path);
      }
    },
  });

  if (chunks.length === 0) {
    return [fileChunk(filePath, source, language)];
  }
  return chunks;
}

function fileChunk(filePath: string, source: string, language: string): CodeChunk {
  const lines = source.split(/\r?\n/);
  return {
    filePath,
    language,
    symbolName: filePath.split('/').pop(),
    symbolKind: 'file',
    startLine: 1,
    endLine: Math.max(1, lines.length),
    content: source,
    contentHash: hashContent(`${filePath}:file:${source}`),
  };
}

/** Heuristic AST-ish chunking for non-JS languages without naive fixed line windows. */
function chunkByDefinitions(filePath: string, source: string, language: string): CodeChunk[] {
  const patterns: RegExp[] = [];
  if (language === 'python') {
    patterns.push(/^(async\s+)?def\s+\w+\s*\(|^class\s+\w+/);
  } else if (language === 'go') {
    patterns.push(/^func\s+(\(.*\)\s+)?\w+\s*\(|^type\s+\w+\s+struct/);
  } else if (language === 'java' || language === 'kotlin') {
    patterns.push(
      /^(public|private|protected|static|final|abstract|\s)*(class|interface|enum|record)\s+\w+/,
    );
    patterns.push(
      /^(public|private|protected|static|final|synchronized|\s)*[\w<>\[\]]+\s+\w+\s*\([^;]*\)\s*\{?/,
    );
  } else if (language === 'rust') {
    patterns.push(/^(pub\s+)?(async\s+)?fn\s+\w+|^struct\s+\w+|^impl\b|^enum\s+\w+/);
  } else if (language === 'ruby') {
    patterns.push(/^def\s+\w+|^class\s+\w+|^module\s+\w+/);
  } else {
    return [fileChunk(filePath, source, language)];
  }

  const lines = source.split(/\r?\n/);
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (patterns.some((p) => p.test(line))) {
      starts.push(i);
    }
  }

  if (starts.length === 0) {
    return [fileChunk(filePath, source, language)];
  }

  const chunks: CodeChunk[] = [];
  for (let i = 0; i < starts.length; i++) {
    const startIdx = starts[i]!;
    const endIdx = (starts[i + 1] ?? lines.length) - 1;
    const startLine = startIdx + 1;
    const endLine = endIdx + 1;
    const content = lines.slice(startIdx, endIdx + 1).join('\n');
    const header = lines[startIdx] ?? '';
    const nameMatch = /\b([A-Za-z_][\w]*)\s*[\(:{]|class\s+(\w+)|def\s+(\w+)|fn\s+(\w+)/.exec(
      header,
    );
    const symbolName =
      nameMatch?.[1] || nameMatch?.[2] || nameMatch?.[3] || nameMatch?.[4] || `block_${startLine}`;
    chunks.push({
      filePath,
      language,
      symbolName,
      symbolKind: header.includes('class') ? 'class' : 'function',
      startLine,
      endLine,
      content,
      contentHash: hashContent(`${filePath}:${startLine}:${endLine}:${content}`),
    });
  }
  return chunks;
}

export function chunkSource(filePath: string, source: string): CodeChunk[] {
  const language = extLanguage(filePath);
  if (['typescript', 'tsx', 'javascript', 'jsx'].includes(language)) {
    return chunkJsTs(filePath, source, language);
  }
  return chunkByDefinitions(filePath, source, language);
}

export function chunkFiles(files: { path: string; content: string }[]): CodeChunk[] {
  const all: CodeChunk[] = [];
  for (const file of files) {
    try {
      all.push(...chunkSource(file.path, file.content));
    } catch (err) {
      logger.warn('chunking failed', {
        filePath: file.path,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  logger.info('chunking complete', { files: files.length, chunks: all.length });
  return all;
}
