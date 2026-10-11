import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Backend for frontend: o navegador chama /api/* no próprio Next, que encaminha para
 * a API de transações. O endereço da API fica só no servidor, não há CORS, e é aqui
 * que o token de autenticação (cookie httpOnly) vira o header Authorization.
 */
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type'];
const FORWARDED_RESPONSE_HEADERS = ['content-type'];

function transactionsApiUrl(): string {
  const url = process.env.TRANSACTIONS_API_URL;
  if (!url) throw new Error('TRANSACTIONS_API_URL não configurada');
  return url;
}

async function forward(request: NextRequest, { params }: RouteContext<'/api/[...path]'>) {
  const { path } = await params;
  const target = new URL(path.map(encodeURIComponent).join('/'), `${transactionsApiUrl()}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session) headers.set('authorization', `Bearer ${session}`);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      cache: 'no-store',
    });
  } catch {
    return Response.json(
      { statusCode: 502, message: 'A API de transações está indisponível no momento.' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { forward as GET, forward as POST };
