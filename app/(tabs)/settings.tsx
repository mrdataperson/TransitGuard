import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, useTheme, Divider, Text } from 'react-native-paper';

export default function SettingsScreen() {
  const theme = useTheme();
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
        <List.Subheader>App Settings</List.Subheader>
        <List.Item
          title="Notifications"
          description="Enable destination arrival alerts"
          right={() => <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />}
        />
        <Divider />
        <List.Item
          title="Dark Mode"
          description="Switch between light and dark themes"
          right={() => <Switch value={isDarkMode} onValueChange={setIsDarkMode} />}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Profile"
          left={(props) => <List.Icon {...props} icon="account" />}
          onPress={() => {}}
        />
        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-check" />}
          onPress={() => {}}
        />
        <List.Item
          title="Logout"
          titleStyle={{ color: theme.colors.error }}
          left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
          onPress={() => {}}
        />
      </List.Section>

      <View style={styles.footer}>
        <Text variant="bodySmall">TransitGuard v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: { alignItems: 'center', padding: 20, marginTop: 20 },
});
