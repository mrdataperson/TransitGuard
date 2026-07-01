import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, List, Text, ActivityIndicator, useTheme } from 'react-native-paper';

interface Place {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface PlaceAutocompleteProps {
  placeholder: string;
  onPlaceSelected: (name: string, latitude: number, longitude: number) => void;
}

export const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({ placeholder, onPlaceSelected }) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const searchPlaces = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`,
        {
          headers: {
            'User-Agent': 'TransitGuard/1.0',
          },
        }
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label={placeholder}
        value={query}
        onChangeText={searchPlaces}
        mode="outlined"
        right={loading ? <TextInput.Icon icon={() => <ActivityIndicator size="small" />} /> : null}
      />
      {results.length > 0 && (
        <View style={[styles.resultsContainer, { backgroundColor: theme.colors.elevation.level2 }]}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onPlaceSelected(item.display_name, parseFloat(item.lat), parseFloat(item.lon));
                  setResults([]);
                  setQuery(item.display_name);
                }}
              >
                <List.Item
                  title={item.display_name}
                  titleNumberOfLines={2}
                  left={(props) => <List.Icon {...props} icon="map-marker" />}
                />
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', zIndex: 10 },
  resultsContainer: {
    maxHeight: 250,
    borderRadius: 8,
    marginTop: 4,
    elevation: 4,
  },
});
