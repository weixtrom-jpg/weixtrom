import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileTab() {
  const { user, logout } = useAuth();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || '?';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';
  const displayEmail = user?.email || '';

  const handleMenuPress = (item: string) => {
    if (item === 'Cerrar sesion') {
      Alert.alert('Cerrar sesion', 'Estas seguro de que deseas cerrar sesion?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesion', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
      </View>

      <View style={styles.menu}>
        {['Editar perfil', 'Notificaciones', 'Ayuda', 'Cerrar sesion'].map((item) => (
          <TouchableOpacity key={item} style={styles.menuItem} onPress={() => handleMenuPress(item)}>
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
