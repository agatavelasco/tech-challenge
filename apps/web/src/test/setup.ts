import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { navigation } from './navigation';
import { server } from './server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
  useParams: () => navigation.params,
  redirect: vi.fn(),
}));

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  navigation.reset();
});
afterAll(() => {
  server.close();
});
