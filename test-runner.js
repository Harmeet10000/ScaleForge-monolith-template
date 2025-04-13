// This file serves as the entry point for running tests with Node.js test runner
import { run } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

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

// Run the tests
run({ files: absoluteTestFiles }).compose().pipe(process.stdout);
