import { CheckCircle2, CornerDownRight, MessageSquarePlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import clsx from 'clsx';
import { api, type Comment } from '../lib/api';

export function CommentThread({
  pullRequestId,
  comments,
  onChange,
}: {
  pullRequestId: string;
  comments: Comment[];
  onChange: (comments: Comment[]) => void;
}) {
  const [body, setBody] = useState('');
  const [filePath, setFilePath] = useState('');
  const [line, setLine] = useState('1');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roots = comments.filter((comment) => !comment.parentId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || !(replyTo?.filePath ?? filePath.trim())) return;
    setSubmitting(true);
    try {
      const comment = await api<Comment>(`/pull-requests/${pullRequestId}/comments`, {
        method: 'POST',
        body: {
          filePath: replyTo?.filePath ?? filePath.trim(),
          line: replyTo?.line ?? Number(line),
          body: body.trim(),
          parentId: replyTo?.id,
          side: 'RIGHT',
        },
      });
      if (!comments.some((item) => item.id === comment.id)) onChange([...comments, comment]);
      setBody('');
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleResolved = async (comment: Comment) => {
    const patch = await api<{ id: string; resolved: boolean }>(`/comments/${comment.id}`, {
      method: 'PATCH',
      body: { resolved: !comment.resolved },
    });
    onChange(comments.map((item) => (item.id === patch.id ? { ...item, resolved: patch.resolved } : item)));
  };

  return (
    <div className="space-y-3">
      <form onSubmit={(event) => void submit(event)} className="border border-white/10 bg-ink-900 p-3">
        {replyTo ? (
          <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
            <CornerDownRight className="h-3 w-3" />
            Replying to {replyTo.filePath}:{replyTo.line}
            <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
        ) : (
          <div className="mb-2 grid grid-cols-[1fr_70px] gap-2">
            <input
              value={filePath}
              onChange={(event) => setFilePath(event.target.value)}
              placeholder="src/path/file.ts"
              className="h-8 border border-white/10 bg-ink-950 px-2 font-mono text-xs outline-none focus:border-signal-green/40"
              required
            />
            <input
              value={line}
              onChange={(event) => setLine(event.target.value)}
              type="number"
              min="1"
              aria-label="Line number"
              className="h-8 border border-white/10 bg-ink-950 px-2 font-mono text-xs outline-none focus:border-signal-green/40"
            />
          </div>
        )}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Leave a review comment…"
          rows={3}
          className="w-full resize-none border border-white/10 bg-ink-950 p-2 text-xs leading-5 outline-none placeholder:text-slate-600 focus:border-signal-green/40"
        />
        <button
          disabled={submitting || !body.trim()}
          className="mt-2 inline-flex h-8 items-center gap-2 bg-signal-green px-3 text-xs font-semibold text-ink-950 hover:bg-emerald-300 disabled:opacity-40"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          {submitting ? 'Posting…' : 'Add comment'}
        </button>
      </form>

      {roots.map((comment) => {
        const replies = comments.filter((item) => item.parentId === comment.id);
        return (
          <div
            key={comment.id}
            className={clsx('border bg-ink-900', comment.resolved ? 'border-white/[0.06] opacity-60' : 'border-white/10')}
          >
            <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2">
              <span className={clsx('h-1.5 w-1.5 rounded-full', comment.source === 'ai' ? 'bg-signal-amber' : 'bg-signal-green')} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {comment.source === 'ai' ? 'Sentinel' : 'Reviewer'}
              </span>
              <span className="ml-auto font-mono text-[10px] text-slate-600">
                {comment.filePath}:{comment.line}
              </span>
            </div>
            <p className="whitespace-pre-wrap px-3 py-3 text-xs leading-5 text-slate-300">{comment.body}</p>
            {replies.map((reply) => (
              <div key={reply.id} className="ml-5 border-t border-l border-white/[0.07] px-3 py-2">
                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-400">{reply.body}</p>
              </div>
            ))}
            <div className="flex items-center gap-3 border-t border-white/[0.07] px-3 py-2">
              <button onClick={() => setReplyTo(comment)} className="text-[11px] text-slate-500 hover:text-white">
                Reply
              </button>
              <button
                onClick={() => void toggleResolved(comment)}
                className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-signal-green"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {comment.resolved ? 'Reopen' : 'Resolve'}
              </button>
            </div>
          </div>
        );
      })}
      {roots.length === 0 && <p className="py-8 text-center text-xs text-slate-600">No review comments yet.</p>}
    </div>
  );
}
