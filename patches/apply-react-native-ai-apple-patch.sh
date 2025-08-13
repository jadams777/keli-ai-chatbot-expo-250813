#!/bin/bash

# React Native AI Apple Library Patch Script
# This script applies fixes for iOS 26 Foundation Models framework compatibility issues

set -e

echo "🔧 Applying @react-native-ai/apple library patch..."

# Define paths
PATCH_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$PATCH_DIR/.." && pwd)"
SOURCE_FILE="$PATCH_DIR/react-native-ai-apple/ios/AppleLLMImpl.swift"
TARGET_DIR="$PROJECT_ROOT/foundation-models-app/node_modules/.pnpm/@react-native-ai+apple@0.4.0_react-native@0.79.5_@babel+core@7.28.0_@types+react@19.0.14_react@19.0.0__react@19.0.0/node_modules/@react-native-ai/apple/ios"
TARGET_FILE="$TARGET_DIR/AppleLLMImpl.swift"

# Check if source patch file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Error: Patch file not found at $SOURCE_FILE"
    exit 1
fi

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory not found at $TARGET_DIR"
    echo "Make sure the @react-native-ai/apple package is installed."
    exit 1
fi

# Create backup of original file
if [ -f "$TARGET_FILE" ]; then
    echo "📦 Creating backup of original file..."
    cp "$TARGET_FILE" "$TARGET_FILE.backup"
fi

# Apply the patch
echo "🚀 Applying patch..."
cp "$SOURCE_FILE" "$TARGET_FILE"

echo "✅ Patch applied successfully!"
echo "📝 Fixed issues:"
echo "   - Type conversion error for ResponseStream.Snapshot to String (line 135)"
echo "   - Ensured consistent string conversion for streaming responses"
echo ""
echo "💡 To revert the patch, restore from backup:"
echo "   cp \"$TARGET_FILE.backup\" \"$TARGET_FILE\""
echo ""
echo "🔄 You may need to clean and rebuild your project:"
echo "   cd foundation-models-app && npx expo run:ios --clear"