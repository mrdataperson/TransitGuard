module.exports = ({ config }) => ({
  ...config,
  name: 'TransitGuard',
  slug: 'transitguard',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'transitguard',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.transitguard.app',
    infoPlist: {
      UIBackgroundModes: [
        'location',
        'fetch'
      ]
    },
    config: {}
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.transitguard.app',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'VIBRATE',
      'POST_NOTIFICATIONS'
    ],
    config: {}
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png'
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        'image': './assets/images/splash-icon.png',
        'imageWidth': 200,
        'resizeMode': 'contain',
        'backgroundColor': '#ffffff'
      }
    ],
    [
      'expo-location',
      {
        'locationAlwaysPermission': 'Allow TransitGuard to use your location even when you are not using the app to provide arrival alerts.'
      }
    ],
    'expo-secure-store'
  ],
  experiments: {
    'typedRoutes': true
  }
});
