import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NAV_GROUPS } from './navItems';
import BrandLogo from '@/components/brand/BrandLogo';
import StatusPill from '@/components/sv/StatusPill';
import { useApp } from '@/lib/store';

export default function NavRail() {
  const { ble, demoMode, online } = useApp();
  const connected = ble.status === 'connected';

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border/70 bg-sidebar/80 backdrop-blur-xl lg:flex">
      <div className="px-5 pb-4 pt-6">
        <BrandLogo nameClassName="text-[19px]" />
        <p className="hud-label mt-1 text-[9px]">plataforma biométrica</p>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="hud-label px-2 pb-1.5 text-[8.5px] opacity-70">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-all',
                        isActive
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary transition-opacity',
                            isActive ? 'opacity-100 sv-glow-cyan' : 'opacity-0',
                          )}
                        />
                        <item.icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'opacity-80')} />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-border/60 px-4 py-3">
        <StatusPill tone={demoMode ? 'demo' : connected ? 'connected' : 'idle'} pulse={connected && !demoMode} className="w-full justify-center">
          {demoMode ? 'Demonstração' : connected ? 'Tênis online' : 'Sem enlace BLE'}
        </StatusPill>
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          <span>{online ? 'sincronizado' : 'offline'}</span>
          <span className={online ? 'text-success' : 'text-energy'}>{online ? 'online' : 'local'}</span>
        </div>
      </div>
    </aside>
  );
}
