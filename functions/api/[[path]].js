const UPSTREAM_ORIGIN = 'https://base44.app';
const FORWARDED_HEADERS = [
  'Authorization',
  'Base44-Functions-Version',
  'Content-Type',
  'Accept',
];

function errorResponse(message, status, headers = {}) {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

export async function onRequest({ request, env }) {
  const appId = env.VITE_BASE44_APP_ID?.trim();

  if (!appId) return errorResponse('API não configurada.', 503);

  const url = new URL(request.url);
  const encodedAppId = encodeURIComponent(appId);
  const appPath = `/api/apps/${encodedAppId}`;
  const pageLogPath = `/api/app-logs/${encodedAppId}/log-user-in-app/`;
  const isPageLog = url.pathname.startsWith(pageLogPath)
    && /^[a-z0-9_-]+$/i.test(url.pathname.slice(pageLogPath.length));
  let allowedMethods;

  if (
    url.pathname === `${appPath}/functions/vitalstepIntelligence`
    || url.pathname === `${appPath}/analytics/track/batch`
    || isPageLog
  ) {
    allowedMethods = ['POST'];
  } else if (url.pathname === `${appPath}/entities/User/me`) {
    allowedMethods = ['GET', 'HEAD'];
  } else {
    return errorResponse('Rota de API não encontrada.', 404);
  }

  if (!allowedMethods.includes(request.method)) {
    return errorResponse('Método não permitido.', 405, {
      Allow: allowedMethods.join(', '),
    });
  }

  const headers = new Headers({ 'X-App-Id': appId });

  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  const upstreamUrl = new URL(url.pathname + url.search, UPSTREAM_ORIGIN);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
      cache: 'no-store',
    });
    const response = new Response(upstream.body, upstream);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return errorResponse('API indisponível.', 502);
  }
}
