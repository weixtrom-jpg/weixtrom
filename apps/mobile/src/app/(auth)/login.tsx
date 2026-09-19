import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.title}>WEIXTROM</Text>
          <Text style={styles.subtitle}>MecaniControl Vehicular</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Iniciar sesion</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Correo electronico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Contrasena</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Ingresando...' : 'Iniciar sesion'}
            </Text>
          </TouchableOpacity>

          <Link href="/(auth)/register" style={styles.link}>
            No tienes cuenta? Registrate
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1F3864' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E2E6ED' },
  heading: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 16, textAlign: 'center' },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, color: '#B91C1C', fontSize: 14, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E6ED', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 44, color: '#111827' },
  button: { backgroundColor: '#FF6B35', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20, minHeight: 48 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#FF6B35', fontSize: 14, textAlign: 'center', marginTop: 16 },
});
