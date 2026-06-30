# TransitGuard Known Limitations & Roadmap

## Current Constraints
1. **Battery Consumption**: High-accuracy GPS tracking (required for safety) can impact battery life on longer journeys.
2. **Offline Support**: Proximity alerts require cached map data or an active connection for destination verification, though basic location math remains functional.
3. **Map Provider**: Dependency on Google Maps SDK. Substitution with OpenStreetMap is not currently implemented.
4. **Task Priority**: On some Android devices, "Aggressive Power Saving" modes may still throttle background tasks despite permissions.

## Planned Future Enhancements
1. **Twilio Integration**: Automated SMS alerts to emergency contacts when proximity is reached.
2. **Transit API Integration**: Live bus arrival times via GTFS-Realtime feeds.
3. **Safety Incident Reporting**: Crowdsourced safety ratings for bus routes and stops.
4. **Wearable Integration**: Quick SOS trigger from Apple Watch and Wear OS.
5. **Geofencing API**: Migrate from manual distance checks to native Android/iOS Geofencing for better battery efficiency.
