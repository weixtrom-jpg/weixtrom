import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  PENDING: { label: 'Pendiente', bg: '#DBEAFE', color: '#1D4ED8' },
  TAKEN: { label: 'En atencion', bg: '#FEF3C7', color: '#D97706' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: status, bg: '#F3F4F6', color: '#6B7280' };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
  });
}

// ---- Component ----

const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function ServicesTab() {
  const router = useRouter();

  const [activeDiagnostics, setActiveDiagnostics] = useState<DiagnosticItem[]>([]);
  const [pendingQuotations, setPendingQuotations] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadActive() {
        setIsLoading(true);
        setLoadError(false);
        try {
          const [pending, taken, quotations] = await Promise.all([
            api.get<DiagnosticsResponse>('/diagnostics?page=1&limit=3&status=PENDING'),
            api.get<DiagnosticsResponse>('/diagnostics?page=1&limit=3&status=TAKEN'),
            api.get<QuotationsResponse>('/quotations?status=SENT&page=1&limit=3'),
          ]);
          if (!cancelled) {
            setActiveDiagnostics([...pending.data, ...taken.data]);
            setPendingQuotations(quotations.data);
          }
        } catch {
          if (!cancelled) setLoadError(true);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }

      loadActive();
      return () => { cancelled = true; };
    }, []),
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  // Error loading - fallback to original empty state with navigation
  if (loadError) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Sin servicios activos</Text>
          <Text style={styles.emptyText}>
            Solicita un diagnostico para tu vehiculo y un taller lo atendera.
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

  const hasContent = activeDiagnostics.length > 0 || pendingQuotations.length > 0;

  if (hasContent) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Diagnostics section */}
        {activeDiagnostics.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Solicitudes activas</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/diagnostics')}
              >
                <Text style={styles.viewAllText}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
              </TouchableOpacity>
            </View>

            {activeDiagnostics.map((item) => {
              const statusCfg = getStatusConfig(item.status);
              return (
                <TouchableOpacity
                  key={item.id}
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
                  <Text style={styles.descriptionText} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Quotations section */}
        {pendingQuotations.length > 0 ? (
          <>
            <View style={[styles.sectionHeader, activeDiagnostics.length > 0 && { marginTop: 16 }]}>
              <Text style={styles.sectionTitle}>Cotizaciones pendientes</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/quotations')}
              >
                <Text style={styles.viewAllText}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
              </TouchableOpacity>
            </View>

            {pendingQuotations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/quotations/${item.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.vehicleLabel}>
                    {item.vehicle.brand} {item.vehicle.model}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.statusText, { color: '#1D4ED8' }]}>
                      Pendiente
                    </Text>
                  </View>
                </View>
                <Text style={styles.descriptionText} numberOfLines={1}>
                  {item.vehicle.plate}
                </Text>
                <View style={styles.quotationFooter}>
                  <Text style={styles.quotationTotal}>{formatCOP.format(item.total)}</Text>
                  <Text style={styles.quotationHint}>Pendiente de aprobacion</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={[styles.noQuotationsRow, activeDiagnostics.length > 0 && { marginTop: 16 }]}>
            <Ionicons name="receipt-outline" size={18} color="#9CA3AF" />
            <Text style={styles.noQuotationsText}>Sin cotizaciones pendientes.</Text>
          </View>
        )}

        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/diagnostics/new')}
          >
            <Text style={styles.addButtonText}>Solicitar diagnostico</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // No active content - empty state
  return (
    <View style={styles.container}>
      <View style={styles.emptyContainer}>
        <Ionicons name="construct-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Sin servicios activos</Text>
        <Text style={styles.emptyText}>
          Solicita un diagnostico para tu vehiculo y un taller lo atendera.
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/diagnostics/new')}
        >
          <Text style={styles.addButtonText}>Solicitar diagnostico</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push('/diagnostics')}
        >
          <Text style={styles.historyLinkText}>Ver historial de solicitudes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scrollContent: { padding: 16 },
  centered: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingVertical: 8,
  },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
  vehicleLabel: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  descriptionText: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#9CA3AF' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Bottom action
  bottomAction: { marginTop: 16, alignItems: 'center' },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
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

  historyLink: { marginTop: 16, paddingVertical: 8 },
  historyLinkText: { fontSize: 14, color: '#1F3864', fontWeight: '500' },

  // Quotations
  quotationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quotationTotal: { fontSize: 15, fontWeight: '700', color: '#1F3864' },
  quotationHint: { fontSize: 12, color: '#1D4ED8', fontWeight: '500' },
  noQuotationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  noQuotationsText: { fontSize: 14, color: '#9CA3AF' },
});
