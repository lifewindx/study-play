#!/bin/bash
set -e

cd "$(dirname "$0")"

create_macos_dmg() {
    local target="$1"
    local arch_suffix="$2"
    local app_path="$PWD/src-tauri/target/$target/release/bundle/macos/StudyPlay.app"
    local dmg_dir="$PWD/src-tauri/target/$target/release/bundle/dmg"
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

echo "=== StudyPlay App Builder ==="
echo ""

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"
echo "Platform: $OS ($ARCH)"
echo ""

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
    echo ""
fi

echo "Building frontend..."
npx vite build
echo ""

case "$OS" in
    Darwin)
        echo "Building for macOS..."
        if [ "$ARCH" = "arm64" ]; then
            echo "Target: aarch64-apple-darwin (Apple Silicon)"
            npx tauri build --target aarch64-apple-darwin --bundles app
            create_macos_dmg "aarch64-apple-darwin" "aarch64"
            if rustup target list --installed 2>/dev/null | grep -qx "x86_64-apple-darwin"; then
                echo ""
                echo "Also building for x86_64-apple-darwin (Intel)..."
                npx tauri build --target x86_64-apple-darwin --bundles app
                create_macos_dmg "x86_64-apple-darwin" "x64"
            else
                echo ""
                echo "Skipping x86_64-apple-darwin; install it with: rustup target add x86_64-apple-darwin"
            fi
        else
            echo "Target: x86_64-apple-darwin (Intel)"
            npx tauri build --target x86_64-apple-darwin --bundles app
            create_macos_dmg "x86_64-apple-darwin" "x64"
        fi
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
        echo "Unknown OS: $OS"
        echo "Falling back to default build..."
        npx tauri build
        ;;
esac

echo ""
echo "=== Build Complete ==="
echo "Bundles are in: src-tauri/target/release/bundle/"
echo ""
echo "macOS:  src-tauri/target/*/release/bundle/dmg/StudyPlay_*.dmg"
echo "Windows: src-tauri/target/release/bundle/msi/"
echo "Linux:   src-tauri/target/release/bundle/deb/"
echo ""
echo "Press Enter to close..."
read -r
