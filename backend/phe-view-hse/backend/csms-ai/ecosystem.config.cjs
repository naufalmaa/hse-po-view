const path = require("path");
const fs = require("fs");

// Auto-detect virtualenv python on Linux/Windows, fallback to system python
function getPythonBinary() {
  const candidates = [
    path.join(__dirname, ".venv", "bin", "python"),
    path.join(__dirname, "venv", "bin", "python"),
    path.join(__dirname, ".venv", "Scripts", "python.exe"),
    path.join(__dirname, "venv", "Scripts", "python.exe"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "python3";
}

const pythonBin = getPythonBinary();

module.exports = {
  apps: [
    {
      name: "csms-ai-dev",
      cwd: __dirname,
      script: pythonBin,
      args: "-m server.main",
      interpreter: "none",
      env: {
        ENV_FILE: ".env.development",
        CSMS_ENV: "development",
        CSMS_AI_PORT: "8000",
      },
      watch: false,
      autorestart: true,
      max_memory_restart: "4G",
    },
    {
      name: "csms-ai-prod",
      cwd: __dirname,
      script: pythonBin,
      args: "-m server.main",
      interpreter: "none",
      env: {
        ENV_FILE: ".env.production",
        CSMS_ENV: "production",
        CSMS_AI_PORT: "8001",
      },
      watch: false,
      autorestart: true,
      max_memory_restart: "4G",
    },
    {
      name: "csms-ai-demo",
      cwd: __dirname,
      script: pythonBin,
      args: "-m server.main",
      interpreter: "none",
      env: {
        ENV_FILE: ".env.demo",
        CSMS_ENV: "production",
        CSMS_AI_PORT: "8002",
      },
      watch: false,
      autorestart: true,
      max_memory_restart: "4G",
    },
  ],
};
