import { rm, mkdir } from 'fs/promises';

const outdir = './dist';

await rm(outdir, { force: true, recursive: true });
await mkdir(outdir, { recursive: true });

const proc = Bun.spawn([
  'bun',
  'build',
  './src/index.js',
  '--outdir',
  outdir,
  '--target',
  'node',
  '--minify',
]);

await proc.exited;

if (proc.exitCode !== 0) {
  console.error('Build failed');
  process.exit(1);
}

console.log('Build complete!');
