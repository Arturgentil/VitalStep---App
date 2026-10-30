import React from 'react';
import { Link } from 'react-router-dom';
import { Footprints, HeartPulse, Zap, Bluetooth, Sparkles, Target, ArrowUpRight } from 'lucide-react';

const ITEMS = [
  { to: '/atividade', label: 'Treino', sub: 'ao vivo', icon: Footprints },
  { to: '/saude', label: 'Saúde', sub: 'biometria', icon: HeartPulse },
  { to: '/energia', label: 'Energia', sub: 'geração', icon: Zap },
  { to: '/dispositivo', label: 'Tênis', sub: 'BLE', icon: Bluetooth },
  { to: '/inteligencia', label: 'IA', sub: 'análise', icon: Sparkles },
  { to: '/metas', label: 'Metas', sub: 'progresso', icon: Target },
];

export default function QuickAccess() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="group relative flex flex-col gap-1.5 rounded-xl border border-border/70 bg-secondary/30 p-2.5 transition-all hover:border-primary/40 hover:bg-primary/[0.06]"
        >
          <ArrowUpRight className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground/0 transition-colors group-hover:text-primary" />
          <item.icon className="h-4 w-4 text-primary" />
          <span className="text-[11.5px] font-medium leading-none text-foreground">{item.label}</span>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">{item.sub}</span>
        </Link>
      ))}
    </div>
  );
}