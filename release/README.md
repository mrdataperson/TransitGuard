# TransitGuard

TransitGuard is a production-quality public transport safety application built with React Native and Expo. It focuses on passenger safety during bus travel by providing real-time tracking, destination alerts, and emergency assistance.

## Key Features

- **Destination Arrival Alert**: Search destinations and receive notifications/vibrations when within 500m (configurable). Powered by OpenStreetMap (Nominatim).
- **Live Location Sharing**: Generate secure journey IDs and share real-time location with trusted viewers via Supabase.
- **Nearby Bus Stops & Hospitals**: Detect current location and find nearby transit points or medical facilities with walking distance and time. Powered by OpenStreetMap (Overpass API).
- **Emergency Contacts**: Manage trusted contacts and perform one-tap calls.
- **SOS Hub**: Immediate access to emergency services, contacts, and live sharing.

## Tech Stack

- **Frontend**: React Native (Expo SDK 52), TypeScript, Expo Router, React Native Paper (Material Design 3).
- **State Management**: Zustand with persistence.
- **Backend**: Supabase (Auth, Database, RLS).
- **Maps**: React Native Maps with OpenStreetMap data services.

## Getting Started

1. Clone the repository.
2. Follow `SETUP.md` for environment configuration.
3. Install dependencies: `npm install`.
4. Start the app: `npx expo start`.

## Documentation

- [Setup Guide](./SETUP.md)
- [Environment Variables](./ENVIRONMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Project Structure](./PROJECT_STRUCTURE.md)
