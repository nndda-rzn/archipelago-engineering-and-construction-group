import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useCollections } from '@/features/finance';
import { CollectionForm, collectionColumns } from '@/features/finance/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function CollectionPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useCollections({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Collection</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Receive client payments · reduce AR</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : '+ Create Collection'}
        </Button>
      </div>

      {showForm && <CollectionForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={collectionColumns}
          data={data?.items ?? []}
          rowCount={data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyMessage="No collections yet"
          exportFilename="collections"
        />
      </div>
    </div>
  );
}
