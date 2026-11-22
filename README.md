# envready

Lightweight utility to validate environment variables in Node.js apps before startup.

## Why?

Missing or misconfigured env vars cause hard-to-debug runtime errors. This library catches those issues immediately with clear diagnostics.

## Install

```bash
npm install envready
```

## Usage

```js
import { assertEnv } from "envready";

const config = assertEnv({
  DATABASE_URL: { required: true, type: "url" },
  PORT:         { type: "number",  default: 3000 },
  DEBUG:        { type: "boolean", default: false },
  NODE_ENV:     { type: "string",  values: ["development", "production", "test"], default: "development" },
  JWT_SECRET:   { required: true,  type: "string" }
});
```

## Schema Options

| Option     | Description                                      |
|------------|--------------------------------------------------|
| `required` | Fail if the variable is missing or empty          |
| `type`     | `"string"`, `"number"`, `"boolean"`, or `"url"`  |
| `default`  | Fallback when the variable is absent              |
| `values`   | Array of allowed values (enum-style)              |
| `validate` | Custom function: return `true` or an error string |

## API

### `validateEnv(schema, env?)`

Returns `{ valid, data, errors }`. Non-throwing.

### `assertEnv(schema, env?)`

Returns parsed config or throws `EnvValidationError`.

### `EnvValidationError`

Custom error with `.errors` array and a formatted `.message`.

## Security

Values are never included in error messages. The library does not read `.env` files or mutate `process.env`.

## Requirements

Node.js >= 18

## License

MIT
