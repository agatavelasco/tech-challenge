import { loginResponseSchema } from '@tech-challenge/contracts';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Faz o login na API e guarda o token num cookie httpOnly: o JavaScript da página não
 * tem acesso a ele, então um XSS não consegue roubá-lo. O token volta para a API pelo
 * proxy /api/[...path].
 */
export async function POST(request: NextRequest) {
  const apiUrl = process.env.TRANSACTIONS_API_URL;
  if (!apiUrl) throw new Error('TRANSACTIONS_API_URL não configurada');

  let upstream: Response;
  try {
    upstream = await fetch(new URL('/auth/login', apiUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      cache: 'no-store',
    });
  } catch {
    return Response.json(
      { statusCode: 502, message: 'A API de transações está indisponível no momento.' },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  }

  const { accessToken, expiresIn } = loginResponseSchema.parse(await upstream.json());
  const response = Response.json(null);
  const cookie = [
    `${SESSION_COOKIE}=${accessToken}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${String(expiresIn)}`,
    ...(request.nextUrl.protocol === 'https:' ? ['Secure'] : []),
  ].join('; ');
  response.headers.append('set-cookie', cookie);
  return response;
}
