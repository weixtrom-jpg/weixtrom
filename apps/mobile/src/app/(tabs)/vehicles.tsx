import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function VehiclesTab() {
  return (
    <View style={styles.container}>
      {/* Empty state */}
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Sin vehiculos registrados</Text>
        <Text style={styles.emptyText}>
          Registra tu primer vehiculo para empezar a gestionar su mantenimiento.
        </Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Registrar vehiculo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', padding: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  addButton: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, minHeight: 44 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
