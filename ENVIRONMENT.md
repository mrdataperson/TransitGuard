# TransitGuard Environment Variables Guide

To run this project, you will need to add the following environment variables to your `.env` file in the root directory:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps API Configuration
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### How to get these keys:

1. **Supabase**:
   - Go to your Supabase Project Settings > API.
   - Copy the `Project URL` and `anon public` key.

2. **Google Maps**:
   - Go to Google Cloud Console.
   - Enable Maps SDK for Android, Maps SDK for iOS, and Places API.
   - Create an API Key in Credentials.
