const express = require("express");
const cors = require("cors");
const logRoutes = require("./routes/logRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Audit Log API is running" });
});

app.use("/api/logs", logRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;