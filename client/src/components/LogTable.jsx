function getSeverityClass(severity) {
  if (severity === "HIGH") return "badge badge-high";
  if (severity === "MEDIUM") return "badge badge-medium";
  return "badge badge-low";
}

function getStatusClass(status) {
  return status === "Resolved" ? "badge badge-resolved" : "badge badge-unresolved";
}

// Columns the API actually supports sorting on (matches Dashboard's sortBy options).
const SORTABLE_COLUMNS = {
  Actor: "actor",
  Severity: "severity",
  Timestamp: "timestamp",
};

function SortableHeader({ label, sortBy, sortOrder, onSortChange }) {
  const key = SORTABLE_COLUMNS[label];
  const isActive = sortBy === key;
  const nextOrder = isActive && sortOrder === "asc" ? "desc" : "asc";

  return (
    <th
      scope="col"
      className="th-sortable"
      aria-sort={isActive ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className="th-sort-btn"
        onClick={() => onSortChange(key, nextOrder)}
      >
        {label}
        <span className={`sort-arrow${isActive ? " sort-arrow-active" : ""}`}>
          {isActive ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function LogTable({ logs, onRowClick, sortBy, sortOrder, onSortChange }) {
  const renderHeader = (label) =>
    SORTABLE_COLUMNS[label] ? (
      <SortableHeader
        key={label}
        label={label}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
      />
    ) : (
      <th key={label} scope="col">
        {label}
      </th>
    );

  return (
    <div className="table-wrap">
      <table className="log-table">
        <thead>
          <tr>
            {[
              "Actor",
              "Role",
              "Action",
              "Resource",
              "Type",
              "IP",
              "Region",
              "Severity",
              "Status",
              "Timestamp",
            ].map(renderHeader)}
          </tr>
        </thead>

        <tbody>
          {logs.length > 0 ? (
            logs.map((log) => (
              <tr
                key={log._id}
                onClick={() => onRowClick(log)}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${log.action} by ${log.actor}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick(log);
                  }
                }}
              >
                <td>{log.actor}</td>
                <td>{log.role}</td>
                <td>{log.action}</td>
                <td className="path-cell">{log.resource}</td>
                <td>{log.resourceType}</td>
                <td>{log.ipAddress}</td>
                <td>{log.region}</td>
                <td>
                  <span className={getSeverityClass(log.severity)}>
                    {log.severity}
                  </span>
                </td>
                <td>
                  <span className={getStatusClass(log.status)}>
                    {log.status}
                  </span>
                </td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10">
                <div className="empty-state">
                  No logs found for the selected filters.
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default LogTable;