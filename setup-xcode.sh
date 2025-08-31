#!/bin/bash

# Znap Disposable Camera - iOS Build Script
# This script prepares the project for Xcode development

echo "🚀 Setting up Znap for Xcode development..."

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "❌ Expo CLI not found. Installing..."
    npm install -g @expo/cli
fi

# Check if we have node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean any existing iOS build
if [ -d "ios" ]; then
    echo "🧹 Cleaning existing iOS build..."
    rm -rf ios
fi

if [ -d "android" ]; then
    echo "🧹 Cleaning existing Android build..."
    rm -rf android
fi

# Generate native iOS project
echo "🔨 Generating native iOS project..."
expo prebuild --platform ios --clean

# Check if iOS project was created successfully
if [ -d "ios" ]; then
    echo "✅ iOS project generated successfully!"
    echo ""
    echo "📱 Next steps:"
    echo "1. Open ios/znapdisposablecamera.xcworkspace in Xcode 16.4"
    echo "2. Select your development team in Signing & Capabilities"
    echo "3. Choose a simulator or connected device"
    echo "4. Press ⌘R to build and run"
    echo ""
    echo "🔧 If you encounter signing issues:"
    echo "- Change the Bundle Identifier to something unique"
    echo "- Enable 'Automatically manage signing'"
    echo "- Select your Apple Developer Team"
else
    echo "❌ Failed to generate iOS project"
    exit 1
fi