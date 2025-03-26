# Capacitor Integration Guide for ImaKOL

This guide covers how to work with Capacitor in the ImaKOL application for both iOS and Android development, following the official Capacitor workflow.

## Prerequisites

To work with the mobile app, you'll need:

- **iOS Development**:

  - macOS
  - Xcode 14 or higher
  - CocoaPods (`sudo gem install cocoapods`)
  - iOS 13 or higher (target devices)

- **Android Development**:
  - Android Studio
  - Java Development Kit (JDK) 11+
  - Android SDK with build tools
  - Android 5.0+ (API level 21+) for target devices

## Project Structure

- `capacitor.config.json` - Main Capacitor configuration
- `www/` - Web assets directory
- `ios/` - Native iOS project
- `android/` - Native Android project
- `www/app.js` - Contains Capacitor-specific JavaScript

## Official Capacitor Workflow

Capacitor has a specific development workflow that should be followed:

### 1. Develop Your Web App

Develop your web app as you normally would. When you're ready to integrate it with Capacitor:

```bash
# Build your web app
npm run build
```

Our build script copies the necessary files to the `www` directory.

### 2. Sync Your Web Code to Native Project

After making changes to your web code, sync those changes to your native projects:

```bash
npx cap sync
```

This command:

- Copies web assets to the native platforms
- Updates the native plugins
- Runs any necessary native dependency installations

### 3. Test Your Application

#### Option A: Quick Test with Run Command (Recommended for Testing)

Use the Capacitor CLI to directly build and run your app on a simulator/device:

```bash
# For iOS
npx cap run ios

# For Android
npx cap run android
```

These commands will:

1. Copy and sync web assets
2. Build the native app
3. Present a list of available devices/simulators to select from
4. Deploy and launch your app

You can also specify a target device if you know its ID:

```bash
npx cap run ios --target="device-id-here"
```

#### Option B: Open Native IDE (Recommended for Development)

To open the native IDE for more control over the build process:

```bash
# For iOS
npx cap open ios

# For Android
npx cap open android
```

Once the IDE is open, use it to run the app on a simulator/emulator or physical device.

### 4. Making Native Code Changes

If you need to make native code changes:

1. Open the native project in its IDE
2. Make your changes
3. Build and test from the IDE

### 5. Adding Capacitor Plugins

```bash
# Install the plugin
npm install @capacitor/plugin-name

# Sync the plugin to native projects
npx cap sync
```

## NPM Scripts in This Project

We've added several npm scripts to make working with Capacitor easier:

```bash
# Copy web assets to the www directory
npm run build

# Sync web assets with native projects
npm run sync

# Build and sync for iOS
npm run build:ios

# Build and sync for Android
npm run build:android

# Open iOS project in Xcode
npm run open:ios

# Open Android project in Android Studio
npm run open:android
```

## Native Integration

To use device-specific features, install Capacitor plugins:

```bash
npm install @capacitor/camera @capacitor/geolocation @capacitor/device
npx cap sync
```

Usage example:

```javascript
import { Camera } from '@capacitor/camera';

async function takePicture() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: 'uri',
  });

  // Use the image
  const imageUrl = image.webPath;
}
```

## Troubleshooting

- **iOS Build Issues**: Make sure you have the latest Xcode tools and CocoaPods installed.
- **Android Gradle Sync Issues**: If Android Studio reports Gradle sync problems, check your JDK installation.
- **Web Asset Updates Not Appearing**: Ensure you've run `npm run build` and `npx cap sync` after changes.
- **Direct Run Command Fails**: If `npx cap run ios` fails, try the longer workflow of sync then open in IDE.
- **No Simulators Available**: Install simulators through Xcode's preferences menu (Xcode > Preferences > Components).

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Workflow Guide](https://capacitorjs.com/docs/basics/workflow)
- [iOS Development Guide](https://capacitorjs.com/docs/ios)
- [Android Development Guide](https://capacitorjs.com/docs/android)
