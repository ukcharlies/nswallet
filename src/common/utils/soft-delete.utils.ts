/**
 * Soft Delete Utilities
 *
 * Provides application-layer soft delete support for Prisma 6.
 * Since Prisma 6 doesn't support middleware, these utilities handle:
 * - Filtering soft-deleted records on queries
 * - Converting delete operations to soft deletes (set deletedAt)
 */

/**
 * Models that support soft delete
 */
export const SOFT_DELETE_MODELS = ['User', 'Wallet'];

/**
 * Helper to add soft delete filter to query
 * Usage: { ...args.where, ...excludeSoftDeleted() }
 */
export function excludeSoftDeleted() {
  return { deletedAt: null };
}

/**
 * Helper to include only soft-deleted records
 */
export function onlyDeleted() {
  return { deletedAt: { not: null } };
}

/**
 * Helper to include all records (deleted and active)
 */
export function includeDeleted() {
  // Returns undefined - no filter applied
  return undefined;
}

/**
 * Helper to convert delete to soft delete data
 */
export function softDeleteData() {
  return { deletedAt: new Date() };
}

/**
 * Helper to restore a soft-deleted record
 */
export function restoreData() {
  return { deletedAt: null };
}
