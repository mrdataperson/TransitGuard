# TransitGuard Project Structure

```
TransitGuard/
├── app/                  # Expo Router directory (Screens)
│   ├── (tabs)/           # Tab-based navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx     # Home Screen
│   │   ├── nearby.tsx    # Nearby Bus Stops / Hospitals
│   │   ├── emergency.tsx # Emergency Contacts
│   │   └── settings.tsx  # Settings
│   ├── _layout.tsx       # Root layout & providers
│   ├── search.tsx        # Destination search
│   ├── sos.tsx           # SOS Emergency screen
│   └── tracking.tsx      # Live Tracking & Map screen
├── assets/               # Static assets (images, fonts)
├── components/           # Reusable UI components
├── constants/            # Application constants (colors, layout)
├── hooks/                # Custom React hooks
├── services/             # API and external service logic
│   ├── EmergencyService.ts
│   ├── LiveLocationService.ts
│   ├── LocationService.ts
│   ├── MapService.ts
│   ├── NotificationService.ts
│   └── supabaseClient.ts
├── store/                # State management (Zustand)
│   ├── useEmergencyStore.ts
│   └── useJourneyStore.ts
├── supabase/             # Database migrations and schema
│   └── schema.sql
├── types/                # TypeScript type definitions
└── utils/                # Helper functions and utilities
```
