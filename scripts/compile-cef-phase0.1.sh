#!/bin/bash
set -e

# Phase 0.1 CEF Compilation Script
# Environment: macOS x86_64 / Apple Silicon (Rosetta)
# Dependencies: curl, tar, cmake, ninja

# 1. Configuration
LLVM_VER="15.0.7"
LLVM_DIR="$HOME/llvm-15"
CEF_SDK_DIR="$(pwd)/cef-binaries/cef_binary_145.0.24+gad514df+chromium-145.0.7632.76_macosx64"
BUILD_DIR="$(pwd)/cef-binaries/build"

# Check if LLVM is installed
if [ ! -d "$LLVM_DIR" ]; then
    echo "LLVM $LLVM_VER not found in $LLVM_DIR. Downloading..."
    # URL for x86_64 macOS
    LLVM_URL="https://github.com/llvm/llvm-project/releases/download/llvmorg-15.0.7/clang%2Bllvm-15.0.7-x86_64-apple-darwin21.0.tar.xz"
    curl -L -o "llvm-15.tar.xz" "$LLVM_URL"
    
    mkdir -p "$LLVM_DIR"
    tar -xf "llvm-15.tar.xz" -C "$LLVM_DIR" --strip-components=1
    rm "llvm-15.tar.xz"
    
    # Fix Gatekeeper quarantine
    xattr -dr com.apple.quarantine "$LLVM_DIR" 2>/dev/null || true
fi

echo "Using LLVM at: $LLVM_DIR"
$LLVM_DIR/bin/clang++ --version

# 2. Patch cef_bind_internal.h (if needed)
# Check if patch is applied
PATCH_FILE="$CEF_SDK_DIR/include/base/internal/cef_bind_internal.h"
if grep -q "CEF patch" "$PATCH_FILE"; then
    echo "Patch already applied."
else
    echo "Applying C++23 compatibility patch for Clang 15..."
    # Note: Ideally execute a proper patch here. 
    # For now, we assume the file is manually patched or use sed (risky but automated)
    # This script is primarily for documentation of the process.
    echo "Please manually verifying cef_bind_internal.h patch if compilation fails."
fi

# 3. Configure CMake
echo "Configuring CMake..."
cmake -G Ninja \
    -DCMAKE_C_COMPILER="$LLVM_DIR/bin/clang" \
    -DCMAKE_CXX_COMPILER="$LLVM_DIR/bin/clang++" \
    -DCMAKE_BUILD_TYPE=Release \
    -DPROJECT_ARCH=x86_64 \
    -S "$CEF_SDK_DIR" \
    -B "$BUILD_DIR"

# 4. Build
echo "Building cefsimple_capi..."
ninja -C "$BUILD_DIR" cefsimple_capi

echo "Build complete!"
echo "App location: $BUILD_DIR/tests/cefsimple_capi/Release/cefsimple_capi.app"
