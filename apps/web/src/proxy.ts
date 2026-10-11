import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Verificação otimista: sem cookie de sessão, a página nem carrega e vai direto para
 * o login. Quem valida o token de verdade é a API, a cada requisição.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Páginas do dashboard; /login, /api e os arquivos estáticos ficam de fora.
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
};
