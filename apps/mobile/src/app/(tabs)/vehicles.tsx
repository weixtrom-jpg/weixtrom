import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface VehiclesResponse {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function VehiclesTab() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVehicles = useCallback(async (pageNum = 1, append = false) => {
    try {
      setError(null);
      const res = await api.get<VehiclesResponse>(
        `/vehicles?page=${pageNum}&limit=10&status=ALL`,
      );
      if (append) {
        setVehicles((prev) => [...prev, ...res.data]);
      } else {
        setVehicles(res.data);
      }
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar vehiculos';
      setError(message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadVehicles(1).finally(() => setIsLoading(false));
    }, [loadVehicles]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadVehicles(1);
    setIsRefreshing(false);
  }, [loadVehicles]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    await loadVehicles(page + 1, true);
    setIsLoadingMore(false);
  }, [isLoadingMore, page, totalPages, loadVehicles]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  if (error && vehicles.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setIsLoading(true);
          loadVehicles(1).finally(() => setIsLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin vehiculos registrados</Text>
          <Text style={styles.emptyText}>
            Registra tu primer vehiculo para empezar a gestionar su mantenimiento.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/vehicle/register')}
          >
            <Text style={styles.addButtonText}>Registrar vehiculo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#1F3864"
            colors={['#1F3864']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/vehicle/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.plateContainer}>
                <Ionicons name="car-sport" size={20} color="#1F3864" />
                <Text style={styles.plateText}>{item.plate}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'ACTIVE'
                    ? styles.statusActive
                    : styles.statusInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'ACTIVE'
                      ? styles.statusActiveText
                      : styles.statusInactiveText,
                  ]}
                >
                  {item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
            <Text style={styles.vehicleInfo}>
              {item.brand} {item.model}
            </Text>
            <Text style={styles.vehicleYear}>
              {item.year}
              {item.color ? ` - ${item.color}` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              size="small"
              color="#1F3864"
              style={styles.loadingMore}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/vehicle/register')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  centered: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  listContent: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E6ED',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plateContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F3864',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusActiveText: { color: '#16A34A' },
  statusInactiveText: { color: '#6B7280' },
  vehicleInfo: { fontSize: 15, fontWeight: '500', color: '#111827' },
  vehicleYear: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Error state
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1F3864',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Loading more
  loadingMore: { paddingVertical: 16 },
});
