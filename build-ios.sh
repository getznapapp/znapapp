#!/bin/bash

# iOS Build and Archive Script for App Store Submission
# Run this script to build and prepare the app for App Store submission

set -e

echo "🏗 Building Znap for App Store submission..."

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found. Please run this script from the project root."
    exit 1
fi

# Check if iOS project exists
if [ ! -d "ios" ]; then
    echo "📱 iOS project not found. Generating..."
    expo prebuild --platform ios --clean
fi

# Open Xcode workspace
if [ -f "ios/znapdisposablecamera.xcworkspace" ]; then
    echo "🚀 Opening Xcode workspace..."
    open ios/znapdisposablecamera.xcworkspace
    
    echo ""
    echo "📋 App Store Submission Checklist:"
    echo "=================================="
    echo ""
    echo "1. 🔐 SIGNING & CERTIFICATES"
    echo "   - Select your Apple Developer Team"
    echo "   - Ensure 'Automatically manage signing' is enabled"
    echo "   - Verify Bundle Identifier is unique (com.yourname.znapdisposablecamera)"
    echo ""
    echo "2. 🎯 BUILD CONFIGURATION"
    echo "   - Select 'Any iOS Device (arm64)' as build destination"
    echo "   - Set Build Configuration to 'Release'"
    echo "   - Verify Deployment Target is iOS 13.4 or higher"
    echo ""
    echo "3. 📦 ARCHIVE PROCESS"
    echo "   - Go to Product → Archive (⌘⇧B)"
    echo "   - Wait for build to complete"
    echo "   - Organizer window will open automatically"
    echo ""
    echo "4. 🚀 DISTRIBUTION"
    echo "   - Click 'Distribute App'"
    echo "   - Choose 'App Store Connect'"
    echo "   - Select 'Upload' or 'Export'"
    echo "   - Follow the submission wizard"
    echo ""
    echo "5. ✅ FINAL CHECKS"
    echo "   - Test on physical devices"
    echo "   - Verify all permissions work"
    echo "   - Check camera functionality"
    echo "   - Test deep linking"
    echo "   - Verify offline functionality"
    echo ""
    echo "📱 App Store Connect: https://appstoreconnect.apple.com"
    echo ""
else
    echo "❌ Error: Xcode workspace not found at ios/znapdisposablecamera.xcworkspace"
    echo "Try running: expo prebuild --platform ios --clean"
    exit 1
fi