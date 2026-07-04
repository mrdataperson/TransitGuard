import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons, HelperText } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, signUp, isSubmitting, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setInfoMessage(null);
    clearError();

    if (!email.includes('@') || password.length < 6) {
      useAuthStore.setState({ error: 'Enter a valid email and a password of at least 6 characters.' });
      return;
    }

    if (mode === 'signin') {
      await signIn(email.trim(), password);
    } else {
      const ok = await signUp(email.trim(), password);
      if (ok) {
        setInfoMessage('Account created. If email confirmation is enabled in Supabase, check your inbox before signing in.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="displaySmall">TransitGuard</Text>
          <Text variant="bodyLarge">Sign in to sync contacts and live sharing</Text>
        </View>

        <SegmentedButtons
          value={mode}
          onValueChange={(value) => {
            setMode(value as 'signin' | 'signup');
            clearError();
            setInfoMessage(null);
          }}
          buttons={[
            { value: 'signin', label: 'Sign In' },
            { value: 'signup', label: 'Sign Up' },
          ]}
          style={styles.segmented}
        />

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />

        {error && (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        )}
        {infoMessage && (
          <HelperText type="info" visible>
            {infoMessage}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.button}
        >
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 32 },
  segmented: { marginBottom: 20 },
  input: { marginBottom: 12 },
  button: { marginTop: 10 },
});
