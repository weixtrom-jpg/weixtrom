import { View, Text, StyleSheet } from 'react-native';

export default function InvoicesTab() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Sin facturas</Text>
        <Text style={styles.emptyText}>
          Tus facturas apareceran aqui cuando completes un servicio.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', padding: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
