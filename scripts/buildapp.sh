#!/bin/bash
set -e

echo "=== StudyPlay Builder ==="

# Check required tools
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Error: Rust/Cargo is required"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

create_macos_dmg() {
    local target="$1"
    local arch_suffix="$2"
    local app_path="$PROJECT_DIR/src-tauri/target/$target/release/bundle/macos/StudyPlay.app"
    local dmg_dir="$PROJECT_DIR/src-tauri/target/$target/release/bundle/dmg"
    local stage_dir="$dmg_dir/StudyPlay-dmg"
    local dmg_path="$dmg_dir/StudyPlay_0.1.0_${arch_suffix}.dmg"

    if [ ! -d "$app_path" ]; then
        echo "Error: app bundle not found: $app_path"
        exit 1
    fi

    rm -rf "$stage_dir"
    mkdir -p "$stage_dir" "$dmg_dir"
    cp -R "$app_path" "$stage_dir/"
    ln -s /Applications "$stage_dir/Applications"
    hdiutil create -volname "StudyPlay" -srcfolder "$stage_dir" -ov -format UDZO "$dmg_path"
    rm -rf "$stage_dir"
    echo "Created installer: $dmg_path"
}

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected platform: $OS ($ARCH)"

case "$OS" in
    Darwin)
        INSTALLED_TARGETS="$(rustup target list --installed 2>/dev/null || true)"
        TARGETS=()
        if [ "$ARCH" = "arm64" ]; then
            TARGETS+=("aarch64-apple-darwin")
        fi
        if echo "$INSTALLED_TARGETS" | grep -qx "x86_64-apple-darwin"; then
            TARGETS+=("x86_64-apple-darwin")
        elif [ "$ARCH" != "arm64" ]; then
            TARGETS+=("x86_64-apple-darwin")
        else
            echo "Skipping x86_64-apple-darwin; install it with: rustup target add x86_64-apple-darwin"
        fi
        echo "Building for macOS: ${TARGETS[*]}"
        for target in "${TARGETS[@]}"; do
            echo "Building for $target..."
            npx tauri build --target "$target" --bundles app
            case "$target" in
                aarch64-apple-darwin) create_macos_dmg "$target" "aarch64" ;;
                x86_64-apple-darwin) create_macos_dmg "$target" "x64" ;;
            esac
        done
        ;;
    Linux)
        echo "Building for Linux..."
        npx tauri build
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "Building for Windows..."
        npx tauri build
        ;;
    *)
        echo "Unknown OS: $OS. Falling back to default build."
        npx tauri build
        ;;
esac

echo ""
echo "Build complete! macOS installers are in src-tauri/target/*/release/bundle/dmg/"
