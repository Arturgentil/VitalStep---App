import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

function correlation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const meanA = a.slice(0, n).reduce((x, y) => x + y, 0) / n;
  const meanB = b.slice(0, n).reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const va = a[i] - meanA;
    const vb = b[i] - meanB;
    num += va * vb;
    da += va * va;
    db += vb * vb;
  }
  if (!da || !db) return null;
  return num / Math.sqrt(da * db);
}

function tone(r) {
  if (r === null) return 'bg-secondary/40';
  const abs = Math.abs(r);
  if (abs < 0.2) return 'bg-secondary';
  if (r > 0) return abs > 0.6 ? 'bg-primary/70' : 'bg-primary/35';
  return abs > 0.6 ? 'bg-destructive/65' : 'bg-energy/35';
}

/**
 * Neural Data Grid — Pearson correlation between the series actually recorded.
 * Correlation is not causation; the caption says so.
 */
export default function NeuralDataGrid({ series = {}, className }) {
  const keys = Object.keys(series);
  const matrix = useMemo(
    () => keys.map((ka) => keys.map((kb) => (ka === kb ? 1 : correlation(series[ka] || [], series[kb] || [])))),
    [keys, series],
  );

  if (keys.length < 2) {
    return (
      <div className={cn('grid place-items-center rounded-lg border border-dashed border-border px-4 py-10 text-center', className)}>
        <p className="text-xs text-muted-foreground">São necessárias ao menos duas séries com 3 amostras para correlacionar.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="overflow-x-auto scrollbar-none">
        <table className="min-w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th />
              {keys.map((k) => (
                <th key={k} className="hud-label px-1 pb-1 text-center text-[8px]">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={keys[i]}>
                <th className="hud-label pr-2 text-right text-[8px]">{keys[i]}</th>
                {row.map((value, j) => (
                  <td key={keys[j]} className="p-0">
                    <div
                      title={`${keys[i]} × ${keys[j]}: ${value === null ? 'sem dados' : value.toFixed(2)}`}
                      className={cn('grid h-8 w-8 place-items-center rounded font-mono text-[9px] text-foreground/80 sm:h-9 sm:w-9', tone(value))}
                    >
                      {value === null ? '—' : value.toFixed(1).replace('0.', '.').replace('-.', '−.')}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
        Coeficiente de Pearson (−1 a +1) entre amostras pareadas. Correlação não implica causalidade.
      </p>
    </div>
  );
}