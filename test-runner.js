// This file serves as the entry point for running tests with Node.js test runner
import { run } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { Transform } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all test files
const testFiles = [
  './test/validations/authValidation.test.js',
  './test/routes/authRoutes.test.js',
  './test/routes/healthRoutes.test.js'
];

// Map test file paths to absolute paths
const absoluteTestFiles = testFiles.map((file) => path.resolve(__dirname, file));

// Function to run tests asynchronously
async function runTests() {
  try {
    const testStream = run({ files: absoluteTestFiles });

    // Create a counter to track test failures
    let failedTests = 0;

    // Create a transform stream to process test events
    const processingStream = new Transform({
      objectMode: true,
      transform(event, encoding, callback) {
        // Pass the event through
        this.push(event);

        // Count test failures
        if (event.type === 'test:fail') {
          failedTests++;
        }

        callback();
      }
    });

    // Pipe through the processing stream to stdout
    const stream = testStream.compose(processingStream).pipe(process.stdout);

    // Wait for the stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Exit with appropriate code based on test results
    if (failedTests > 0) {
      console.log(`\n❌ ${failedTests} test(s) failed.`);
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
