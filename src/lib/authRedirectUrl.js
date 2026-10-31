import { Capacitor } from '@capacitor/core';

export function getAuthRedirectUrl(path) {
  if (Capacitor.isNativePlatform()) {
    return `vitalstep://auth/callback?next=${encodeURIComponent(path)}`;
  }

  const { hostname, origin } = window.location;
  const isPagesDeployment = hostname === 'vitalstep.pages.dev'
    || hostname.endsWith('.vitalstep.pages.dev');
  const redirectOrigin = isPagesDeployment ? 'https://vitalstepapp.com.br' : origin;

  return new URL(path, redirectOrigin).href;
}
