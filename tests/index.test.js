import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEnv, assertEnv, EnvValidationError } from "../src/index.js";

describe("envready test suite", () => {
  it("validates valid non-empty string variables", () => {
    const res = validateEnv(
      { APP_NAME: { required: true, type: "string" } },
      { APP_NAME: "My Application" }
    );
    assert.equal(res.valid, true);
    assert.equal(res.data.APP_NAME, "My Application");
  });

  it("identifies missing required variables", () => {
    const res = validateEnv(
      { API_KEY: { required: true, type: "string" } },
      {}
    );
    assert.equal(res.valid, false);
    assert.ok(res.errors.length > 0);
    assert.match(res.errors[0], /API_KEY is required/);
  });

  it("converts valid string numbers to numeric types", () => {
    const res = validateEnv(
      { PORT: { type: "number" } },
      { PORT: "3000" }
    );
    assert.equal(res.valid, true);
    assert.equal(res.data.PORT, 3000);
  });

  it("converts case-insensitive boolean strings to booleans", () => {
    const resTrue = validateEnv(
      { DEBUG: { type: "boolean" } },
      { DEBUG: "true" }
    );
    assert.equal(resTrue.valid, true);
    assert.equal(resTrue.data.DEBUG, true);

    const resFalse = validateEnv(
      { DEBUG: { type: "boolean" } },
      { DEBUG: "FALSE" }
    );
    assert.equal(resFalse.valid, true);
    assert.equal(resFalse.data.DEBUG, false);
  });

  it("applies default values when variables are omitted", () => {
    const res = validateEnv(
      { PORT: { type: "number", default: 3000 } },
      {}
    );
    assert.equal(res.valid, true);
    assert.equal(res.data.PORT, 3000);
  });

  it("detects and flags invalid URLs", () => {
    const res = validateEnv(
      { DATABASE_URL: { type: "url" } },
      { DATABASE_URL: "not-a-url" }
    );
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /DATABASE_URL must be a valid URL/);
  });

  it("allows valid URLs with http and https protocols", () => {
    const res = validateEnv(
      {
        API_URL: { type: "url" },
        SECURE_URL: { type: "url" }
      },
      {
        API_URL: "http://localhost:8080/api",
        SECURE_URL: "https://example.com/v1"
      }
    );
    assert.equal(res.valid, true);
    assert.equal(res.data.API_URL, "http://localhost:8080/api");
    assert.equal(res.data.SECURE_URL, "https://example.com/v1");
  });

  it("validates allowed enum values", () => {
    const validRes = validateEnv(
      { NODE_ENV: { values: ["development", "production", "test"] } },
      { NODE_ENV: "production" }
    );
    assert.equal(validRes.valid, true);

    const invalidRes = validateEnv(
      { NODE_ENV: { values: ["development", "production", "test"] } },
      { NODE_ENV: "staging" }
    );
    assert.equal(invalidRes.valid, false);
    assert.match(invalidRes.errors[0], /NODE_ENV must be one of:/);
  });

  it("executes custom validation functions", () => {
    const validRes = validateEnv(
      { PORT: { type: "number", validate: (v) => v > 0 && v < 65536 } },
      { PORT: "8080" }
    );
    assert.equal(validRes.valid, true);

    const invalidRes = validateEnv(
      { PORT: { type: "number", validate: (v) => v > 0 && v < 65536 } },
      { PORT: "70000" }
    );
    assert.equal(invalidRes.valid, false);
  });

  it("supports custom validation returning explicit error strings", () => {
    const res = validateEnv(
      {
        AUTH_HEADER: {
          type: "string",
          validate: (val) => val.startsWith("Bearer ") ? true : "Must include Bearer prefix"
        }
      },
      { AUTH_HEADER: "Basic abc" }
    );
    assert.equal(res.valid, false);
    assert.equal(res.errors[0], "Must include Bearer prefix");
  });

  it("throws EnvValidationError in assertEnv on validation failure", () => {
    assert.throws(
      () => assertEnv({ REQUIRED_KEY: { required: true } }, {}),
      EnvValidationError
    );
  });

  it("validates default values against constraints", () => {
    const res = validateEnv(
      {
        PORT: { type: "number", default: "not-a-number" }
      },
      {}
    );
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /PORT must be a valid number/);
  });

  it("treats empty string values as missing required variables", () => {
    const res = validateEnv(
      { SECRET: { required: true, type: "string" } },
      { SECRET: "" }
    );
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /SECRET is required/);
  });

  it("reports unsupported schema types", () => {
    const res = validateEnv(
      { UNKNOWN: { type: "custom-type" } },
      { UNKNOWN: "val" }
    );
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /Unsupported type "custom-type" for UNKNOWN/);
  });

  it("aggregates multiple errors into a single error list", () => {
    const res = validateEnv(
      {
        KEY1: { required: true },
        KEY2: { type: "number" },
        KEY3: { type: "boolean" }
      },
      {
        KEY2: "invalid-num",
        KEY3: "invalid-bool"
      }
    );
    assert.equal(res.valid, false);
    assert.equal(res.errors.length, 3);
  });

  it("protects confidential values from leaking in error messages", () => {
    const superSecret = "super-confidential-token-12345";
    const res = validateEnv(
      {
        SECRET_TOKEN: {
          type: "string",
          validate: () => false
        }
      },
      { SECRET_TOKEN: superSecret }
    );
    assert.equal(res.valid, false);
    const combinedErrors = res.errors.join("\n");
    assert.equal(combinedErrors.includes(superSecret), false);
  });
});
