import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Trophy, Zap, Footprints, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtEnergy, fmtInt } from '@/lib/format';

function Bar({ value, target, color }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function GoalsStrip({ profile, stepsToday, energyToday, minutesWeek, streak, unlocked, total }) {
  const rows = [
    {
      icon: Footprints,
      label: 'Passos hoje',
      value: `${fmtInt(stepsToday)} / ${fmtInt(profile?.daily_step_goal || 8000)}`,
      pct: stepsToday,
      target: profile?.daily_step_goal || 8000,
      color: 'bg-primary',
    },
    {
      icon: Zap,
      label: 'Energia hoje',
      value: `${fmtEnergy(energyToday).value} / ${fmtEnergy(profile?.daily_energy_goal_mwh || 120).value} ${fmtEnergy(energyToday).unit}`,
      pct: energyToday,
      target: profile?.daily_energy_goal_mwh || 120,
      color: 'bg-energy',
    },
    {
      icon: Timer,
      label: 'Minutos na semana',
      value: `${fmtInt(minutesWeek)} / ${fmtInt(profile?.weekly_minutes_goal || 150)}`,
      pct: minutesWeek,
      target: profile?.weekly_minutes_goal || 150,
      color: 'bg-accent',
    },
  ];

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center gap-1.5">
            <r.icon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{r.label}</span>
            <span className="num ml-auto text-[11px] text-foreground">{r.value}</span>
          </div>
          <Bar value={r.pct} target={r.target} color={r.color} />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border/60 pt-2">
        <Link to="/metas" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
          <Flame className="h-3 w-3 text-energy" /> Sequência: <span className="num text-foreground">{streak} dias</span>
        </Link>
        <Link to="/metas" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
          <Trophy className="h-3 w-3 text-energy" />
          <span className="num text-foreground">
            {unlocked}/{total}
          </span>
        </Link>
      </div>
    </div>
  );
}