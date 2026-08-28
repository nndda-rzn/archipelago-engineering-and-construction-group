export const PAGE_SIZE = 20;
export const PAGE_SIZE_LARGE = 100;

export type PaginationParams = { page: number; pageSize: number };

export function listParams(pageIndex: number, pageSize: number): PaginationParams {
  return { page: pageIndex + 1, pageSize };
}
