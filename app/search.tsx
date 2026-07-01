import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useJourneyStore } from '../store/useJourneyStore';
import { PlaceAutocomplete } from '../components/PlaceAutocomplete';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { startJourney } = useJourneyStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="titleLarge" style={styles.title}>Search Destination</Text>

      <PlaceAutocomplete
        placeholder="Search for a bus stop or place"
        onPlaceSelected={(name, lat, lon) => {
          startJourney(
            name,
            {
              latitude: lat,
              longitude: lon,
            }
          );
          router.replace('/tracking');
        }}
      />

      <Button mode="text" onPress={() => router.back()} style={styles.cancelButton}>Cancel</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { marginBottom: 20 },
  cancelButton: { marginTop: 20 },
});
