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

// ---- Types ----

interface DiagnosticVehicle {
  brand: string;
  model: string;
  year: number;
  plate: string;
}

interface DiagnosticItem {
  id: string;
  description: string;
  status: 'PENDING' | 'TAKEN' | 'DIAGNOSED' | 'EXPIRED';
  vehicle: DiagnosticVehicle;
  createdAt: string;
}

interface DiagnosticsResponse {
  data: DiagnosticItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Helpers ----

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pendiente', bg: '#DBEAFE', color: '#1D4ED8' },
  TAKEN: { label: 'En atencion', bg: '#FEF3C7', color: '#D97706' },
  DIAGNOSED: { label: 'Diagnosticada', bg: '#DCFCE7', color: '#16A34A' },
  EXPIRED: { label: 'Expirada', bg: '#F3F4F6', color: '#6B7280' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---- Component ----

export default function DiagnosticsList() {
  const router = useRouter();

  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async (pageNum = 1, append = false) => {
    try {
      setError(null);
      const res = await api.get<DiagnosticsResponse>(
        `/diagnostics?page=${pageNum}&limit=10`,
      );
      if (append) {
        setDiagnostics((prev) => [...prev, ...res.data]);
      } else {
        setDiagnostics(res.data);
      }
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar solicitudes';
      setError(message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadDiagnostics(1).finally(() => setIsLoading(false));
    }, [loadDiagnostics]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDiagnostics(1);
    setIsRefreshing(false);
  }, [loadDiagnostics]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    await loadDiagnostics(page + 1, true);
    setIsLoadingMore(false);
  }, [isLoadingMore, page, totalPages, loadDiagnostics]);

  // ---- Render ----

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  if (error && diagnostics.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setIsLoading(true);
          loadDiagnostics(1).finally(() => setIsLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (diagnostics.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin solicitudes</Text>
          <Text style={styles.emptyText}>
            No tienes solicitudes. Solicita un diagnostico para tu vehiculo.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/diagnostics/new')}
          >
            <Text style={styles.addButtonText}>Solicitar diagnostico</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={diagnostics}
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
        renderItem={({ item }) => {
          const statusCfg = getStatusConfig(item.status);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/diagnostics/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.vehicleLabel}>
                  {item.vehicle.brand} {item.vehicle.model}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {statusCfg.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.vehiclePlate}>{item.vehicle.plate}</Text>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color="#1F3864" style={styles.loadingMore} />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/diagnostics/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ---- Styles ----

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleLabel: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  vehiclePlate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F3864',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descriptionText: { fontSize: 14, color: '#6B7280', marginBottom: 8, lineHeight: 20 },
  dateText: { fontSize: 12, color: '#9CA3AF' },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Error
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginTop: 12, marginBottom: 16 },
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
