import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BluetoothOff, FlaskConical, Loader2, LogOut, WifiOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/store';
import BrandLogo from '@/components/brand/BrandLogo';
import StatusPill from '@/components/sv/StatusPill';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function TopBar() {
  const { ble, demoMode, setDemoMode, online } = useApp();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const connected = ble.status === 'connected';

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Não foi possível sair',
        description: 'Verifique sua conexão e tente novamente.',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="VitalStep, início" className="shrink-0 lg:hidden">
          <BrandLogo symbolClassName="h-9 w-9" nameClassName="sr-only sm:not-sr-only sm:text-base" />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {!online && (
            <StatusPill tone="warning" dot={false} className="hidden sm:inline-flex">
              <WifiOff className="h-3 w-3" /> offline
            </StatusPill>
          )}
          <Link to="/dispositivo" aria-label="Estado do tênis">
            <StatusPill tone={connected ? 'connected' : 'idle'} pulse={connected}>
              <BluetoothOff className="h-3 w-3" />
              <span className="hidden sm:inline">{connected ? 'enlace ativo' : 'sem enlace'}</span>
            </StatusPill>
          </Link>
          <button
            type="button"
            onClick={() => setDemoMode(!demoMode)}
            aria-pressed={demoMode}
            title="Alternar modo de demonstração (dados simulados)"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors',
              demoMode
                ? 'border-energy/50 bg-energy/15 text-energy'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <FlaskConical className="h-3 w-3" />
            {demoMode ? 'demo on' : 'demo'}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            aria-label={isLoggingOut ? 'Saindo...' : 'Sair'}
            title="Sair"
            className="shrink-0 gap-1.5 px-2 text-muted-foreground"
          >
            {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
            <span className="hidden sm:inline">{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
