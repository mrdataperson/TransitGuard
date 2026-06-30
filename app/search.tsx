import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTheme, Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useJourneyStore } from '../store/useJourneyStore';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { startJourney } = useJourneyStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="titleLarge" style={styles.title}>Search Destination</Text>

      <GooglePlacesAutocomplete
        placeholder="Search for a bus stop or place"
        fetchDetails={true}
        onPress={(data, details = null) => {
          if (details) {
            startJourney(
              data.description,
              {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
              }
            );
            router.replace('/tracking');
          }
        }}
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'en',
          types: 'establishment|geocode',
        }}
        styles={{
          textInputContainer: styles.autocompleteContainer,
          textInput: [styles.autocompleteInput, { color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceVariant }],
          predefinedPlacesDescription: { color: '#1faadb' },
        }}
      />

      <Button mode="text" onPress={() => router.back()}>Cancel</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { marginBottom: 20 },
  autocompleteContainer: { width: '100%', marginBottom: 10 },
  autocompleteInput: { height: 50, borderRadius: 8, paddingHorizontal: 15, fontSize: 16 },
});
