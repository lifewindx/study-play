#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== StudyPlay Dev Runner ==="
echo ""

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
    echo ""
fi

echo "Starting development server..."
echo "  Frontend: http://localhost:3338"
echo ""
npx tauri dev

echo ""
echo "Press Enter to close..."
read -r
