# Troubleshooting Guide for Xcode Development

## Quick Fix Commands

### Reset Everything
```bash
# Complete reset (use when nothing else works)
rm -rf node_modules ios android .expo
npm install
expo prebuild --clean
```

### Metro Bundler Issues
```bash
# Clear Metro cache
npx expo start --clear

# Reset React Native cache
npx react-native start --reset-cache
```

### iOS Specific Issues
```bash
# Clean iOS build
rm -rf ios
expo prebuild --platform ios --clean

# If using CocoaPods directly
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
```

## Common Error Solutions

### 1. "Command PhaseScriptExecution failed with a nonzero exit code"

**Cause**: Build script issues or missing dependencies

**Solutions**:
```bash
# Method 1: Clean and rebuild
rm -rf ios
expo prebuild --platform ios --clean

# Method 2: Clear Xcode cache
# In Xcode: Product → Clean Build Folder (⌘⇧K)
# Then: Product → Build (⌘B)

# Method 3: Reset Metro cache
npx expo start --clear
```

### 2. "No such module 'ExpoModulesCore'"

**Cause**: Expo modules not properly linked

**Solution**:
```bash
rm -rf ios android
expo prebuild --clean
```

### 3. "Unable to resolve module '@/components/...'"

**Cause**: TypeScript path mapping not working

**Solution**:
1. Ensure `tsconfig.json` has correct paths configuration
2. Restart Metro bundler: `npx expo start --clear`
3. Restart Xcode

### 4. "Failed to build iOS project"

**Cause**: Various build configuration issues

**Solutions**:
```bash
# Check iOS deployment target
# In Xcode: Project → Build Settings → iOS Deployment Target → 13.4

# Verify signing
# In Xcode: Project → Signing & Capabilities → Enable "Automatically manage signing"

# Clean build folder
# In Xcode: Product → Clean Build Folder (⌘⇧K)
```

### 5. "Metro bundler not responding"

**Cause**: Metro server issues

**Solutions**:
```bash
# Kill existing Metro processes
pkill -f metro

# Start fresh
npx expo start --clear

# Alternative: Use different port
npx expo start --port 8082
```

### 6. "Camera permission denied"

**Cause**: Permissions not properly configured

**Solution**:
1. Check `app.json` has camera permissions
2. Reset iOS simulator: Device → Erase All Content and Settings
3. For physical device: Settings → Privacy → Camera → Allow app

### 7. "Supabase connection failed"

**Cause**: Missing environment variables or network issues

**Solutions**:
1. Create `.env` file with Supabase credentials
2. Check network connectivity
3. Verify Supabase project is active
4. Check API keys are correct

### 8. "App crashes on launch"

**Cause**: Various runtime issues

**Debug Steps**:
1. Check Xcode console for error messages
2. Enable breakpoints in Xcode
3. Test in iOS Simulator first
4. Check Metro bundler logs

### 9. "Build succeeds but app won't install"

**Cause**: Signing or provisioning issues

**Solutions**:
1. Check Bundle Identifier is unique
2. Verify Apple Developer account
3. Check device is registered in developer portal
4. Try different iOS Simulator version

### 10. "React Native version mismatch"

**Cause**: Conflicting React Native versions

**Solution**:
```bash
# Check versions
npm list react-native
expo doctor

# Fix version conflicts
rm -rf node_modules package-lock.json
npm install
```

## Xcode-Specific Issues

### Scheme Issues
- Ensure you're selecting the correct scheme (not Pods)
- If scheme is missing: Product → Scheme → Manage Schemes → Add

### Simulator Issues
- Try different iOS versions (13.4, 14.0, 15.0, 16.0)
- Reset simulator: Device → Erase All Content and Settings
- Try different device types (iPhone 14, iPhone SE, iPad)

### Archive Issues
- Select "Any iOS Device (arm64)" before archiving
- Ensure Build Configuration is set to "Release"
- Check all targets have valid signing

### Provisioning Profile Issues
- Enable "Automatically manage signing"
- Check Apple Developer account status
- Verify Bundle Identifier is unique
- Check device UDID is registered

## Performance Issues

### Slow Build Times
```bash
# Enable parallel builds in Xcode
# Build Settings → Build Options → Enable "Parallelize Build"

# Use faster build system
# File → Project Settings → Build System → New Build System
```

### Large Bundle Size
- Check for unused dependencies
- Use Flipper only in development
- Optimize images and assets

## Environment Issues

### Node.js Version
```bash
# Check Node version (should be 18+)
node --version

# Use nvm to manage versions
nvm install 18
nvm use 18
```

### Xcode Version
- Ensure Xcode 16.4 or later
- Update Command Line Tools: `xcode-select --install`

### macOS Version
- Ensure macOS is compatible with Xcode version
- Check Apple Developer documentation for requirements

## Getting Help

### Debug Information to Collect
```bash
# System info
expo doctor
npx react-native info

# Package versions
npm list --depth=0

# Xcode version
xcodebuild -version

# iOS Simulator list
xcrun simctl list devices
```

### Log Files
- Xcode: View → Navigators → Reports
- Metro: Terminal output from `expo start`
- iOS Simulator: Device → Log Location
- Physical device: Xcode → Window → Devices and Simulators

### Community Resources
- Expo Discord: https://chat.expo.dev
- React Native Community: https://reactnative.dev/help
- Stack Overflow: Tag with `expo`, `react-native`, `ios`
- GitHub Issues: Check project repository

## Prevention Tips

1. **Keep dependencies updated**: `expo install --fix`
2. **Use Expo Doctor**: `expo doctor` to check for issues
3. **Test on multiple devices**: Different iOS versions and device types
4. **Regular clean builds**: Especially after dependency changes
5. **Version control**: Commit working states before major changes
6. **Documentation**: Keep track of custom configurations

## Emergency Recovery

If nothing works and you need to start fresh:

```bash
# 1. Backup your source code (app/, components/, etc.)
cp -r app app_backup
cp -r components components_backup
cp -r store store_backup

# 2. Complete reset
rm -rf node_modules ios android .expo package-lock.json

# 3. Fresh install
npm install

# 4. Regenerate native projects
expo prebuild --clean

# 5. Test basic functionality
expo start
```

Remember: The `ios/` folder is generated and should not be manually edited. Always use `expo prebuild` to regenerate it when needed.