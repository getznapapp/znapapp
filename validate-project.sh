#!/bin/bash

# Project Validation Script
# Checks if the project is ready for Xcode development

echo "🔍 Validating Znap project for Xcode development..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_PASSED=true

# Function to print status
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        VALIDATION_PASSED=false
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check Node.js
echo "📋 Checking prerequisites..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js installed ($NODE_VERSION)" 0
    
    # Check if version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_warning "Node.js version should be 18 or higher"
    fi
else
    print_status "Node.js installed" 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm installed ($NPM_VERSION)" 0
else
    print_status "npm installed" 1
fi

# Check Expo CLI
if command -v expo &> /dev/null; then
    EXPO_VERSION=$(expo --version)
    print_status "Expo CLI installed ($EXPO_VERSION)" 0
else
    print_status "Expo CLI installed" 1
fi

# Check Xcode (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v xcodebuild &> /dev/null; then
        XCODE_VERSION=$(xcodebuild -version | head -n1)
        print_status "Xcode installed ($XCODE_VERSION)" 0
        
        # Check Xcode version (should be 16.4+)
        XCODE_MAJOR=$(echo $XCODE_VERSION | grep -o '[0-9]\+' | head -n1)
        if [ "$XCODE_MAJOR" -lt 16 ]; then
            print_warning "Xcode 16.4+ recommended for best compatibility"
        fi
    else
        print_status "Xcode installed" 1
    fi
else
    print_warning "Not running on macOS - Xcode not available"
fi

echo ""
echo "📁 Checking project structure..."

# Check essential files
files_to_check=(
    "app.json"
    "package.json"
    "tsconfig.json"
    "app/_layout.tsx"
    "app/(tabs)/_layout.tsx"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file exists" 0
    else
        print_status "$file exists" 1
    fi
done

# Check node_modules
if [ -d "node_modules" ]; then
    print_status "Dependencies installed" 0
else
    print_status "Dependencies installed" 1
    echo "  Run: npm install"
fi

# Check for iOS project
if [ -d "ios" ]; then
    print_status "iOS project exists" 0
    
    # Check for workspace
    if [ -f "ios/znapdisposablecamera.xcworkspace" ]; then
        print_status "Xcode workspace exists" 0
    else
        print_status "Xcode workspace exists" 1
    fi
else
    print_warning "iOS project not generated yet"
    echo "  Run: ./setup-xcode.sh"
fi

echo ""
echo "🔧 Checking configuration..."

# Check app.json structure
if [ -f "app.json" ]; then
    if grep -q "bundleIdentifier" app.json; then
        BUNDLE_ID=$(grep -o '"bundleIdentifier": "[^"]*"' app.json | cut -d'"' -f4)
        print_status "Bundle identifier configured ($BUNDLE_ID)" 0
    else
        print_status "Bundle identifier configured" 1
    fi
    
    if grep -q "NSCameraUsageDescription" app.json; then
        print_status "Camera permissions configured" 0
    else
        print_status "Camera permissions configured" 1
    fi
fi

# Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
    if grep -q '"@/\*"' tsconfig.json; then
        print_status "TypeScript path mapping configured" 0
    else
        print_status "TypeScript path mapping configured" 1
    fi
fi

echo ""
echo "📦 Checking key dependencies..."

# Check if package.json has required dependencies
required_deps=(
    "expo"
    "react-native"
    "expo-router"
    "expo-camera"
    "@supabase/supabase-js"
)

if [ -f "package.json" ]; then
    for dep in "${required_deps[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            print_status "$dep dependency" 0
        else
            print_status "$dep dependency" 1
        fi
    done
fi

echo ""
echo "🚀 Checking build scripts..."

# Check if scripts are executable
scripts_to_check=(
    "setup-xcode.sh"
    "build-ios.sh"
    "setup-dev.sh"
)

for script in "${scripts_to_check[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            print_status "$script is executable" 0
        else
            print_warning "$script exists but not executable (run: chmod +x $script)"
        fi
    else
        print_status "$script exists" 1
    fi
done

echo ""
echo "📚 Checking documentation..."

docs_to_check=(
    "README.md"
    "XCODE_SETUP.md"
    "TROUBLESHOOTING.md"
)

for doc in "${docs_to_check[@]}"; do
    if [ -f "$doc" ]; then
        print_status "$doc exists" 0
    else
        print_status "$doc exists" 1
    fi
done

echo ""
echo "🎯 Validation Summary"
echo "===================="

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ Project is ready for Xcode development!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./setup-xcode.sh"
    echo "2. Open ios/znapdisposablecamera.xcworkspace in Xcode"
    echo "3. Configure signing and build"
    echo ""
    echo "For detailed instructions, see README.md"
else
    echo -e "${RED}❌ Project needs attention before Xcode development${NC}"
    echo ""
    echo "Please fix the issues above and run this script again."
    echo ""
    echo "Quick fixes:"
    echo "- Install missing dependencies: npm install"
    echo "- Generate iOS project: ./setup-xcode.sh"
    echo "- Make scripts executable: chmod +x *.sh"
fi

echo ""
echo "For help, see TROUBLESHOOTING.md"