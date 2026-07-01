# TransitGuard Demo Script

**Duration**: 3-5 Minutes

## 1. Introduction (0:00 - 0:45)
- **The Problem**: Public transport, especially night bus travel, can be stressful for passengers concerned about missing their stop or personal safety.
- **The Solution**: TransitGuard is a safety companion that provides real-time tracking, proximity alerts, and emergency tools to ensure a secure journey.

## 2. Architecture & Tech Stack (0:45 - 1:30)
- **Frontend**: Built with **Expo (React Native)** using **Expo Router** for type-safe navigation.
- **UI**: Implements **Material Design 3** via **React Native Paper**.
- **Backend**: Utilizes **Supabase** for real-time location storage and user data isolation via Row Level Security.
- **State**: **Zustand** with persistence ensures journey data survives app restarts.
- **Location**: **Expo Location** and **Task Manager** for high-accuracy background tracking.
- **Data Services**: Integrated with **OpenStreetMap** APIs (**Nominatim** and **Overpass**) for completely free geocoding and proximity search.

## 3. Key Feature Walkthrough (1:30 - 3:30)
- **Start Journey**: Search for a destination using the custom **PlaceAutocomplete** powered by Nominatim.
- **Destination Alert**: Demonstrate the proximity detection. When within 500m, the app triggers a notification and vibration.
- **Live Sharing**: Generate a secure link. Real-time updates are pushed to Supabase, allowing trusted contacts to follow the journey live.
- **Nearby Support**: One-tap discovery of bus stops and hospitals using the **Overpass API**, with distances calculated using the Haversine formula.
- **SOS Hub**: Centralized screen for immediate emergency calls and location sharing.

## 4. Challenges & Solutions (3:30 - 4:30)
- **Challenge**: Moving away from proprietary map APIs to OpenStreetMap.
  - **Solution**: Developed a custom autocomplete component using the Nominatim API and implemented complex Overpass QL queries to find transit infrastructure.
- **Challenge**: Notification spamming during proximity detection.
  - **Solution**: Implemented an `alertTriggered` state flag to ensure notifications only fire once.
- **Challenge**: Background process termination by the OS.
  - **Solution**: Integrated Zustand middleware with AsyncStorage to persist journey state.

## 5. Conclusion (4:30 - 5:00)
- TransitGuard provides a robust, reliable, and completely free safety net for transit users. Powered by OpenStreetMap.
