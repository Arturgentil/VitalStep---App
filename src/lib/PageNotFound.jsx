import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

export default function PageNotFound() {
  const { pathname } = useLocation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <BrandLogo symbolClassName="h-16 w-16" />
        <div className="space-y-3">
          <p className="font-mono text-6xl font-light text-primary">404</p>
          <h1 className="text-2xl font-semibold text-foreground">Página não encontrada</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O endereço <span className="break-all font-medium text-foreground">{pathname}</span> não existe no VitalStep.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
