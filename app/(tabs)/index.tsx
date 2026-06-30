import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useJourneyStore } from '../../store/useJourneyStore';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { currentJourney, stopJourney } = useJourneyStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="displaySmall">TransitGuard</Text>
        <Text variant="bodyLarge">Your travel safety companion</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          {currentJourney ? (
            <>
              <Text variant="titleMedium">Active Journey</Text>
              <Text variant="headlineSmall">{currentJourney.destinationName}</Text>
              <Button
                mode="contained"
                onPress={() => router.push('/tracking')}
                style={styles.button}
              >
                View Tracking
              </Button>
              <Button
                mode="outlined"
                onPress={() => stopJourney()}
                style={styles.button}
              >
                End Journey
              </Button>
            </>
          ) : (
            <>
              <Text variant="titleMedium">Where are you going?</Text>
              <Button
                mode="contained"
                onPress={() => router.push('/search')}
                style={styles.button}
                icon="map-search"
              >
                Search Destination
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      <View style={styles.quickActions}>
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          onPress={() => router.push('/sos')}
          style={styles.sosButton}
          icon="alert"
        >
          SOS EMERGENCY
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginTop: 40, marginBottom: 40 },
  card: { padding: 10, elevation: 4 },
  button: { marginTop: 15 },
  quickActions: { flex: 1, justifyContent: 'flex-end', marginBottom: 20 },
  sosButton: { paddingVertical: 8 },
});
