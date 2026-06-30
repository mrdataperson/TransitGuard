import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, List, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MapService } from '../../services/MapService';
import { LocationService } from '../../services/LocationService';
import { useLocalSearchParams } from 'expo-router';

export default function NearbyScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const type = (params.type as string) || 'bus_station';
  const title = type === 'hospital' ? 'Nearby Hospitals' : 'Nearby Bus Stops';

  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadNearby = useCallback(async () => {
    setLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);
      const results = await MapService.getNearbyPlaces(coords.latitude, coords.longitude, type);
      setPlaces(results);
    } catch (error) {
      // Error logged silently in production
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNearby();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadNearby]);

  const calculateWalkingTime = (distanceInMeters: number) => {
    const seconds = distanceInMeters / 1.4;
    const minutes = Math.round(seconds / 60);
    return minutes;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="titleMedium" style={styles.headerTitle}>{title}</Text>
      {loading && places.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          onRefresh={loadNearby}
          refreshing={loading}
          renderItem={({ item }) => {
            const distance = userLocation
              ? LocationService.calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  item.geometry.location.lat,
                  item.geometry.location.lng
                )
              : 0;

            return (
              <List.Item
                title={item.name}
                description={`${(distance / 1000).toFixed(2)} km • ~${calculateWalkingTime(distance)} min walk`}
                left={(props) => <List.Icon {...props} icon={type === 'hospital' ? 'hospital-building' : 'bus-stop'} />}
                right={(props) => (
                  <IconButton
                    icon="directions"
                    onPress={() => MapService.openInGoogleMaps(
                      item.geometry.location.lat,
                      item.geometry.location.lng,
                      item.name
                    )}
                  />
                )}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>No results found nearby.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { padding: 16, textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10 },
});
