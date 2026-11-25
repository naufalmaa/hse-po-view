export { ensureDatabaseSchema } from './ensure/index.ts';
import { ensureDatabaseSchema } from './ensure/index.ts';

/**
 * @deprecated Use ensureDatabaseSchema from ./ensure/index.ts instead
 */
export async function ensureAuthSchema() {
  await ensureDatabaseSchema();
}

