# TransitGuard

TransitGuard is a production-quality public transport safety application built with React Native and Expo. It focuses on passenger safety during bus travel by providing real-time tracking, destination alerts, and emergency assistance.

## Key Features

- **Destination Arrival Alert**: Search destinations and receive notifications/vibrations when within 500m (configurable).
- **Live Location Sharing**: Generate secure journey IDs and share real-time location with trusted viewers via Supabase.
- **Nearby Bus Stops & Hospitals**: Detect current location and find nearby transit points or medical facilities with walking distance and time.
- **Emergency Contacts**: Manage trusted contacts and perform one-tap calls.
- **SOS Hub**: Immediate access to emergency services, contacts, and live sharing.

## Tech Stack

- **Frontend**: React Native (Expo SDK 52), TypeScript, Expo Router, React Native Paper (Material Design 3).
- **State Management**: Zustand with persistence.
- **Backend**: Supabase (Auth, Database, RLS).
- **Maps**: Google Maps SDK & Google Places API.

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

## Known Limitations

- **API Keys**: Requires valid Google Maps and Supabase API keys to function.
- **Background Tracking**: OS-level power management may occasionally throttle background location updates.
- **Manual SOS**: Emergency actions (calling contacts/services) require user confirmation in the native dialer.

## Future Enhancements

- **Automated SMS**: Integration with Twilio for automated emergency SMS alerts.
- **Real-time Transit Data**: Integration with GTFS-Realtime feeds for live bus schedules.
- **Safety Community**: User-reported safety incidents on specific bus routes.
- **Wearable Support**: SOS triggers from Apple Watch or Wear OS devices.
