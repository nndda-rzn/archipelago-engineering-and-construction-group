import { useNavigate, useSearch } from '@tanstack/react-router';

type SearchRecord = Record<string, unknown>;

export function useUrlFilter(key: string, fallback = ''): [string, (value: string) => void] {
  const search = useSearch({ strict: false }) as SearchRecord;
  const navigate = useNavigate();
  const raw = search[key];
  const value = typeof raw === 'string' ? raw : fallback;
  const setValue = (next: string) => {
    navigate({
      search: ((prev: SearchRecord) => ({ ...prev, [key]: next || undefined, page: undefined })) as never,
      replace: true,
    });
  };
  return [value, setValue];
}

export function useUrlPagination(pageSize: number): {
  pagination: { pageIndex: number; pageSize: number };
  onPaginationChange: (next: { pageIndex: number; pageSize: number }) => void;
} {
  const search = useSearch({ strict: false }) as SearchRecord;
  const navigate = useNavigate();
  const page = Math.max(1, Number(search.page) || 1);
  const onPaginationChange = (next: { pageIndex: number; pageSize: number }) => {
    navigate({
      search: ((prev: SearchRecord) => ({ ...prev, page: next.pageIndex > 0 ? next.pageIndex + 1 : undefined })) as never,
      replace: true,
    });
  };
  return { pagination: { pageIndex: page - 1, pageSize }, onPaginationChange };
}
