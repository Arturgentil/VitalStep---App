import React, { useEffect, useMemo, useState } from 'react';
import { Route as RouteIcon, Ruler, Satellite, Clock } from 'lucide-react';
import useTelemetryData from '@/hooks/useTelemetryData';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import DemoNotice from '@/components/sv/DemoNotice';
import StatusPill from '@/components/sv/StatusPill';
import RoutesMap from '@/components/map/RoutesMap';
import MapFilters from '@/components/map/MapFilters';
import RouteSessionList from '@/components/map/RouteSessionList';
import { Button } from '@/components/ui/button';
import { TIME_WINDOWS, clipRoute, rangeFor, routeColor, routeLengthM } from '@/lib/geo';
import { fmtDistance, fmtInt } from '@/lib/format';

export default function TrajectoryPage() {
  const { demo, activities, loading } = useTelemetryData();
  const [period, setPeriod] = useState('week');
  const [windowKey, setWindowKey] = useState('all');
  const [day, setDay] = useState('');
  const [activeId, setActiveId] = useState(null);

  const routes = useMemo(() => {
    const { fromMs, toMs } = rangeFor(period, day);
    const win = TIME_WINDOWS.find((w) => w.key === windowKey) || TIME_WINDOWS[0];
    return activities
      .filter((a) => Array.isArray(a.route) && a.route.length >= 2)
      .map((activity) => {
        const points = clipRoute(activity.route, { fromMs, toMs, fromHour: win.from, toHour: win.to });
        if (points.length < 2) return null;
        return {
          id: activity.id,
          activity,
          points,
          partial: points.length < activity.route.length,
          distanceM: routeLengthM(points),
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.activity.started_at) - new Date(b.activity.started_at))
      .map((route, index) => ({ ...route, color: routeColor(index) }));
  }, [activities, period, day, windowKey]);

  useEffect(() => {
    if (activeId && !routes.some((r) => r.id === activeId)) setActiveId(null);
  }, [routes, activeId]);

  const withoutGps = activities.filter((a) => !Array.isArray(a.route) || a.route.length < 2).length;
  const totalM = routes.reduce((acc, r) => acc + r.distanceM, 0);
  const totalPoints = routes.reduce((acc, r) => acc + r.points.length, 0);
  const active = routes.find((r) => r.id === activeId) || null;

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Traçado"
        title="Mapa de trajetórias"
        description="Cada linha no mapa é uma sessão com GPS registrado. Combine período, dia específico e faixa horária para isolar o trecho que você quer ver."
        right={demo ? <StatusPill tone="demo">demo</StatusPill> : undefined}
      />

      {demo && <DemoNotice />}

      <Panel title="Filtros" bodyClassName="pt-2">
        <MapFilters
          period={period}
          onPeriod={setPeriod}
          windowKey={windowKey}
          onWindow={setWindowKey}
          day={day}
          onDay={setDay}
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-2.5">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <RouteIcon className="h-3.5 w-3.5 text-primary" />
            {routes.length} {routes.length === 1 ? 'trajeto' : 'trajetos'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Ruler className="h-3.5 w-3.5 text-primary" />
            {fmtDistance(totalM)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Satellite className="h-3.5 w-3.5 text-primary" />
            {fmtInt(totalPoints)} pontos GPS
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {(TIME_WINDOWS.find((w) => w.key === windowKey) || TIME_WINDOWS[0]).label}
          </span>
          {withoutGps > 0 && (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/80">
              {withoutGps} sem GPS
            </span>
          )}
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Trajeto"
          subtitle={
            loading
              ? 'Carregando sessões…'
              : active
                ? `${active.activity.title || 'Sessão'} · ${new Date(active.activity.started_at).toLocaleString('pt-BR')}`
                : 'Todas as sessões do filtro'
          }
          right={
            active ? (
              <Button variant="outline" size="sm" onClick={() => setActiveId(null)}>
                ver todas
              </Button>
            ) : undefined
          }
        >
          <RoutesMap routes={routes} activeId={activeId} onSelect={setActiveId} height={430} />
          <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground/80">
            toque numa linha para isolar · marcador claro = chegada
          </p>
        </Panel>

        <Panel
          title="Sessões"
          subtitle={active ? '1 selecionada' : `${routes.length} no mapa`}
          bodyClassName="pt-2"
        >
          <RouteSessionList routes={routes} activeId={activeId} onSelect={setActiveId} />
        </Panel>
      </div>
    </div>
  );
}