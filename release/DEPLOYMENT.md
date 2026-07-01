# TransitGuard Deployment Guide

This project is built with Expo and optimized for deployment using EAS (Expo Application Services).

## Prerequisites

- Install EAS CLI: `npm install -g eas-cli`
- Log in to your Expo account: `eas login`

## Build for Android (APK/AAB)

1. Configure EAS Build:
   ```bash
   eas build:configure
   ```

2. Build an Android APK for testing:
   ```bash
   eas build --platform android --profile preview
   ```

3. Build an Android AAB for Google Play Store:
   ```bash
   eas build --platform android --profile production
   ```

## Build for iOS

1. Build for simulator:
   ```bash
   eas build --platform ios --profile development --simulator
   ```

2. Build for App Store:
   ```bash
   eas build --platform ios --profile production
   ```

## Web Deployment

1. Export the static web files:
   ```bash
   npx expo export --platform web
   ```

2. The output will be in the `dist/` directory, which can be hosted on platforms like Netlify, Vercel, or GitHub Pages.
