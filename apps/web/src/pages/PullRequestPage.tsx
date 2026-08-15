import { ArrowLeft, Bot, MessageSquare, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { api, type Comment, type PullRequest, type PullRequestDiff, type Review, type ReviewStatusEvent } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { useAuthStore } from '../stores/auth-store';
import { DiffViewer } from '../components/DiffViewer';
import { CommentThread } from '../components/CommentThread';
import { ReviewFindings } from '../components/ReviewFindings';

export function PullRequestPage() {
  const { prId = '' } = useParams();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [pullRequest, setPullRequest] = useState<PullRequest | null>(null);
  const [diff, setDiff] = useState<PullRequestDiff | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activePanel, setActivePanel] = useState<'findings' | 'comments'>('findings');
  const [loading, setLoading] = useState(true);
  const [runningReview, setRunningReview] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReview = async (reviewId: string) => {
    const nextReview = await api<Review>(`/reviews/${reviewId}`);
    setReview(nextReview);
  };

  const loadComments = async () => {
    const response = await api<{ comments: Comment[] }>(`/pull-requests/${prId}/comments`);
    setComments(response.comments);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      api<PullRequest>(`/pull-requests/${prId}`),
      api<PullRequestDiff>(`/pull-requests/${prId}/diff`),
      api<{ comments: Comment[] }>(`/pull-requests/${prId}/comments`),
    ])
      .then(([pr, prDiff, response]) => {
        if (cancelled) return;
        setPullRequest(pr);
        setDiff(prDiff);
        setComments(response.comments);
        if (pr.lastReviewId) void loadReview(pr.lastReviewId);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load pull request');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prId]);

  useEffect(() => {
    const socket = connectSocket(accessToken);
    if (!socket) return;
    const onConnect = () => {
      setSocketConnected(true);
      socket.emit('join:pr', prId);
    };
    const onDisconnect = () => setSocketConnected(false);
    const onReviewStatus = (event: ReviewStatusEvent) => {
      setPullRequest((current) => (current ? { ...current, reviewStatus: event.status } : current));
      if (event.status === 'completed' || event.status === 'failed') {
        setRunningReview(false);
        void loadReview(event.reviewId);
        void loadComments();
      } else {
        setReview((current) =>
          current?.id === event.reviewId ? { ...current, status: event.status } : current,
        );
      }
    };
    const onCommentCreated = ({ comment }: { comment: Comment }) => {
      setComments((current) => current.some((item) => item.id === comment.id) ? current : [...current, comment]);
    };
    const onCommentUpdated = ({ comment }: { comment: Comment }) => {
      setComments((current) => current.map((item) => item.id === comment.id ? comment : item));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('review:status', onReviewStatus);
    socket.on('comment:created', onCommentCreated);
    socket.on('comment:updated', onCommentUpdated);
    if (socket.connected) onConnect();

    return () => {
      socket.emit('leave:pr', prId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('review:status', onReviewStatus);
      socket.off('comment:created', onCommentCreated);
      socket.off('comment:updated', onCommentUpdated);
    };
  }, [accessToken, prId]);

  const runReview = async () => {
    setRunningReview(true);
    setError(null);
    try {
      const started = await api<Pick<Review, 'id' | 'status'>>(`/pull-requests/${prId}/review`, { method: 'POST' });
      setReview({ id: started.id, status: started.status, cacheHit: false, findings: [] });
      setPullRequest((current) => (current ? { ...current, lastReviewId: started.id, reviewStatus: started.status } : current));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to start review');
      setRunningReview(false);
    }
  };

  if (loading) return <div className="p-8 text-xs text-ink-faint">Loading review workspace…</div>;

  return (
    <div className="p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to={pullRequest?.repositoryId ? `/app/repos/${pullRequest.repositoryId}` : '/app'}
          className="p-1 text-ink-faint hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-mono text-xs text-ink-faint">#{pullRequest?.number}</span>
        <h1 className="min-w-0 truncate text-sm font-semibold text-ink">{pullRequest?.title}</h1>
        <span
          className={clsx(
            'ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider',
            socketConnected ? 'text-mark' : 'text-ink-faint',
          )}
        >
          {socketConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {socketConnected ? 'Live' : 'Offline'}
        </span>
        <button
          type="button"
          onClick={() => void runReview()}
          disabled={runningReview || pullRequest?.reviewStatus === 'queued' || pullRequest?.reviewStatus === 'running'}
          className="btn-primary h-9 text-xs disabled:opacity-40"
        >
          {runningReview || pullRequest?.reviewStatus === 'queued' || pullRequest?.reviewStatus === 'running' ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bot className="h-3.5 w-3.5" />
          )}
          {pullRequest?.reviewStatus === 'running' ? 'Review running' : 'Run AI Review'}
        </button>
      </div>
      {error && <div className="mb-3 border border-signal-red/20 bg-red-50 p-2 text-xs text-signal-red">{error}</div>}
      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <DiffViewer files={diff?.files ?? []} loading={loading} />
        <aside className="surface h-[calc(100vh-176px)] min-h-[560px] overflow-hidden">
          <div className="grid h-10 grid-cols-2 border-b border-paper-line bg-paper-soft">
            <button
              type="button"
              onClick={() => setActivePanel('findings')}
              className={clsx(
                'flex items-center justify-center gap-2 text-xs font-medium',
                activePanel === 'findings' ? 'border-b-2 border-mark text-ink' : 'text-ink-faint',
              )}
            >
              <Bot className="h-3.5 w-3.5" />
              Findings
              {review?.findings.length ? (
                <span className="font-mono text-[10px] text-ink-faint">{review.findings.length}</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel('comments')}
              className={clsx(
                'flex items-center justify-center gap-2 text-xs font-medium',
                activePanel === 'comments' ? 'border-b-2 border-mark text-ink' : 'text-ink-faint',
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
              <span className="font-mono text-[10px] text-ink-faint">{comments.filter((comment) => !comment.resolved).length}</span>
            </button>
          </div>
          <div className="h-[calc(100%-40px)] overflow-y-auto p-3">
            {activePanel === 'findings' ? (
              <ReviewFindings review={review} />
            ) : (
              <CommentThread pullRequestId={prId} comments={comments} onChange={setComments} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
