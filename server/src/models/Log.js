const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    actor: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Resolved", "Unresolved"],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

logSchema.index({ timestamp: -1 });
logSchema.index({ severity: 1, timestamp: -1 });
logSchema.index({ status: 1, timestamp: -1 });
logSchema.index({ role: 1, timestamp: -1 });
logSchema.index({ region: 1, timestamp: -1 });
logSchema.index({ resourceType: 1, timestamp: -1 });

module.exports = mongoose.model("Log", logSchema);