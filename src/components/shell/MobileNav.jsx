import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, MOBILE_ITEMS } from './navItems';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const extra = NAV_GROUPS.slice(1).flatMap((g) => g.items);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="grid grid-cols-6">
          {MOBILE_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[8.5px] font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('grid h-8 w-8 place-items-center rounded-lg', isActive && 'bg-primary/12')}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="uppercase tracking-[0.08em]">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg">
                <LayoutGrid className="h-4 w-4" />
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] anim-rise">
            <div className="mb-3 flex items-center justify-between">
              <p className="hud-label">Todos os módulos</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {extra.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/40 px-2 py-3 text-[10px] text-foreground/85"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="text-center leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}