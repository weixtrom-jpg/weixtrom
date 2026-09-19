import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function HomeTab() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hola, Carlos</Text>
      <Text style={styles.subtitle}>Tu resumen de hoy</Text>

      {/* Alertas legales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alertas legales</Text>
        <Text style={styles.emptyText}>No tienes alertas proximas</Text>
      </View>

      {/* Servicios activos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Servicios activos</Text>
        <Text style={styles.emptyText}>No tienes servicios en curso</Text>
      </View>

      {/* Facturas pendientes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Facturas pendientes</Text>
        <Text style={styles.emptyText}>Estas al dia con tus pagos</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1F3864' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E6ED',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingVertical: 16 },
});
