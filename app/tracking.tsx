import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Text, Button, Card, useTheme, IconButton, Snackbar } from 'react-native-paper';
import { useJourneyStore } from '../store/useJourneyStore';
import { LocationService } from '../services/LocationService';
import { LiveLocationService } from '../services/LiveLocationService';
import { useRouter } from 'expo-router';

export default function TrackingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { currentJourney, currentLocation, stopJourney } = useJourneyStore();
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const distance = useMemo(() => {
    if (currentLocation && currentJourney) {
      return LocationService.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        currentJourney.destinationCoords.latitude,
        currentJourney.destinationCoords.longitude
      );
    }
    return null;
  }, [currentLocation, currentJourney]);

  if (!currentJourney) {
    return (
      <View style={styles.centered}>
        <Text>No active journey.</Text>
        <Button onPress={() => router.replace('/(tabs)')}>Go Home</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: currentLocation?.latitude || currentJourney.destinationCoords.latitude,
          longitude: currentLocation?.longitude || currentJourney.destinationCoords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="You"
            pinColor={theme.colors.primary}
          />
        )}
        <Marker
          coordinate={currentJourney.destinationCoords}
          title="Destination"
          description={currentJourney.destinationName}
        />
      </MapView>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleLarge">{currentJourney.destinationName}</Text>
          <Text variant="bodyMedium">
            {distance !== null
              ? `Distance remaining: ${(distance / 1000).toFixed(2)} km`
              : 'Calculating distance...'}
          </Text>
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => stopJourney().then(() => router.replace('/(tabs)'))}
              style={styles.actionButton}
            >
              Finish Journey
            </Button>
            <IconButton
              icon="share-variant"
              mode="contained"
              onPress={async () => {
                if (currentJourney.shareId) {
                  const url = LiveLocationService.getShareUrl(currentJourney.shareId);
                  try {
                    await Share.share({
                      message: `Follow my journey live on TransitGuard: ${url}`,
                      url: url,
                    });
                  } catch (error) {
                    setSnackbarVisible(true);
                  }
                }
              }}
            />
          </View>
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        Failed to share journey link.
      </Snackbar>

      <IconButton
        icon="chevron-left"
        style={styles.backButton}
        mode="contained"
        onPress={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  infoCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    elevation: 4,
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  actionButton: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 50, left: 20 },
});
