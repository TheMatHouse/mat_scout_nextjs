"use client";

function MatScoutPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Showing {start}–{end} of {totalItems} reports
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {/* Prev */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="ms-pagination-btn"
        >
          Prev
        </button>

        {/* Pages */}
        {Array.from({ length: totalPages }).map((_, i) => {
          const page = i + 1;
          const active = page === currentPage;

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`ms-pagination-btn ${
                active ? "ms-pagination-active" : ""
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="ms-pagination-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default MatScoutPagination;
