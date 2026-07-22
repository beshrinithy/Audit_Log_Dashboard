import { useRef, useState } from "react";
import api from "../services/api";

function UploadLogs({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [recordCount, setRecordCount] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0] || null;
    setMessage("");
    setError("");
    setRecordCount(null);
    setFile(selected);

    if (!selected) return;

    // Parse eagerly so the person sees how many records are in the file
    // before committing to an upload of a potentially large payload.
    try {
      const text = await selected.text();
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed) ? parsed : parsed?.logs;

      if (!Array.isArray(records)) {
        setError("File must contain a JSON array of logs, or an object with a \"logs\" array.");
        setFile(null);
        return;
      }

      if (records.length === 0) {
        setError("The file has no log records to upload.");
        setFile(null);
        return;
      }

      setRecordCount(records.length);
    } catch {
      setError("Couldn't parse that file as JSON. Check the file structure and try again.");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a JSON file first.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = Array.isArray(parsed) ? { logs: parsed } : parsed;

      const response = await api.post("/logs/bulk-upload", payload);

      setMessage(
        response?.data?.message ||
          `${(response?.data?.insertedCount || recordCount || 0).toLocaleString()} logs uploaded successfully.`
      );
      setFile(null);
      setRecordCount(null);

      if (fileInputRef.current) fileInputRef.current.value = "";

      if (onUploadSuccess) {
        await onUploadSuccess();
      }
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      console.error("UPLOAD RESPONSE:", err?.response?.data);
      setError(
        err?.response?.data?.message ||
          "Failed to upload logs. Please verify the JSON structure."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">Bulk Upload Logs</h3>

      <div className="upload-row">
        <label htmlFor="log-upload-input" className="sr-only">
          Choose a JSON file of audit logs to upload
        </label>
        <input
          id="log-upload-input"
          ref={fileInputRef}
          className="upload-input"
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
        />
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading
            ? `Uploading${recordCount ? ` ${recordCount.toLocaleString()} records` : "..."}`
            : "Upload JSON"}
        </button>
      </div>

      {recordCount && !message && !error && (
        <div className="message-info">
          Parsed {recordCount.toLocaleString()} record{recordCount === 1 ? "" : "s"}. Ready to upload.
        </div>
      )}
      {message && <div className="message-success">{message}</div>}
      {error && <div className="message-error">{error}</div>}
    </div>
  );
}

export default UploadLogs;