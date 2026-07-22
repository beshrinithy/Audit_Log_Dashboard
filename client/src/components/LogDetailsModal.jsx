import { useEffect, useRef } from "react";

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value || "-"}</div>
    </div>
  );
}

function LogDetailsModal({ log, onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!log) return;

    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [log, onClose]);

  if (!log) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-details-title"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title" id="log-details-title">
          Log Details
        </h2>

        <div className="details-grid">
          <DetailItem label="Actor" value={log.actor} />
          <DetailItem label="Role" value={log.role} />
          <DetailItem label="Action" value={log.action} />
          <DetailItem label="Resource" value={log.resource} />
          <DetailItem label="Resource Type" value={log.resourceType} />
          <DetailItem label="IP Address" value={log.ipAddress} />
          <DetailItem label="Region" value={log.region} />
          <DetailItem label="Severity" value={log.severity} />
          <DetailItem label="Status" value={log.status} />
          <DetailItem
            label="Timestamp"
            value={new Date(log.timestamp).toLocaleString()}
          />
        </div>

        <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose} ref={closeBtnRef}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogDetailsModal;