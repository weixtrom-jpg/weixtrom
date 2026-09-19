import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ProfileTab() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>CD</Text>
        </View>
        <Text style={styles.name}>Carlos Demo</Text>
        <Text style={styles.email}>cliente@demo.com</Text>
      </View>

      <View style={styles.menu}>
        {['Editar perfil', 'Notificaciones', 'Ayuda', 'Cerrar sesion'].map((item) => (
          <TouchableOpacity key={item} style={styles.menuItem}>
            <Text style={[styles.menuText, item === 'Cerrar sesion' && styles.danger]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E6ED' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1F3864', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: '600', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  menu: { marginTop: 16 },
  menuItem: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E6ED', minHeight: 44 },
  menuText: { fontSize: 16, color: '#111827' },
  danger: { color: '#DC2626' },
});
