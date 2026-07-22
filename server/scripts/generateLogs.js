const fs = require("fs");
const path = require("path");

const actors = [
  "priya.nair@company.com",
  "arjun.menon@company.com",
  "kavya.reddy@company.com",
  "rahul.sharma@company.com",
  "meera.joseph@company.com",
];

const roles = ["admin", "engineer", "analyst", "viewer"];
const actions = ["DELETE_USER", "LOGIN", "UPDATE_POLICY", "EXPORT_REPORT", "CREATE_USER"];
const resourceTypes = ["USER", "POLICY", "REPORT", "AUTH", "SETTINGS"];
const severities = ["LOW", "MEDIUM", "HIGH"];
const statuses = ["Resolved", "Unresolved"];
const regions = ["ap-south-1", "us-east-1", "eu-west-1", "ap-southeast-1"];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIp() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function randomResource(type) {
  const id = Math.floor(Math.random() * 1000) + 1;
  switch (type) {
    case "USER":
      return `/api/users/${id}`;
    case "POLICY":
      return `/api/policies/${id}`;
    case "REPORT":
      return `/api/reports/${id}`;
    case "AUTH":
      return `/api/auth/${id}`;
    default:
      return `/api/settings/${id}`;
  }
}

function randomTimestamp() {
  const start = new Date("2025-01-01").getTime();
  const end = new Date("2025-12-31").getTime();
  return new Date(start + Math.random() * (end - start)).toISOString();
}

const logs = [];

for (let i = 0; i < 10000; i++) {
  const resourceType = randomItem(resourceTypes);

  logs.push({
    actor: randomItem(actors),
    role: randomItem(roles),
    action: randomItem(actions),
    resource: randomResource(resourceType),
    resourceType,
    ipAddress: randomIp(),
    region: randomItem(regions),
    severity: randomItem(severities),
    status: randomItem(statuses),
    timestamp: randomTimestamp(),
  });
}

const outputPath = path.join(__dirname, "logs.json");
fs.writeFileSync(outputPath, JSON.stringify(logs, null, 2), "utf-8");

console.log(`Generated ${logs.length} logs at ${outputPath}`);