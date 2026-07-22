import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import LogTable from "../components/LogTable";
import Pagination from "../components/Pagination";
import UploadLogs from "../components/UploadLogs";
import LogDetailsModal from "../components/LogDetailsModal";

const defaultFilters = {
  page: 1,
  limit: 10,
  search: "",
  severity: "",
  status: "",
  role: "",
  region: "",
  resourceType: "",
  resource: "",
  sortBy: "timestamp",
  sortOrder: "desc",
};

function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  // `loading` now only drives a subtle dim/disable state, not an unmount.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Tracks whether we've completed at least one successful fetch, so the
  // very first load can show a real "Loading…" placeholder while every
  // load after that just dims the existing table in place.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Holds the AbortController for whatever request is currently in flight,
  // so a newer filter/sort/page change can cancel an older, slower one
  // instead of letting it race back and overwrite fresher results.
  const abortControllerRef = useRef(null);

  const fetchLogs = async () => {
    // Cancel any request that's still in flight before starting a new one.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== "") params.append(key, value);
      });

      const response = await api.get(`/logs?${params.toString()}`, {
        signal: controller.signal,
      });

      setLogs(Array.isArray(response?.data?.data) ? response.data.data : []);
      setPagination(
        response?.data?.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        }
      );
      setHasLoadedOnce(true);
    } catch (err) {
      // A request we cancelled ourselves isn't a real error — ignore it so
      // it doesn't flash an error state for something the user caused by
      // typing/clicking faster than the network could respond.
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
        return;
      }
      console.error("FETCH LOGS ERROR:", err);
      console.error("FETCH LOGS RESPONSE:", err?.response?.data);
      setError(err?.response?.data?.message || "Failed to fetch logs");
      setLogs([]);
    } finally {
      // Only clear the loading flag if this call is still the current one
      // (an aborted, older call's `finally` shouldn't flip loading off
      // after a newer request has already started).
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLogs();
    // Cancel any in-flight request if the component unmounts mid-fetch.
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const handleDraftChange = (e) => {
    const { name, value } = e.target;
    setDraftFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      ...draftFilters,
      page: 1,
    });
  };

  // Pressing Enter in the search box applies filters immediately instead
  // of requiring a click on "Apply filters".
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyFilters();
    }
  };

  const handleClearFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handlePageChange = (newPage) => {
    const next = { ...appliedFilters, page: newPage };
    setAppliedFilters(next);
    setDraftFilters(next);
  };

  // Clicking a sortable column header re-sorts immediately, independent of
  // the "Apply filters" button used for the other filter fields.
  const handleSortChange = (sortBy, sortOrder) => {
    const next = { ...appliedFilters, sortBy, sortOrder, page: 1 };
    setAppliedFilters(next);
    setDraftFilters(next);
  };

  const stats = useMemo(() => {
    return {
      totalLogs: pagination.total || 0,
      unresolved: logs.filter((log) => log.status === "Unresolved").length,
      highSeverity: logs.filter((log) => log.severity === "HIGH").length,
      uniqueRegions: new Set(logs.map((log) => log.region)).size,
    };
  }, [logs, pagination.total]);

  const hasActiveAlerts = stats.highSeverity > 0 && stats.unresolved > 0;

  return (
    <div className="app-shell">
      <div className="page-header">
        <div className="status-line">
          <span className={`status-dot${hasActiveAlerts ? " status-alert" : ""}`} />
          AUDIT-LOG // MONITORING
        </div>
        <h1>Audit Log Dashboard</h1>
        <p>Monitor, filter, and investigate system audit events.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-accent-neutral">
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{stats.totalLogs}</div>
          <div className="kpi-meta">Across the current filtered result set</div>
        </div>

        <div className="kpi-card kpi-accent-violet">
          <div className="kpi-label">Unresolved</div>
          <div className="kpi-value">{stats.unresolved}</div>
          <div className="kpi-meta">On this page</div>
        </div>

        <div className="kpi-card kpi-accent-danger">
          <div className="kpi-label">High Severity</div>
          <div className="kpi-value">{stats.highSeverity}</div>
          <div className="kpi-meta">On this page</div>
        </div>

        <div className="kpi-card kpi-accent-info">
          <div className="kpi-label">Active Regions</div>
          <div className="kpi-value">{stats.uniqueRegions}</div>
          <div className="kpi-meta">Unique regions on this page</div>
        </div>
      </div>

      <UploadLogs onUploadSuccess={fetchLogs} />

      <div className="card">
        <div className="section-head">
          <div>
            <h3 className="card-title">Filters and Sorting</h3>
            <p className="section-subtitle">
              Narrow down events by actor, severity, region, or resource.
            </p>
          </div>
        </div>

        <div className="filters-grid">
          <input
            className="input"
            type="text"
            name="search"
            placeholder="Search actor, action, path, IP"
            value={draftFilters.search}
            onChange={handleDraftChange}
            onKeyDown={handleSearchKeyDown}
          />

          <select
            className="select"
            name="severity"
            value={draftFilters.severity}
            onChange={handleDraftChange}
          >
            <option value="">All severities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>

          <select
            className="select"
            name="status"
            value={draftFilters.status}
            onChange={handleDraftChange}
          >
            <option value="">All statuses</option>
            <option value="Resolved">Resolved</option>
            <option value="Unresolved">Unresolved</option>
          </select>

          <select
            className="select"
            name="role"
            value={draftFilters.role}
            onChange={handleDraftChange}
          >
            <option value="">All roles</option>
            <option value="admin">admin</option>
            <option value="engineer">engineer</option>
            <option value="analyst">analyst</option>
            <option value="viewer">viewer</option>
          </select>

          <input
            className="input"
            type="text"
            name="region"
            placeholder="Region, e.g. us-east-1"
            value={draftFilters.region}
            onChange={handleDraftChange}
            onKeyDown={handleSearchKeyDown}
          />

          <select
            className="select"
            name="resourceType"
            value={draftFilters.resourceType}
            onChange={handleDraftChange}
          >
            <option value="">All categories</option>
            <option value="AUTH">AUTH</option>
            <option value="REPORT">REPORT</option>
            <option value="USER">USER</option>
            <option value="POLICY">POLICY</option>
          </select>

          <input
            className="input"
            type="text"
            name="resource"
            placeholder="Endpoint path, e.g. /api/reports"
            value={draftFilters.resource}
            onChange={handleDraftChange}
            onKeyDown={handleSearchKeyDown}
          />

          <select
            className="select"
            name="sortBy"
            value={draftFilters.sortBy}
            onChange={handleDraftChange}
          >
            <option value="timestamp">Newest by time</option>
            <option value="severity">Severity</option>
            <option value="actor">Actor</option>
          </select>

          <select
            className="select"
            name="sortOrder"
            value={draftFilters.sortOrder}
            onChange={handleDraftChange}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="filter-actions">
          <button
            className="btn btn-primary"
            onClick={handleApplyFilters}
            disabled={loading}
          >
            Apply filters
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClearFilters}
            disabled={loading}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Audit Events</h3>

        {error && <div className="message-error">{error}</div>}

        {/* Only show the full placeholder on the very first load. After
            that, the table stays mounted and just dims/disables during
            a refetch, so filtering/sorting/paging never causes a jump. */}
        {!hasLoadedOnce && loading && (
          <div className="empty-state">Loading events…</div>
        )}

        {(hasLoadedOnce || !loading) && !error && (
          <div
            style={{
              opacity: loading ? 0.5 : 1,
              pointerEvents: loading ? "none" : "auto",
              transition: "opacity 0.15s ease",
            }}
          >
            <LogTable
              logs={logs}
              onRowClick={setSelectedLog}
              sortBy={appliedFilters.sortBy}
              sortOrder={appliedFilters.sortOrder}
              onSortChange={handleSortChange}
            />
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}

export default Dashboard;