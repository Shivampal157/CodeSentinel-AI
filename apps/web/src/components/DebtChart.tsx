import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import type { DebtPoint } from '../lib/api';

export function DebtChart({ points, loading }: { points: DebtPoint[]; loading: boolean }) {
  if (loading) {
    return <div className="grid h-64 place-items-center text-xs text-ink-faint">Loading debt history…</div>;
  }
  if (points.length === 0) {
    return (
      <div className="grid h-64 place-items-center border border-dashed border-paper-line text-center">
        <div>
          <p className="text-sm text-ink-muted">No debt history yet</p>
          <p className="mt-1 text-xs text-ink-faint">Run a pull request review to establish a baseline.</p>
        </div>
      </div>
    );
  }

  const data = points.map((point) => ({
    ...point,
    date: format(new Date(point.recordedAt), 'MMM d'),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B45309" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#B45309" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#D0D5DE" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="#8B93A1" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="#8B93A1" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #D0D5DE', borderRadius: 0, fontSize: 12 }}
            labelStyle={{ color: '#5C6575' }}
          />
          <Area type="monotone" dataKey="score" stroke="#B45309" fill="url(#debtFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
