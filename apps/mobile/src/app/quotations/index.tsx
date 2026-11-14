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

interface QuotationVehicle {
  brand: string;
  model: string;
  year: number;
  plate: string;
}

interface QuotationItem {
  id: string;
  description: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
  total: number;
  vehicle: QuotationVehicle;
  createdAt: string;
}

interface QuotationsResponse {
  data: QuotationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Helpers ----

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Borrador', bg: '#F3F4F6', color: '#6B7280' },
  SENT: { label: 'Recibida', bg: '#DBEAFE', color: '#1D4ED8' },
  APPROVED: { label: 'Aprobada', bg: '#DCFCE7', color: '#16A34A' },
  REJECTED: { label: 'Rechazada', bg: '#FEE2E2', color: '#DC2626' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

// ---- Component ----

export default function QuotationsList() {
  const router = useRouter();

  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuotations = useCallback(async (pageNum = 1, append = false) => {
    try {
      setError(null);
      const res = await api.get<QuotationsResponse>(
        `/quotations?page=${pageNum}&limit=20`,
      );
      if (append) {
        setQuotations((prev) => [...prev, ...res.data]);
      } else {
        setQuotations(res.data);
      }
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar cotizaciones';
      setError(message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadQuotations(1).finally(() => setIsLoading(false));
    }, [loadQuotations]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadQuotations(1);
    setIsRefreshing(false);
  }, [loadQuotations]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    await loadQuotations(page + 1, true);
    setIsLoadingMore(false);
  }, [isLoadingMore, page, totalPages, loadQuotations]);

  // ---- Render ----

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  if (error && quotations.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setIsLoading(true);
          loadQuotations(1).finally(() => setIsLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (quotations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin cotizaciones</Text>
          <Text style={styles.emptyText}>
            No tienes cotizaciones pendientes.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={quotations}
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
              onPress={() => router.push(`/quotations/${item.id}`)}
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
              <View style={styles.cardFooter}>
                <Text style={styles.totalText}>{formatCOP.format(item.total)}</Text>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color="#1F3864" style={styles.loadingMore} />
          ) : null
        }
      />
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
  listContent: { padding: 16, paddingBottom: 32 },

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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: { fontSize: 16, fontWeight: '700', color: '#1F3864' },
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

  // Loading more
  loadingMore: { paddingVertical: 16 },
});
