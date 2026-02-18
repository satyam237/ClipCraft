"use client";

type EventRow = {
  event_type: string;
  payload: unknown;
  created_at: string;
  viewer_id: string | null;
};

export function VideoAnalyticsCharts({ events }: { events: EventRow[] }) {
  const byType: Record<string, number> = {};
  events.forEach((e) => {
    byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
  });

  const byHour: Record<string, number> = {};
  events.forEach((e) => {
    const d = new Date(e.created_at);
    const key = d.toISOString().slice(0, 13);
    byHour[key] = (byHour[key] ?? 0) + 1;
  });
  const hourEntries = Object.entries(byHour).sort(([a], [b]) => a.localeCompare(b)).slice(-24);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-[var(--border)] p-4">
        <h3 className="mb-3 font-medium">Events by type</h3>
        <ul className="space-y-2">
          {Object.entries(byType).map(([type, count]) => (
            <li key={type} className="flex justify-between text-sm">
              <span className="capitalize">{type}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-[var(--border)] p-4">
        <h3 className="mb-3 font-medium">Activity (last 24 buckets)</h3>
        <div className="flex items-end gap-0.5 h-32">
          {hourEntries.map(([label, count]) => (
            <div
              key={label}
              className="flex-1 min-w-0 rounded-t bg-[var(--primary)] opacity-80"
              style={{
                height: `${Math.max(4, (count / Math.max(1, ...hourEntries.map(([, c]) => c))) * 100)}%`,
              }}
              title={`${label}: ${count}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
