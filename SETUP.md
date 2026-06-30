# TransitGuard Setup Guide

Follow these steps to configure the project for development.

## 1. Supabase Configuration

1. Create a project at [Supabase](https://supabase.com).
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`.
3. Go to Project Settings > API and note your `URL` and `anon public` key.
4. (Optional) Enable Google or Phone auth in Authentication > Providers.

## 2. Google Maps Configuration

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com).
2. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
3. Create an API Key in Credentials.
4. For production, restrict the key to your Android package name (`com.transitguard.app`) and iOS bundle ID.

## 3. Local Environment

1. Create a `.env` file in the root directory (see `ENVIRONMENT.md`).
2. Install dependencies:
   ```bash
   npm install
   ```

## 4. Database Schema

The database schema includes:
- `profiles`: User profile data.
- `emergency_contacts`: User-managed trusted contacts.
- `journeys`: Active and completed travel records.
- `shared_locations`: Real-time coordinate updates for active journeys.

Ensure RLS (Row Level Security) is enabled as per the schema file.
