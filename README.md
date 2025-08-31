# Znap - Disposable Camera App

A beautiful React Native disposable camera app built with Expo, featuring real-time photo sharing, QR code invitations, and cloud storage.

## 🚀 Quick Start for Xcode Development

### Prerequisites
- macOS with Xcode 16.4 or later
- Node.js 18+ 
- npm or yarn
- Apple Developer Account (for device testing)

### Setup Instructions

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd znap-disposable-camera
   npm install
   ```

2. **Generate Native iOS Project**
   ```bash
   # Make the setup script executable
   chmod +x setup-xcode.sh
   
   # Run the setup script
   ./setup-xcode.sh
   ```

3. **Open in Xcode**
   ```bash
   # Open the workspace (NOT the .xcodeproj file)
   open ios/znapdisposablecamera.xcworkspace
   ```

4. **Configure Signing**
   - In Xcode, select the project in the navigator
   - Go to "Signing & Capabilities" tab
   - Enable "Automatically manage signing"
   - Select your Apple Developer Team
   - Change Bundle Identifier if needed (e.g., `com.yourname.znapdisposablecamera`)

5. **Build and Run**
   - Select a simulator or connected iOS device
   - Press ⌘R or click the Run button
   - The app should build and launch successfully

## 📱 Supported iOS Versions
- **Minimum**: iOS 13.4
- **Recommended**: iOS 15.0+
- **Tested on**: iOS 16.0+ and iOS 17.0+

## 🛠 Development Workflow

### Running in Development Mode
```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator  
npm run android

# Run on web
npm run web
```

### Building for Production

#### Using Expo Build Service (EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

#### Using Xcode (Local Build)
1. Open `ios/znapdisposablecamera.xcworkspace` in Xcode
2. Select "Any iOS Device" or your connected device
3. Go to Product → Archive
4. Follow the App Store submission process

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup
1. Create a Supabase project at https://supabase.com
2. Set up the database tables (see `SUPABASE_SETUP.md`)
3. Create a storage bucket named "camera-photos"
4. Configure Row Level Security policies

### Deep Linking
The app supports deep linking with the custom scheme `znap://`
- Camera invites: `znap://camera?id=camera-id`
- Web fallback: `https://znapapp.netlify.app/camera?id=camera-id`

## 📦 Key Dependencies

### Core Framework
- **Expo SDK 53**: React Native framework
- **Expo Router**: File-based navigation
- **React Native 0.79**: Core React Native

### Camera & Media
- **expo-camera**: Camera functionality
- **expo-image-picker**: Photo library access
- **expo-image**: Optimized image component

### Backend & Storage
- **@supabase/supabase-js**: Database and storage
- **@tanstack/react-query**: Data fetching and caching
- **@trpc/client**: Type-safe API client

### UI & Animations
- **lucide-react-native**: Icon library
- **expo-blur**: Native blur effects
- **react-native-gesture-handler**: Touch gestures
- **react-native-reanimated**: Smooth animations

## 🏗 Project Structure

```
znap-disposable-camera/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   ├── (auth)/            # Authentication screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
├── store/                # State management (Zustand)
├── lib/                  # Utilities and configurations
├── backend/              # tRPC API routes
├── constants/            # App constants and theme
├── assets/               # Images and static files
└── ios/                  # Generated iOS project (after prebuild)
```

## 🚨 Troubleshooting

### Common Xcode Issues

**1. "No such module 'ExpoModulesCore'"**
```bash
# Clean and regenerate
rm -rf ios android
expo prebuild --clean
```

**2. Signing Issues**
- Change Bundle Identifier to something unique
- Enable "Automatically manage signing"
- Ensure you have a valid Apple Developer account

**3. Build Errors**
```bash
# Clean Xcode build folder
# In Xcode: Product → Clean Build Folder (⌘⇧K)

# Reset Metro cache
npx expo start --clear
```

**4. Simulator Not Loading**
- Ensure Metro bundler is running (`npm start`)
- Check that the simulator iOS version is supported
- Try resetting the simulator

### Metro Bundler Issues
```bash
# Clear all caches
npx expo start --clear

# Reset Metro cache
npx react-native start --reset-cache
```

### Dependency Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# iOS specific
cd ios && pod install && cd ..
```

## 📋 Pre-Submission Checklist

Before submitting to the App Store:

- [ ] Test on physical iOS devices
- [ ] Verify all camera permissions work
- [ ] Test deep linking functionality
- [ ] Ensure offline functionality works
- [ ] Test photo upload and sync
- [ ] Verify QR code generation and scanning
- [ ] Check app icons and splash screens
- [ ] Test on different iOS versions (13.4+)
- [ ] Verify bundle identifier is unique
- [ ] Configure App Store metadata
- [ ] Add privacy policy URL
- [ ] Test TestFlight distribution

## 🔐 Privacy & Permissions

The app requests the following permissions:
- **Camera**: To take photos for the disposable camera experience
- **Microphone**: For video recording features (if implemented)
- **Photo Library**: To save and manage camera photos
- **Network**: For cloud sync and sharing features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on iOS devices
5. Submit a pull request

## 📞 Support

If you encounter issues:
1. Check this README for common solutions
2. Review the troubleshooting section
3. Check Expo documentation: https://docs.expo.dev
4. Open an issue on GitHub

---

**Note**: This app was built with Expo and uses managed workflow with prebuild for native development. The generated iOS project in the `ios/` folder should not be manually edited as it will be regenerated when running `expo prebuild`.