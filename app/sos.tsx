import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, useTheme, Card, IconButton } from 'react-native-paper';
import { EmergencyService } from '../services/EmergencyService';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { useRouter } from 'expo-router';

export default function SOSScreen() {
  const theme = useTheme();
  const { contacts } = useEmergencyStore();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.error }}>
          Emergency SOS
        </Text>
        <Text variant="bodyMedium">Immediate actions for your safety.</Text>
      </View>

      <View style={styles.section}>
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          onPress={() => EmergencyService.callEmergencyServices()}
          style={styles.sosButton}
          labelStyle={styles.sosButtonLabel}
          icon="phone-alert"
        >
          Call Emergency Services
        </Button>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Call Emergency Contact
      </Text>
      {contacts.map((contact) => (
        <Card key={contact.id} style={styles.card} onPress={() => EmergencyService.callNumber(contact.phone_number)}>
          <Card.Title
            title={contact.name}
            subtitle={contact.relationship}
            right={(props) => <IconButton {...props} icon="phone" />}
          />
        </Card>
      ))}
      {contacts.length === 0 && (
        <Text style={styles.emptyText}>No emergency contacts configured.</Text>
      )}

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => {
            router.push('/(tabs)');
          }}
          style={styles.actionButton}
          icon="share-variant"
        >
          Share Live Location
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.push('/(tabs)/nearby?type=hospital')}
          style={styles.actionButton}
          icon="hospital-building"
        >
          Nearby Hospitals
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  section: { marginBottom: 30 },
  sosButton: { paddingVertical: 12, borderRadius: 12 },
  sosButtonLabel: { fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { marginBottom: 12, fontWeight: 'bold' },
  card: { marginBottom: 8 },
  actions: { marginTop: 20, gap: 12 },
  actionButton: { borderRadius: 8 },
  emptyText: { textAlign: 'center', marginVertical: 20, opacity: 0.6 },
});
