import { AlertCircle, FileWarning, Lightbulb } from 'lucide-react';
import clsx from 'clsx';
import type { Finding, Review } from '../lib/api';

const severityStyles: Record<Finding['severity'], string> = {
  critical: 'bg-signal-red text-ink-950',
  high: 'border-signal-red/30 bg-signal-red/10 text-signal-red',
  medium: 'border-signal-amber/30 bg-signal-amber/10 text-signal-amber',
  low: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  info: 'border-signal-green/30 bg-signal-green/10 text-signal-green',
};

export function ReviewFindings({ review }: { review: Review | null }) {
  if (!review) {
    return <p className="py-10 text-center text-xs text-slate-600">Run AI Review to generate findings.</p>;
  }
  if (review.status === 'queued' || review.status === 'running') {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-signal-amber border-t-transparent" />
        <p className="text-xs text-slate-400">Review {review.status}…</p>
      </div>
    );
  }
  if (review.status === 'failed') {
    return (
      <div className="border border-signal-red/20 bg-signal-red/5 p-3 text-xs text-signal-red">
        {review.error ?? 'Review failed'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border border-white/10 bg-ink-900 p-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-signal-amber" />
          <span className="text-xs font-semibold text-slate-200">Review summary</span>
          {review.debtScore !== undefined && (
            <span className="ml-auto font-mono text-sm font-semibold text-signal-amber">{review.debtScore}/100</span>
          )}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">{review.summary}</p>
      </div>
      {review.findings.map((finding, index) => (
        <article key={`${finding.filePath}-${finding.startLine}-${index}`} className="border border-white/10 bg-ink-900">
          <div className="flex items-start gap-2 border-b border-white/[0.07] p-3">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-5 text-slate-200">{finding.title}</p>
              <p className="truncate font-mono text-[10px] text-slate-600">
                {finding.filePath}:{finding.startLine}
              </p>
            </div>
            <span className={clsx('ml-auto border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', severityStyles[finding.severity])}>
              {finding.severity}
            </span>
          </div>
          <p className="whitespace-pre-wrap p-3 text-xs leading-5 text-slate-400">{finding.body}</p>
          {finding.suggestion && (
            <div className="mx-3 mb-3 flex gap-2 border-l-2 border-signal-green/50 bg-signal-green/5 p-2 text-xs leading-5 text-slate-400">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-green" />
              {finding.suggestion}
            </div>
          )}
        </article>
      ))}
      {review.findings.length === 0 && (
        <p className="py-8 text-center text-xs text-signal-green">No actionable findings.</p>
      )}
    </div>
  );
}
