// Netlify Function (v2) for the STIC live vote. Logic lives in ../lib/stic-core.mjs.
import { getStore } from '@netlify/blobs';
import { handle } from '../lib/stic-core.mjs';

export default async req => handle(req, getStore({ name: 'stic-vote', consistency: 'strong' }));

export const config = { path: ['/stic/api/state', '/stic/api/vote', '/stic/api/stage'] };
