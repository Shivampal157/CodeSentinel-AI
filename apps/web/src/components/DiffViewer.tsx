import { DiffEditor } from '@monaco-editor/react';
import { FileCode2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { DiffFile } from '../lib/api';

function reconstructPatch(patch = ''): { original: string; modified: string } {
  const original: string[] = [];
  const modified: string[] = [];
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      original.push(line);
      modified.push(line);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      modified.push(line.slice(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      original.push(line.slice(1));
    } else {
      const content = line.startsWith(' ') ? line.slice(1) : line;
      original.push(content);
      modified.push(content);
    }
  }
  return { original: original.join('\n'), modified: modified.join('\n') };
}

function languageFor(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const languages: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return extension ? (languages[extension] ?? 'plaintext') : 'plaintext';
}

export function DiffViewer({ files, loading }: { files: DiffFile[]; loading: boolean }) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const selected = files.find((file) => file.filename === selectedPath) ?? files[0];
  const content = useMemo(() => reconstructPatch(selected?.patch), [selected?.patch]);

  if (loading) return <div className="grid h-[620px] place-items-center text-xs text-slate-500">Loading diff…</div>;
  if (!selected) return <div className="grid h-[620px] place-items-center text-sm text-slate-500">No changed files.</div>;

  return (
    <div className="flex h-[calc(100vh-176px)] min-h-[560px] border border-white/10 bg-ink-900">
      <div className="w-64 shrink-0 overflow-y-auto border-r border-white/10">
        <div className="sticky top-0 border-b border-white/10 bg-ink-900 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Changed files · {files.length}
        </div>
        {files.map((file) => (
          <button
            key={file.filename}
            onClick={() => setSelectedPath(file.filename)}
            className={clsx(
              'flex w-full items-start gap-2 border-b border-white/[0.05] px-3 py-2 text-left',
              file.filename === selected.filename ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:bg-white/[0.03]',
            )}
          >
            <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{file.filename}</span>
            <span className="text-[10px] text-signal-green">+{file.additions}</span>
            <span className="text-[10px] text-signal-red">−{file.deletions}</span>
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex h-9 items-center border-b border-white/10 px-3 font-mono text-[11px] text-slate-400">
          {selected.filename}
          <span className="ml-auto uppercase text-slate-600">{selected.status}</span>
        </div>
        <DiffEditor
          height="calc(100% - 36px)"
          language={languageFor(selected.filename)}
          original={content.original}
          modified={content.modified}
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontFamily: 'IBM Plex Mono',
            fontSize: 12,
            lineHeight: 20,
            scrollBeyondLastLine: false,
            renderOverviewRuler: false,
            folding: false,
            padding: { top: 10 },
          }}
        />
      </div>
    </div>
  );
}
