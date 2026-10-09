import { getDatabase } from '@netlify/database';
import { createHandler } from '../../lib/handler.mjs';
export default createHandler(getDatabase);
export const config = { path: '/api/game' };
