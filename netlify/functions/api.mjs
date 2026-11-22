// Netlify Function: API lưu thư viện Laint's Poem bằng Netlify Blobs.
import { getStore } from '@netlify/blobs';
import { makeHandler } from '../lib/core.mjs';

const handle = makeHandler(() => ({
  data: getStore({ name: 'poenote', consistency: 'strong' }),
  media: getStore({ name: 'poenote-media', consistency: 'strong' }),
}));

export default (req) => handle(req);

export const config = { path: '/api/*' };
