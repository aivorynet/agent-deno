# AIVory Monitor - Deno Agent

Remote debugging with AI-powered fix generation for Deno runtime.

## Requirements

- Deno 1.30 or higher
- AIVory API key (get one at [aivory.net](https://aivory.net))

## Installation

Import directly from URL:

```typescript
import { init, captureException } from "https://deno.land/x/aivory_monitor/mod.ts";
```

Or use local import for development:

```typescript
import { init, captureException } from "./src/mod.ts";
```

## Usage

### Basic Initialization

```typescript
import { init } from "https://deno.land/x/aivory_monitor/mod.ts";

init({
  apiKey: 'your-api-key',
  environment: 'production'
});
```

### Required Permissions

The agent requires the following Deno permissions:

```bash
deno run --allow-net --allow-env your-app.ts
```

- `--allow-net`: For WebSocket connection to AIVory backend
- `--allow-env`: For reading configuration from environment variables

### Automatic Exception Capture

Once initialized, the agent automatically captures:

- Unhandled errors (`error` events)
- Unhandled promise rejections (`unhandledrejection` events)

```typescript
// This will be automatically captured
throw new Error('Something went wrong');

// This will also be captured
Promise.reject(new Error('Async operation failed'));
```

### Manual Exception Capture

Capture exceptions manually with additional context and local variables:

```typescript
import { captureException } from "https://deno.land/x/aivory_monitor/mod.ts";

try {
  const userId = '12345';
  const result = riskyOperation(userId);
} catch (error) {
  // Capture with context and local variables
  captureException(
    error,
    { userId: '12345', operation: 'riskyOperation' },
    { userId, result }
  );
}
```

### User Context

Set user information to be included with all captures:

```typescript
import { setUser } from "https://deno.land/x/aivory_monitor/mod.ts";

setUser({
  id: 'user-123',
  email: 'user@example.com',
  username: 'johndoe'
});
```

### Custom Context

Add custom context that will be sent with all captures:

```typescript
import { setContext } from "https://deno.land/x/aivory_monitor/mod.ts";

setContext({
  version: '1.2.3',
  environment: 'production',
  server: 'us-east-1'
});
```

## Configuration

Configuration can be provided via environment variables or initialization options:

| Variable | Description | Default |
|----------|-------------|---------|
| `AIVORY_API_KEY` | AIVory API key (required) | None |
| `AIVORY_BACKEND_URL` | Backend WebSocket URL | `wss://api.aivory.net/ws/agent` |
| `AIVORY_ENVIRONMENT` | Environment name | `production` |
| `AIVORY_SAMPLING_RATE` | Exception sampling rate (0.0-1.0) | `1.0` |
| `AIVORY_MAX_DEPTH` | Maximum variable capture depth | `10` |
| `AIVORY_MAX_STRING_LENGTH` | Maximum string length | `1000` |
| `AIVORY_MAX_COLLECTION_SIZE` | Maximum array/object size | `100` |
| `AIVORY_DEBUG` | Enable debug logging | `false` |

### Example with Environment Variables

```bash
export AIVORY_API_KEY=your-api-key
export AIVORY_ENVIRONMENT=staging
export AIVORY_SAMPLING_RATE=0.5
deno run --allow-net --allow-env your-app.ts
```

### Example with Options

```typescript
init({
  apiKey: 'your-api-key',
  backendUrl: 'wss://api.aivory.net/ws/agent',
  environment: 'staging',
  samplingRate: 0.5,
  maxCaptureDepth: 5,
  debug: true
});
```

## Permissions

The agent requires minimal permissions to function:

- **--allow-net**: Required for WebSocket connection to the AIVory backend. The agent connects to `wss://api.aivory.net` by default.
- **--allow-env**: Required to read configuration from environment variables (`AIVORY_API_KEY`, etc.).

No file system access, subprocess execution, or other elevated permissions are needed.

## How It Works

1. **Exception Handlers**: The agent registers global event listeners for `error` and `unhandledrejection` events using Deno's standard `addEventListener` API.

2. **Variable Capture**: Local variables are captured using Deno's built-in `Deno.inspect()` for safe serialization. Circular references and large objects are handled automatically.

3. **Stack Trace Parsing**: Error stack traces are parsed to extract file paths, line numbers, and function names for each frame.

4. **Fingerprinting**: Exceptions are fingerprinted using a hash of the error type and top stack frames, enabling automatic grouping of similar errors.

5. **WebSocket Transport**: Captured data is sent to the AIVory backend via native WebSocket connection with automatic reconnection handling.

6. **Zero Dependencies**: The agent uses only Deno's built-in APIs - no external dependencies required.

## Troubleshooting

### Agent not capturing exceptions

- Verify the API key is set correctly
- Check that required permissions are granted (`--allow-net`, `--allow-env`)
- Enable debug mode: `AIVORY_DEBUG=true` or `init({ debug: true })`
- Check console output for initialization messages

### WebSocket connection issues

- Verify network connectivity to `api.aivory.net`
- Check if a firewall or proxy is blocking WebSocket connections
- Try accessing the backend URL directly: `https://api.aivory.net/health`
- Enable debug mode to see connection logs

### Sampling rate too low

If you're not seeing all exceptions:

- Check the `AIVORY_SAMPLING_RATE` setting (default is `1.0` for 100%)
- Set it explicitly: `init({ samplingRate: 1.0 })`

### Performance impact

The agent is designed to have minimal performance impact:

- Variable capture depth is limited (default: 10 levels)
- String and collection sizes are capped
- Sampling rate can be adjusted for high-traffic applications
- WebSocket communication is asynchronous and non-blocking

## Development

Run tests:

```bash
deno task test
```

Type check:

```bash
deno task check
```

Run test application:

```bash
deno task run-test
```

## License

Part of the AIVory Monitor project. See main repository for license details.
