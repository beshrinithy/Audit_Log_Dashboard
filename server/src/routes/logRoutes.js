const express = require("express");
const {
  bulkUploadLogs,
  getLogs,
} = require("../controllers/logController");

const router = express.Router();

router.post("/bulk-upload", bulkUploadLogs);
router.get("/", getLogs);

module.exports = router;