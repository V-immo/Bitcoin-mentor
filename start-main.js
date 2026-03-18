// Start de echte app vanuit de hoofdmap
const { spawn } = require("child_process");
const path = require("path");

const mainRepo = path.resolve(__dirname, "../../..");
const next = path.join(mainRepo, "node_modules/next/dist/bin/next");

const child = spawn("node", [next, "dev"], {
  cwd: mainRepo,
  stdio: "inherit",
  env: { ...process.env },
});

child.on("exit", (code) => process.exit(code ?? 0));
