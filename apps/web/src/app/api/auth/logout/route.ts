import { SESSION_COOKIE } from '@/lib/session';

export function POST() {
  const response = Response.json(null);
  response.headers.append(
    'set-cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}
