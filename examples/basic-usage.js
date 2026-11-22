import { assertEnv } from "../src/index.js";

try {
  const cfg = assertEnv({
    DATABASE_URL: { required: true, type: "url" },
    PORT: { type: "number", default: 3000 },
    DEBUG: { type: "boolean", default: false },
    NODE_ENV: { type: "string", default: "development", values: ["development", "production", "test"] },
    JWT_SECRET: { required: true, type: "string" }
  });
  console.log("Configuration loaded successfully:");
  console.log(cfg);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
