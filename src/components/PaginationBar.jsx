export default function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
  perPage,
  itemLabel,
}) {
  if (totalPages <= 1) return null;

  if (perPage !== undefined) {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of{" "}
          {total}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg px-2.5 py-1 text-xs border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-2.5 py-1 text-xs border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
      <span>
        {total} {itemLabel}
        {total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
        >
          ‹ Prev
        </button>
        <span className="px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
