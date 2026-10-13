import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { buildPage, TRANSFER_TYPES } from './fixtures';

export const server = setupServer(
  http.get('*/api/transfer-types', () => HttpResponse.json(TRANSFER_TYPES)),
  http.get('*/api/transactions', () => HttpResponse.json(buildPage([]))),
);
