# TransitGuard Setup Guide

Follow these steps to configure the project for development.

## 1. Supabase Configuration

1. Create a project at [Supabase](https://supabase.com).
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`.
3. Go to Project Settings > API and note your `URL` and `anon public` key.

## 2. OpenStreetMap Data Services

TransitGuard uses free OpenStreetMap services for location-based features:
- **Nominatim API**: For destination search and geocoding.
- **Overpass API**: For finding nearby bus stops and hospitals.
No API keys are required for these services in development.

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
