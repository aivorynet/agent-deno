/**
 * AIVory Deno Agent Test Application
 *
 * Usage:
 *   cd monitor-agents/agent-deno
 *   AIVORY_API_KEY=ilscipio-dev-2024 AIVORY_BACKEND_URL=ws://localhost:19999/ws/monitor/agent AIVORY_DEBUG=true deno run --allow-net --allow-env test-app.ts
 */

import { init, captureException, setUser, shutdown } from "./src/mod.ts";

interface UserContext {
  userId: string;
  email: string;
  active: boolean;
}

function triggerException(iteration: number): void {
  // Create local variables to capture
  const testVar = `test-value-${iteration}`;
  const count = iteration * 10;
  const items = ['apple', 'banana', 'cherry'];
  const metadata = {
    iteration,
    timestamp: Date.now(),
    nested: { key: 'value', count }
  };
  const user: UserContext = {
    userId: `user-${iteration}`,
    email: 'test@example.com',
    active: true
  };

  // Collect local variables for capture
  const _localVars = { testVar, count, items, metadata, user };

  switch (iteration) {
    case 0:
      // TypeError
      console.log('Triggering TypeError...');
      const nullVal: unknown = null;
      (nullVal as { someMethod: () => void }).someMethod(); // TypeError here
      break;

    case 1:
      // Custom error
      console.log('Triggering custom Error...');
      throw new Error(`Test error: testVar=${testVar}`);

    case 2:
      // RangeError
      console.log('Triggering RangeError...');
      throw new RangeError('Invalid array length');

    default:
      throw new Error(`Unknown iteration: ${iteration}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('===========================================');
  console.log('AIVory Deno Agent Test Application');
  console.log(`Deno version: ${Deno.version.deno}`);
  console.log(`V8 version: ${Deno.version.v8}`);
  console.log(`TypeScript version: ${Deno.version.typescript}`);
  console.log('===========================================');

  // Initialize the agent
  init();

  // Set user context
  setUser({
    id: 'test-user-001',
    email: 'tester@example.com',
    username: 'tester'
  });

  // Wait for agent to connect
  console.log('Waiting for agent to connect...');
  await delay(3000);
  console.log('Starting exception tests...\n');

  // Generate test exceptions
  for (let i = 0; i < 3; i++) {
    console.log(`--- Test ${i + 1} ---`);
    try {
      triggerException(i);
    } catch (error) {
      if (error instanceof Error) {
        console.log(`Caught: ${error.name} - ${error.message}`);

        // Capture with local variables
        captureException(error, { test_iteration: i }, {
          testVar: `test-value-${i}`,
          count: i * 10,
          items: ['apple', 'banana', 'cherry']
        });
      }
    }
    console.log();
    await delay(3000);
  }

  console.log('===========================================');
  console.log('Test complete. Check database for exceptions.');
  console.log('===========================================');

  // Keep running briefly to allow final messages to send
  await delay(2000);

  // Shutdown cleanly
  shutdown();
}

main().catch(console.error);
