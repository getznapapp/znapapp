#!/bin/bash

# Development Environment Setup Script
# This script sets up the development environment for both Expo and Xcode development

echo "🔧 Setting up Znap development environment..."

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [[ $NODE_VERSION == "not installed" ]]; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Check if we have npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js from https://nodejs.org"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Expo CLI globally if not present
if ! command -v expo &> /dev/null; then
    echo "🚀 Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Check Expo CLI version
EXPO_VERSION=$(expo --version 2>/dev/null || echo "not installed")
echo "✅ Expo CLI version: $EXPO_VERSION"

# Make scripts executable
chmod +x setup-xcode.sh
chmod +x build-ios.sh

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📱 Next steps:"
echo ""
echo "For Expo development:"
echo "  npm start              # Start Metro bundler"
echo "  npm run ios            # Run on iOS simulator"
echo "  npm run android        # Run on Android emulator"
echo "  npm run web            # Run on web browser"
echo ""
echo "For Xcode development:"
echo "  ./setup-xcode.sh       # Generate iOS project and open in Xcode"
echo "  ./build-ios.sh         # Build for App Store submission"
echo ""
echo "📚 Documentation:"
echo "  README.md              # Main documentation"
echo "  XCODE_SETUP.md         # Xcode-specific setup guide"
echo ""