import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import type { DebtPoint } from '../lib/api';

export function DebtChart({ points, loading }: { points: DebtPoint[]; loading: boolean }) {
  if (loading) {
    return <div className="grid h-64 place-items-center text-xs text-slate-500">Loading debt history…</div>;
  }
  if (points.length === 0) {
    return (
      <div className="grid h-64 place-items-center border border-dashed border-white/10 text-center">
        <div>
          <p className="text-sm text-slate-300">No debt history yet</p>
          <p className="mt-1 text-xs text-slate-600">Run a pull request review to establish a baseline.</p>
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
              <stop offset="0%" stopColor="#e7b549" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#e7b549" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1c2633" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#0c1017', border: '1px solid #1c2633', borderRadius: 2, fontSize: 12 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area type="monotone" dataKey="score" stroke="#e7b549" strokeWidth={2} fill="url(#debtFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
