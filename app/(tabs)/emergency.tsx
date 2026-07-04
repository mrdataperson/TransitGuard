import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Text,
  FAB,
  List,
  IconButton,
  Portal,
  Modal,
  TextInput,
  Button,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import { useEmergencyStore } from '../../store/useEmergencyStore';
import { EmergencyService, EmergencyContact } from '../../services/EmergencyService';

export default function EmergencyScreen() {
  const theme = useTheme();
  const { contacts, fetchContacts, addContact, updateContact, deleteContact, isLoading, error } =
    useEmergencyStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleOpenModal = (contact?: EmergencyContact) => {
    if (contact) {
      setEditingContact(contact);
      setName(contact.name);
      setRelationship(contact.relationship);
      setPhone(contact.phone_number);
    } else {
      setEditingContact(null);
      setName('');
      setRelationship('');
      setPhone('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (editingContact?.id) {
      await updateContact(editingContact.id, { name, relationship, phone_number: phone });
    } else {
      await addContact({ name, relationship, phone_number: phone });
    }
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.relationship} • ${item.phone_number}`}
            left={(props) => <List.Icon {...props} icon="account" />}
            right={(props) => (
              <View style={styles.actions}>
                <IconButton icon="phone" onPress={() => EmergencyService.callNumber(item.phone_number)} />
                <IconButton icon="pencil" onPress={() => handleOpenModal(item)} />
                <IconButton icon="delete" onPress={() => deleteContact(item.id!)} />
              </View>
            )}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No emergency contacts added yet.</Text>
          </View>
        }
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {editingContact ? 'Edit Contact' : 'Add Contact'}
          </Text>
          <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />
          <TextInput
            label="Relationship"
            value={relationship}
            onChangeText={setRelationship}
            style={styles.input}
          />
          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSave} style={styles.button} loading={isLoading}>
            Save
          </Button>
        </Modal>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={() => handleOpenModal()} />

      <Snackbar
        visible={!!error}
        onDismiss={() => useEmergencyStore.setState({ error: null })}
        duration={4000}
      >
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { flexDirection: 'row' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  modal: { padding: 20, margin: 20, borderRadius: 8 },
  modalTitle: { marginBottom: 20 },
  input: { marginBottom: 15 },
  button: { marginTop: 10 },
});
