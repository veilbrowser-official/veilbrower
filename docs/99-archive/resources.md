# VeilBrowser Resources Directory

This directory contains additional resources that are packaged with the application.

## Directory Structure

- `protected/` - Encrypted/obfuscated application files for anti-piracy protection
- `data/` - Data files (copied from src/shared/data during build)

## Note

Most content in this directory is generated during the build process. The `protected/` directory contains obfuscated versions of core application files.

For development, see the build artifacts in `dist-electron/protected/`.

