const Log = require("../models/Log");

const ALLOWED_SORT_FIELDS = ["timestamp", "severity", "actor"];
const ALLOWED_SORT_ORDERS = ["asc", "desc"];
const ALLOWED_SEVERITIES = ["LOW", "MEDIUM", "HIGH"];
const ALLOWED_STATUSES = ["Resolved", "Unresolved"];
const ALLOWED_ROLES = ["admin", "engineer", "analyst", "viewer"];

// Only accept plain strings from query params. Express's query parser turns
// bracket syntax (e.g. ?role[$ne]=null) into objects, which would otherwise
// flow straight into a Mongo filter. Anything that isn't a plain string is
// treated as absent rather than trusted.
function asSafeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Escapes regex metacharacters so user input can't be interpreted as a
// pattern (avoids both invalid-regex crashes and potential ReDoS).
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const bulkUploadLogs = async (req, res) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs)) {
      return res.status(400).json({ message: "'logs' must be an array" });
    }

    if (logs.length === 0) {
      return res.status(400).json({ message: "Logs array cannot be empty" });
    }

    if (logs.length > 10000) {
      return res.status(400).json({
        message: "Cannot upload more than 10000 logs at once",
      });
    }

    const normalizedLogs = [];
    const errors = [];

    logs.forEach((log, index) => {
      const normalized = {
        actor: String(log.actor || "").trim(),
        role: String(log.role || "").trim(),
        action: String(log.action || "").trim(),
        resource: String(log.resource || "").trim(),
        resourceType: String(log.resourceType || "").trim(),
        ipAddress: String(log.ipAddress || "").trim(),
        region: String(log.region || "").trim(),
        severity: String(log.severity || "").trim().toUpperCase(),
        status: String(log.status || "").trim(),
        timestamp: new Date(log.timestamp),
      };

      if (!normalized.actor) errors.push(`Row ${index + 1}: actor is required`);
      if (!normalized.role) errors.push(`Row ${index + 1}: role is required`);
      if (!normalized.action) errors.push(`Row ${index + 1}: action is required`);
      if (!normalized.resource) errors.push(`Row ${index + 1}: resource is required`);
      if (!normalized.resourceType) errors.push(`Row ${index + 1}: resourceType is required`);
      if (!normalized.ipAddress) errors.push(`Row ${index + 1}: ipAddress is required`);
      if (!normalized.region) errors.push(`Row ${index + 1}: region is required`);

      if (!ALLOWED_SEVERITIES.includes(normalized.severity)) {
        errors.push(
          `Row ${index + 1}: severity must be one of ${ALLOWED_SEVERITIES.join(", ")}`
        );
      }

      if (!ALLOWED_STATUSES.includes(normalized.status)) {
        errors.push(
          `Row ${index + 1}: status must be one of ${ALLOWED_STATUSES.join(", ")}`
        );
      }

      if (Number.isNaN(normalized.timestamp.getTime())) {
        errors.push(`Row ${index + 1}: timestamp is invalid`);
      }

      normalizedLogs.push(normalized);
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed for uploaded logs",
        // Cap the response so a fully-invalid 10,000-row file doesn't
        // produce a multi-megabyte error payload.
        errors: errors.slice(0, 200),
        totalErrors: errors.length,
      });
    }

    const insertedLogs = await Log.insertMany(normalizedLogs, {
      ordered: false,
    });

    return res.status(201).json({
      message: "Logs uploaded successfully",
      insertedCount: insertedLogs.length,
    });
  } catch (error) {
    console.error("UPLOAD LOGS ERROR:", error);
    return res.status(500).json({
      message: "Failed to upload logs",
      error: error.message,
    });
  }
};

const getLogs = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    let sortBy = asSafeString(req.query.sortBy) || "timestamp";
    let sortOrder = asSafeString(req.query.sortOrder) || "desc";

    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      sortBy = "timestamp";
    }

    if (!ALLOWED_SORT_ORDERS.includes(sortOrder)) {
      sortOrder = "desc";
    }

    const skip = (page - 1) * limit;
    const search = asSafeString(req.query.search);
    const query = {};

    // severity/status/role are matched against an allow-list rather than
    // passed through directly, so a non-string or unexpected value is
    // silently ignored instead of reaching the Mongo query.
    const severity = asSafeString(req.query.severity).toUpperCase();
    if (severity && ALLOWED_SEVERITIES.includes(severity)) {
      query.severity = severity;
    }

    const status = asSafeString(req.query.status);
    if (status && ALLOWED_STATUSES.includes(status)) {
      query.status = status;
    }

    const role = asSafeString(req.query.role);
    if (role && ALLOWED_ROLES.includes(role)) {
      query.role = role;
    }

    const region = asSafeString(req.query.region);
    if (region) {
      query.region = { $regex: escapeRegex(region), $options: "i" };
    }

    const resourceType = asSafeString(req.query.resourceType);
    if (resourceType) {
      query.resourceType = { $regex: escapeRegex(resourceType), $options: "i" };
    }

    const resource = asSafeString(req.query.resource);
    if (resource) {
      query.resource = { $regex: escapeRegex(resource), $options: "i" };
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { actor: { $regex: safeSearch, $options: "i" } },
        { action: { $regex: safeSearch, $options: "i" } },
        { resource: { $regex: safeSearch, $options: "i" } },
        { resourceType: { $regex: safeSearch, $options: "i" } },
        { ipAddress: { $regex: safeSearch, $options: "i" } },
        { region: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const sortConfig = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
      _id: 1,
    };

    const [data, total] = await Promise.all([
      Log.find(query).sort(sortConfig).skip(skip).limit(limit).lean(),
      Log.countDocuments(query),
    ]);

    return res.status(200).json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      appliedFilters: {
        search,
        severity: severity || null,
        status: status || null,
        role: role || null,
        region: region || null,
        resourceType: resourceType || null,
        resource: resource || null,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("GET LOGS ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch logs",
      error: error.message,
    });
  }
};

module.exports = {
  bulkUploadLogs,
  getLogs,
};