# 1. Recommended: Single-file executable bundle (run with Bun)
bun build ./src/index.ts \
  --outdir dist \
  --target bun \
  --minify-whitespace --minify-syntax --minify \
  --sourcemap  # optional for debugging

# On your Mac M-series (arm64) → build Linux x64 binary for a server
bun build --compile ./src/index.js --target=bun-linux-x64 --outfile server-linux-x64

# Same, but for maximum compatibility on older x86 servers
bun build --compile ./src/index.js --target=bun-linux-x64-baseline --outfile server-linux-baseline

# Build for ARM64 Linux (e.g., Raspberry Pi 5, AWS Graviton)
bun build --compile ./src/index.js --target=bun-linux-arm64 --outfile server-arm64

# Build Windows executable (from macOS or Linux)
bun build --compile ./src/index.js --target=bun-windows-x64 --outfile server.exe

# Build macOS Intel binary (from Apple Silicon Mac)
bun build --compile ./src/index.js --target=bun-darwin-x64 --outfile server-macos-intel
# 2. If you need Node.js compatibility (e.g., some PaaS still force Node):
bun build ./src/index.ts --outdir dist --target node --minify

# Then run in production:
or even: bun run dist/index.js #(if you keep package.json scripts)
