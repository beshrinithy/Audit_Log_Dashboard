function Pagination({ pagination, onPageChange }) {
  const { page, limit, totalPages, total } = pagination;
  const safeTotal = total || 0;
  const safeTotalPages = totalPages || 1;

  const rangeStart = safeTotal === 0 ? 0 : (page - 1) * (limit || 10) + 1;
  const rangeEnd = Math.min(page * (limit || 10), safeTotal);

  return (
    <div className="pagination">
      <div className="pagination-info">
        {safeTotal === 0
          ? "No results"
          : `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${safeTotal.toLocaleString()}`}
        {" · "}Page {page} of {safeTotalPages}
      </div>

      <div className="pagination-actions">
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </button>

        <button
          className="btn btn-primary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Pagination;