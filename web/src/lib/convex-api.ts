/**
 * Re-export the Convex generated API for cleaner imports in dashboard pages.
 *
 * Usage:
 *   import { api } from '@/lib/convex-api';
 *   import type { Id } from '@/lib/convex-api';
 */
export { api } from "../../convex/_generated/api";
export type { Id, Doc } from "../../convex/_generated/dataModel";
