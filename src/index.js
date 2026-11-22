/**
 * Custom error thrown when environment variable validation fails.
 */
export class EnvValidationError extends Error {
  constructor(errors = []) {
    const formatted = errors.map((err) => `  - ${err}`).join("\n");
    super(`Environment validation failed:\n${formatted}`);
    this.name = "EnvValidationError";
    this.errors = errors;
  }
}

/**
 * Parses and verifies an individual value according to its schema rule.
 *
 * @param {string} key
 * @param {unknown} value
 * @param {object} rule
 * @returns {unknown}
 */
function processEnvValue(key, value, rule) {
  const targetType = rule.type ?? "string";

  let parsed = value;

  switch (targetType) {
    case "string": {
      if (typeof parsed !== "string" || parsed.trim().length === 0) {
        throw new Error(`${key} must be a non-empty string`);
      }
      break;
    }

    case "number": {
      if (typeof parsed === "number") {
        if (!Number.isFinite(parsed)) {
          throw new Error(`${key} must be a valid number`);
        }
      } else if (typeof parsed === "string") {
        if (parsed.trim().length === 0) {
          throw new Error(`${key} must be a valid number`);
        }
        const num = Number(parsed);
        if (!Number.isFinite(num)) {
          throw new Error(`${key} must be a valid number`);
        }
        parsed = num;
      } else {
        throw new Error(`${key} must be a valid number`);
      }
      break;
    }

    case "boolean": {
      if (typeof parsed === "boolean") {
        // already boolean
      } else if (typeof parsed === "string") {
        const lowered = parsed.trim().toLowerCase();
        if (lowered === "true") {
          parsed = true;
        } else if (lowered === "false") {
          parsed = false;
        } else {
          throw new Error(`${key} must be true or false`);
        }
      } else {
        throw new Error(`${key} must be true or false`);
      }
      break;
    }

    case "url": {
      if (typeof parsed !== "string" || parsed.trim().length === 0) {
        throw new Error(`${key} must be a valid URL`);
      }
      try {
        const u = new URL(parsed);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error();
        }
      } catch {
        throw new Error(`${key} must be a valid URL`);
      }
      break;
    }

    default:
      throw new Error(`Unsupported type "${targetType}" for ${key}`);
  }

  // Allowed enum values check
  if (Array.isArray(rule.values) && !rule.values.includes(parsed)) {
    throw new Error(`${key} must be one of: ${rule.values.join(", ")}`);
  }

  // Custom validation rule check
  if (typeof rule.validate === "function") {
    const outcome = rule.validate(parsed);
    if (outcome !== true) {
      const message = typeof outcome === "string" ? outcome : `${key} failed custom validation`;
      throw new Error(message);
    }
  }

  return parsed;
}

/**
 * Validates environment variables according to a defined schema.
 *
 * @param {Record<string, object>} schema
 * @param {Record<string, unknown>} [env=process.env]
 * @returns {{ valid: boolean, data: Record<string, unknown>, errors: string[] }}
 */
export function validateEnv(schema, env = process.env) {
  const data = {};
  const errors = [];

  for (const [key, rule] of Object.entries(schema)) {
    const rawVal = env ? env[key] : undefined;
    const hasDefault = Object.prototype.hasOwnProperty.call(rule, "default");
    const isUnset = rawVal === undefined || rawVal === "";

    if (isUnset) {
      if (hasDefault) {
        try {
          data[key] = processEnvValue(key, rule.default, rule);
        } catch (err) {
          errors.push(err.message);
        }
        continue;
      }

      if (rule.required) {
        errors.push(`${key} is required`);
      }
      continue;
    }

    try {
      data[key] = processEnvValue(key, rawVal, rule);
    } catch (err) {
      errors.push(err.message);
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    data: valid ? data : {},
    errors
  };
}

/**
 * Validates environment variables, returning parsed config or throwing EnvValidationError.
 *
 * @param {Record<string, object>} schema
 * @param {Record<string, unknown>} [env=process.env]
 * @returns {Record<string, unknown>}
 */
export function assertEnv(schema, env = process.env) {
  const outcome = validateEnv(schema, env);
  if (!outcome.valid) {
    throw new EnvValidationError(outcome.errors);
  }
  return outcome.data;
}
