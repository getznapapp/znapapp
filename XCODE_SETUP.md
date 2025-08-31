# Xcode Project Configuration Guide

## Bundle Identifier Setup

When opening the project in Xcode, you'll need to configure a unique Bundle Identifier:

### Recommended Bundle Identifiers:
- `com.yourname.znapdisposablecamera`
- `com.yourcompany.znap`
- `com.yourname.znap.disposable`

### Steps to Change Bundle Identifier:

1. Open `ios/znapdisposablecamera.xcworkspace` in Xcode
2. Select the project name in the navigator (top-level)
3. Select the target "znapdisposablecamera"
4. Go to "General" tab
5. Change "Bundle Identifier" to your unique identifier
6. Go to "Signing & Capabilities" tab
7. Enable "Automatically manage signing"
8. Select your Apple Developer Team

## Required Capabilities

The app requires these capabilities (already configured):
- Camera access
- Photo Library access
- Network access
- Background modes (for photo sync)

## Deployment Target

- **Minimum**: iOS 13.4
- **Recommended**: iOS 15.0+

## Build Settings

### Release Configuration:
- Build Configuration: Release
- Code Signing: Automatic
- Provisioning Profile: Automatic
- Architecture: arm64 (for device), x86_64 + arm64 (for simulator)

### Debug Configuration:
- Build Configuration: Debug
- Enable debugging symbols
- Disable optimizations

## Common Build Issues

### 1. Signing Issues
```
Error: "Failed to create provisioning profile"
```
**Solution**: 
- Ensure Bundle Identifier is unique
- Check Apple Developer account status
- Enable "Automatically manage signing"

### 2. Missing Modules
```
Error: "No such module 'ExpoModulesCore'"
```
**Solution**:
```bash
rm -rf ios
expo prebuild --clean
```

### 3. Pod Install Issues
```
Error: "CocoaPods could not find compatible versions"
```
**Solution**:
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

## Archive and Distribution

### For TestFlight:
1. Select "Any iOS Device (arm64)"
2. Product → Archive
3. Distribute App → App Store Connect
4. Upload to App Store Connect
5. Process in TestFlight

### For App Store:
1. Complete TestFlight testing
2. Create App Store listing in App Store Connect
3. Submit for review
4. Wait for approval

## App Store Requirements

### Required Information:
- App Name: "Znap - Disposable Camera"
- Category: Photo & Video
- Age Rating: 4+ (or appropriate rating)
- Privacy Policy URL
- Support URL

### Required Screenshots:
- iPhone 6.7" (iPhone 14 Pro Max)
- iPhone 6.5" (iPhone 11 Pro Max)
- iPhone 5.5" (iPhone 8 Plus)
- iPad Pro 12.9" (3rd generation)
- iPad Pro 12.9" (2nd generation)

### App Description Template:
```
Znap brings back the magic of disposable cameras in the digital age. Create shared camera experiences with friends and family, where photos are revealed only when the "roll" is complete.

Features:
• Create disposable camera sessions
• Invite friends via QR codes
• Take photos that stay hidden until reveal
• Cloud sync and backup
• Beautiful, intuitive interface
• Offline functionality

Perfect for parties, events, trips, and special moments you want to experience together.
```

## Testing Checklist

Before submission, test:
- [ ] Camera functionality on device
- [ ] Photo saving and loading
- [ ] QR code generation and scanning
- [ ] Deep linking from web
- [ ] Offline functionality
- [ ] Cloud sync when online
- [ ] App backgrounding/foregrounding
- [ ] Different iOS versions (13.4+)
- [ ] Different device sizes
- [ ] Permission requests work properly