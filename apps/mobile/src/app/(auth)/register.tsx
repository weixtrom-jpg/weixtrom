import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { api } from '../../lib/api';

const ROLES = [
  { value: 'CLIENT', label: 'Propietario' },
  { value: 'WORKSHOP_ADMIN', label: 'Taller' },
  { value: 'SUPPLIER_ADMIN', label: 'Proveedor' },
  { value: 'TECHNICIAN', label: 'Tecnico' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleRegister = async () => {
    if (!form.firstName || !form.email || !form.password || !form.role) {
      setError('Completa los campos obligatorios y selecciona tu rol');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.heading}>Crear cuenta</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => update('firstName', v)} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => update('lastName', v)} />
            </View>
          </View>

          <Text style={styles.label}>Correo</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Telefono</Text>
          <TextInput style={styles.input} value={form.phone} onChangeText={(v) => update('phone', v)} keyboardType="phone-pad" />

          <Text style={styles.label}>Contrasena</Text>
          <TextInput style={styles.input} value={form.password} onChangeText={(v) => update('password', v)} secureTextEntry />

          <Text style={[styles.label, { marginTop: 16 }]}>Soy...</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, form.role === r.value && styles.roleBtnActive]}
                onPress={() => update('role', r.value)}
              >
                <Text style={[styles.roleText, form.role === r.value && styles.roleTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creando...' : 'Crear cuenta'}</Text>
          </TouchableOpacity>

          <Link href="/(auth)/login" style={styles.link}>Ya tienes cuenta? Inicia sesion</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E2E6ED' },
  heading: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 16, textAlign: 'center' },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, color: '#B91C1C', fontSize: 14, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E6ED', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 44, color: '#111827' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: { borderWidth: 1, borderColor: '#E2E6ED', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  roleBtnActive: { borderColor: '#FF6B35', backgroundColor: '#FFF7ED' },
  roleText: { fontSize: 14, color: '#111827' },
  roleTextActive: { color: '#FF6B35', fontWeight: '600' },
  button: { backgroundColor: '#FF6B35', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20, minHeight: 48 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#FF6B35', fontSize: 14, textAlign: 'center', marginTop: 16 },
});
