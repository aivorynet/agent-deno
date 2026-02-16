/**
 * AIVory Monitor Deno Agent
 *
 * Remote debugging with AI-powered fix generation for Deno runtime.
 *
 * Usage:
 *   import { init, captureException } from "https://deno.land/x/aivory_monitor/mod.ts";
 *   // Or local import:
 *   import { init, captureException } from "./src/mod.ts";
 *
 *   init({
 *     apiKey: 'your-api-key',
 *     environment: 'production'
 *   });
 *
 *   // Manual capture with local variables
 *   try {
 *     riskyOperation();
 *   } catch (error) {
 *     captureException(error, { userId: '123' }, { localVar1, localVar2 });
 *   }
 */

import { AgentConfig, ConfigOptions } from "./config.ts";
import { BackendConnection } from "./transport/backend-connection.ts";
import { ExceptionHandler, CapturedVariable } from "./capture/exception-handler.ts";

export type { ConfigOptions, CapturedVariable };

let config: AgentConfig | null = null;
let connection: BackendConnection | null = null;
let exceptionHandler: ExceptionHandler | null = null;
let initialized = false;

/**
 * Initializes the AIVory Monitor agent.
 */
export function init(options: ConfigOptions = {}): void {
  if (initialized) {
    console.log('[AIVory Monitor] Agent already initialized');
    return;
  }

  config = new AgentConfig(options);

  if (!config.apiKey) {
    console.log('[AIVory Monitor] API key is required. Set AIVORY_API_KEY or pass apiKey option.');
    return;
  }

  connection = new BackendConnection(config);
  exceptionHandler = new ExceptionHandler(config, connection);

  // Connect to backend
  connection.connect();

  // Install exception handlers
  exceptionHandler.install();

  initialized = true;

  console.log(`[AIVory Monitor] Agent v1.0.0 initialized (Deno ${Deno.version.deno})`);
  console.log(`[AIVory Monitor] Environment: ${config.environment}`);
}

/**
 * Manually captures an exception.
 *
 * @param error The error to capture
 * @param context Additional context
 * @param localVars Local variables to capture
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>,
  localVars?: Record<string, unknown>
): void {
  if (!initialized || !exceptionHandler) {
    console.log('[AIVory Monitor] Agent not initialized');
    return;
  }

  exceptionHandler.capture(error, context, localVars);
}

/**
 * Sets custom context that will be sent with all captures.
 */
export function setContext(context: Record<string, unknown>): void {
  if (!initialized || !config) {
    console.log('[AIVory Monitor] Agent not initialized');
    return;
  }

  config.setCustomContext(context);
}

/**
 * Sets the current user for context.
 */
export function setUser(user: { id?: string; email?: string; username?: string }): void {
  if (!initialized || !config) {
    console.log('[AIVory Monitor] Agent not initialized');
    return;
  }

  config.setUser(user);
}

/**
 * Shuts down the agent.
 */
export function shutdown(): void {
  if (!initialized) {
    return;
  }

  console.log('[AIVory Monitor] Shutting down agent');

  exceptionHandler?.uninstall();
  connection?.disconnect();

  config = null;
  connection = null;
  exceptionHandler = null;
  initialized = false;
}

/**
 * Checks if the agent is initialized.
 */
export function isInitialized(): boolean {
  return initialized;
}
