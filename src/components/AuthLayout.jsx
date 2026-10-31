import React from "react";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <BrandLogo className="mb-5" symbolClassName="h-12 w-12" nameClassName="text-xl" />
          <div className="flex items-center justify-center gap-2.5">
            <Icon className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          </div>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
