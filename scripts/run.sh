#!/bin/bash
set -e

echo "=== StudyPlay Dev Runner ==="

# Check required tools
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Error: Rust/Cargo is required"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Run in development mode (Vite on :3339, Tauri connects automatically)
echo "Starting development server..."
echo "  Frontend: http://localhost:3339"
npx tauri dev
