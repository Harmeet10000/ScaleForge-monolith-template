import { run } from 'node:test';
import { spec as Spec } from 'node:test/reporters';
import { glob } from 'node:fs';
import { promisify } from 'node:util';

const globAsync = promisify(glob);

async function runTests() {
  try {
    // Find all test files
    const testFiles = await globAsync('tests/**/*.test.js');

    if (testFiles.length === 0) {
      console.log('No test files found');
      return;
    }

    console.log(`Found ${testFiles.length} test file(s):`);
    testFiles.forEach((file) => console.log(`  - ${file}`));
    console.log('');

    // Run tests
    const stream = run({
      files: testFiles,
      concurrency: true,
      timeout: 30000
    });

    // Use spec reporter for better output
    stream.compose(new Spec()).pipe(process.stdout);

    // Handle completion
    stream.on('test:fail', (data) => {
      console.error(`Test failed: ${data.name}`);
      if (data.details?.error) {
        console.error(data.details.error);
      }
    });

    stream.on('test:complete', (data) => {
      if (data.todo || data.skip) {
        console.log(`Test skipped: ${data.name}`);
      }
    });
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
