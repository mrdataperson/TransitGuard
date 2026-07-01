import { Linking, Platform } from 'react-native';

export class MapService {
  /**
   * Fetches nearby bus stops or hospitals using OpenStreetMap Overpass API
   */
  static async getNearbyPlaces(latitude: number, longitude: number, type: string = 'bus_station') {
    const osmType = type === 'hospital' ? 'amenity=hospital' : 'highway=bus_stop';
    const radius = 1500;

    // Overpass QL query: find nodes/ways/relations with the specified tag around the coords
    const query = `
      [out:json][timeout:25];
      (
        node["${osmType}"](around:${radius},${latitude},${longitude});
        way["${osmType}"](around:${radius},${latitude},${longitude});
        relation["${osmType}"](around:${radius},${latitude},${longitude});
      );
      out body;
      >;
      out skel qt;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      // Transform Overpass data into a consistent format for the app
      return (data.elements || [])
        .filter((el: any) => el.tags && (el.tags.name || el.tags.ref))
        .map((el: any) => ({
          place_id: el.id.toString(),
          name: el.tags.name || `Stop ${el.tags.ref || el.id}`,
          geometry: {
            location: {
              lat: el.lat || el.center?.lat || latitude,
              lng: el.lon || el.center?.lon || longitude,
            }
          }
        }));
    } catch (error) {
      // Error handled silently
      return [];
    }
  }

  static openInGoogleMaps(latitude: number, longitude: number, label: string) {
    // Note: Standard maps schemes work without API keys.
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  }
}
