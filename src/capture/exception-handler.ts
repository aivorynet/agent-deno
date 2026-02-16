import { createHash, randomUUID } from "node:crypto";
import { AgentConfig } from "../config.ts";
import { BackendConnection, ExceptionPayload } from "../transport/backend-connection.ts";

export interface CapturedVariable {
  name: string;
  type: string;
  value: string;
  isNull: boolean;
  isTruncated: boolean;
  children?: Record<string, CapturedVariable>;
  arrayElements?: CapturedVariable[];
  arrayLength?: number;
}

export interface StackFrame {
  methodName: string;
  fileName?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  isNative: boolean;
}

/**
 * Handles exception capture and reporting for Deno runtime.
 */
export class ExceptionHandler {
  private config: AgentConfig;
  private connection: BackendConnection;
  private installed = false;

  constructor(config: AgentConfig, connection: BackendConnection) {
    this.config = config;
    this.connection = connection;
  }

  /**
   * Installs the exception handlers.
   */
  install(): void {
    if (this.installed) {
      return;
    }

    // Capture unhandled errors
    globalThis.addEventListener('error', (event) => {
      event.preventDefault();
      const error = event.error instanceof Error ? event.error : new Error(String(event.error));
      this.handleException(error, { origin: 'error' });
    });

    // Capture unhandled promise rejections
    globalThis.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.handleException(error, { origin: 'unhandledrejection' });
    });

    this.installed = true;

    if (this.config.debug) {
      console.log('[AIVory Monitor] Exception handlers installed');
    }
  }

  /**
   * Uninstalls the exception handlers.
   */
  uninstall(): void {
    if (!this.installed) {
      return;
    }

    // Note: Deno doesn't support removeEventListener for global events easily
    // The handlers will be garbage collected when the module is unloaded

    this.installed = false;
  }

  /**
   * Manually capture an exception with optional local variables.
   */
  capture(error: Error, context?: Record<string, unknown>, localVars?: Record<string, unknown>): void {
    if (!this.config.shouldSample()) {
      return;
    }

    const capture = this.createCapture(error, context);

    // Capture provided local variables
    if (localVars) {
      capture.localVariables = this.captureVariables(localVars);
    }

    this.connection.sendException(capture);
  }

  private handleException(error: Error, context?: Record<string, unknown>): void {
    if (!this.config.shouldSample()) {
      return;
    }

    const capture = this.createCapture(error, context);
    this.connection.sendException(capture);
  }

  private createCapture(error: Error, context?: Record<string, unknown>): ExceptionPayload {
    const stackTrace = this.parseStackTrace(error);
    const fingerprint = this.calculateFingerprint(error, stackTrace);

    return {
      id: randomUUID(),
      exceptionType: error.name || 'Error',
      message: error.message || '',
      fingerprint,
      stackTrace,
      localVariables: {},
      context: {
        ...this.config.getCustomContext(),
        ...context,
        user: this.config.getUser()
      },
      capturedAt: new Date().toISOString()
    };
  }

  /**
   * Captures variables using Deno.inspect for serialization.
   */
  captureVariables(vars: Record<string, unknown>, depth = 0): Record<string, CapturedVariable> {
    const result: Record<string, CapturedVariable> = {};

    for (const [name, value] of Object.entries(vars)) {
      result[name] = this.captureValue(name, value, depth);
    }

    return result;
  }

  private captureValue(name: string, value: unknown, depth: number): CapturedVariable {
    const captured: CapturedVariable = {
      name,
      type: this.getType(value),
      value: '',
      isNull: value === null,
      isTruncated: false
    };

    if (value === null) {
      captured.value = 'null';
      return captured;
    }

    if (value === undefined) {
      captured.type = 'undefined';
      captured.value = 'undefined';
      return captured;
    }

    switch (typeof value) {
      case 'boolean':
      case 'number':
      case 'bigint':
        captured.value = String(value);
        break;

      case 'string':
        if (value.length > this.config.maxStringLength) {
          captured.value = value.slice(0, this.config.maxStringLength);
          captured.isTruncated = true;
        } else {
          captured.value = value;
        }
        break;

      case 'function':
        captured.type = 'function';
        captured.value = `[Function: ${(value as (...args: unknown[]) => unknown).name || 'anonymous'}]`;
        break;

      case 'symbol':
        captured.value = value.toString();
        break;

      case 'object':
        if (Array.isArray(value)) {
          captured.type = 'array';
          captured.arrayLength = value.length;
          captured.value = `Array(${value.length})`;

          if (depth < this.config.maxCaptureDepth && value.length <= this.config.maxCollectionSize) {
            captured.arrayElements = value.slice(0, this.config.maxCollectionSize).map((item, i) =>
              this.captureValue(`[${i}]`, item, depth + 1)
            );
          }
        } else if (value instanceof Date) {
          captured.type = 'Date';
          captured.value = value.toISOString();
        } else if (value instanceof Error) {
          captured.type = value.name || 'Error';
          captured.value = value.message;
        } else if (value instanceof Map) {
          captured.type = 'Map';
          captured.value = `Map(${value.size})`;
        } else if (value instanceof Set) {
          captured.type = 'Set';
          captured.value = `Set(${value.size})`;
        } else if (value instanceof URL) {
          captured.type = 'URL';
          captured.value = value.href;
        } else {
          // Regular object - use Deno.inspect
          captured.type = value.constructor?.name || 'Object';
          captured.value = Deno.inspect(value, { depth: 0, colors: false });

          if (depth < this.config.maxCaptureDepth) {
            const children: Record<string, CapturedVariable> = {};
            const keys = Object.keys(value as object).slice(0, this.config.maxCollectionSize);

            for (const key of keys) {
              children[key] = this.captureValue(key, (value as Record<string, unknown>)[key], depth + 1);
            }

            if (Object.keys(children).length > 0) {
              captured.children = children;
            }
          }
        }
        break;

      default:
        captured.value = String(value);
    }

    return captured;
  }

  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private parseStackTrace(error: Error): StackFrame[] {
    const frames: StackFrame[] = [];
    const stack = error.stack || '';

    const lines = stack.split('\n').slice(1); // Skip "Error: message" line

    for (const line of lines) {
      const frame = this.parseStackFrame(line);
      if (frame) {
        frames.push(frame);
      }

      if (frames.length >= 50) {
        break;
      }
    }

    return frames;
  }

  private parseStackFrame(line: string): StackFrame | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('at ')) {
      return null;
    }

    const content = trimmed.slice(3);

    // Match "functionName (file:line:column)"
    const funcMatch = content.match(/^(.+?)\s+\((.+)\)$/);
    if (funcMatch) {
      const methodName = funcMatch[1];
      const location = funcMatch[2];
      return this.parseLocation(methodName, location);
    }

    // Match just location "file:line:column"
    const locationMatch = content.match(/^(.+):(\d+):(\d+)$/);
    if (locationMatch) {
      return {
        methodName: '<anonymous>',
        filePath: locationMatch[1],
        fileName: this.getFileName(locationMatch[1]),
        lineNumber: parseInt(locationMatch[2], 10),
        columnNumber: parseInt(locationMatch[3], 10),
        isNative: false
      };
    }

    // Native method
    if (content.includes('[native code]') || content.startsWith('native')) {
      return {
        methodName: content.replace(' [native code]', ''),
        isNative: true
      };
    }

    return {
      methodName: content,
      isNative: false
    };
  }

  private parseLocation(methodName: string, location: string): StackFrame {
    if (location === 'native' || location.includes('[native code]')) {
      return {
        methodName,
        isNative: true
      };
    }

    const match = location.match(/^(.+):(\d+):(\d+)$/);
    if (match) {
      return {
        methodName,
        filePath: match[1],
        fileName: this.getFileName(match[1]),
        lineNumber: parseInt(match[2], 10),
        columnNumber: parseInt(match[3], 10),
        isNative: false
      };
    }

    return {
      methodName,
      filePath: location,
      isNative: false
    };
  }

  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  private calculateFingerprint(error: Error, stackTrace: StackFrame[]): string {
    const parts = [error.name || 'Error'];

    let added = 0;
    for (const frame of stackTrace) {
      if (added >= 5) break;
      if (frame.isNative) continue;

      parts.push(`${frame.methodName}:${frame.lineNumber || 0}`);
      added++;
    }

    const hash = createHash('sha256');
    hash.update(parts.join(':'));
    return hash.digest('hex').substring(0, 16);
  }
}
