/**
 * Parse and clamp pagination query params.
 * - page: 1-indexed, minimum 1, default 1
 * - limit: minimum 1, maximum 100, default 20
 */
export function parsePagination(query: { page?: string; limit?: string }): { page: number; limit: number; skip: number } {
  let page = parseInt(query.page as string);
  let limit = parseInt(query.limit as string);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  return { page, limit, skip: (page - 1) * limit };
}
