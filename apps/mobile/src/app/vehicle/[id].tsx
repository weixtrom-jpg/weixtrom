import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../lib/api';

// ─── Types ──────────────────────────────────────────

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface HistoryEvent {
  id: string;
  type: 'diagnostic' | 'quotation' | 'workorder' | 'invoice';
  title: string;
  status: string;
  date: string;
}

interface HistoryResponse {
  data: HistoryEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LegalObligation {
  id: string;
  vehicleId: string;
  type: 'SOAT' | 'RTM' | 'INSURANCE';
  expiryDate: string;
  createdAt: string;
}

interface LegalObligationsResponse {
  data: LegalObligation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helpers ────────────────────────────────────────

const HISTORY_TYPES = [
  { key: '', label: 'Todos' },
  { key: 'diagnostic', label: 'Diagnosticos' },
  { key: 'quotation', label: 'Cotizaciones' },
  { key: 'workorder', label: 'Ordenes' },
  { key: 'invoice', label: 'Facturas' },
] as const;

const OBLIGATION_TYPES = ['SOAT', 'RTM', 'INSURANCE'] as const;

function getObligationLabel(type: string): string {
  switch (type) {
    case 'SOAT': return 'SOAT';
    case 'RTM': return 'Revision tecnico-mecanica';
    case 'INSURANCE': return 'Seguro';
    default: return type;
  }
}

function getObligationIcon(type: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case 'SOAT': return 'shield-check';
    case 'RTM': return 'car-cog';
    case 'INSURANCE': return 'file-document-outline';
    default: return 'file-document-outline';
  }
}

function getHistoryIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'diagnostic': return 'search';
    case 'quotation': return 'pricetag';
    case 'workorder': return 'construct';
    case 'invoice': return 'receipt';
    default: return 'document';
  }
}

function getHistoryTypeLabel(type: string): string {
  switch (type) {
    case 'diagnostic': return 'Diagnostico';
    case 'quotation': return 'Cotizacion';
    case 'workorder': return 'Orden de trabajo';
    case 'invoice': return 'Factura';
    default: return type;
  }
}

function getObligationStatus(expiryDate: string): 'valid' | 'warning' | 'expired' {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'warning';
  return 'valid';
}

function getObligationStatusConfig(status: 'valid' | 'warning' | 'expired') {
  switch (status) {
    case 'valid':
      return { label: 'Vigente', bg: '#DCFCE7', color: '#16A34A' };
    case 'warning':
      return { label: 'Proximo a vencer', bg: '#FEF3C7', color: '#D97706' };
    case 'expired':
      return { label: 'Vencido', bg: '#FEE2E2', color: '#DC2626' };
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────

type ActiveTab = 'history' | 'obligations';

export default function VehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Vehicle
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('history');

  // History
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);

  // Legal Obligations
  const [obligations, setObligations] = useState<LegalObligation[]>([]);
  const [isLoadingObligations, setIsLoadingObligations] = useState(false);

  // Modals
  const [showAddObligation, setShowAddObligation] = useState(false);
  const [showRenewObligation, setShowRenewObligation] = useState<LegalObligation | null>(null);
  const [obligationType, setObligationType] = useState<typeof OBLIGATION_TYPES[number]>('SOAT');
  const [obligationDate, setObligationDate] = useState('');
  const [obligationError, setObligationError] = useState<string | null>(null);
  const [isSavingObligation, setIsSavingObligation] = useState(false);

  // Status actions
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // ─── Data Loading ─────────────────────────────────

  const loadVehicle = useCallback(async () => {
    try {
      setError(null);
      const v = await api.get<Vehicle>(`/vehicles/${id}`);
      setVehicle(v);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar vehiculo';
      setError(message);
    }
  }, [id]);

  const loadHistory = useCallback(async (pageNum = 1, typeFilter = '', append = false) => {
    try {
      const typeParam = typeFilter ? `&type=${typeFilter}` : '';
      const res = await api.get<HistoryResponse>(
        `/vehicles/${id}/history?page=${pageNum}&limit=10${typeParam}`,
      );
      if (append) {
        setHistory((prev) => [...prev, ...res.data]);
      } else {
        setHistory(res.data);
      }
      setHistoryPage(res.page);
      setHistoryTotalPages(res.totalPages);
    } catch (err) {
      console.warn('Error cargando historial:', err);
    }
  }, [id]);

  const loadObligations = useCallback(async () => {
    try {
      const res = await api.get<LegalObligationsResponse>(
        `/vehicles/${id}/legal-obligations?limit=50`,
      );
      setObligations(res.data);
    } catch (err) {
      console.warn('Error cargando obligaciones:', err);
    }
  }, [id]);

  const loadAll = useCallback(async () => {
    await loadVehicle();
    await Promise.all([
      loadHistory(1, ''),
      loadObligations(),
    ]);
  }, [loadVehicle, loadHistory, loadObligations]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadAll().finally(() => setIsLoading(false));
    }, [loadAll]),
  );

  // ─── Actions ──────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  }, [loadAll]);

  const handleHistoryFilterChange = useCallback(async (type: string) => {
    setHistoryFilter(type);
    setIsLoadingHistory(true);
    await loadHistory(1, type);
    setIsLoadingHistory(false);
  }, [loadHistory]);

  const handleLoadMoreHistory = useCallback(async () => {
    if (isLoadingMoreHistory || historyPage >= historyTotalPages) return;
    setIsLoadingMoreHistory(true);
    await loadHistory(historyPage + 1, historyFilter, true);
    setIsLoadingMoreHistory(false);
  }, [isLoadingMoreHistory, historyPage, historyTotalPages, historyFilter, loadHistory]);

  const handleToggleStatus = useCallback(async () => {
    if (!vehicle) return;

    const action = vehicle.status === 'ACTIVE' ? 'inactivar' : 'reactivar';
    Alert.alert(
      `${vehicle.status === 'ACTIVE' ? 'Inactivar' : 'Reactivar'} vehiculo`,
      `Estas seguro de que deseas ${action} este vehiculo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: vehicle.status === 'ACTIVE' ? 'Inactivar' : 'Reactivar',
          style: vehicle.status === 'ACTIVE' ? 'destructive' : 'default',
          onPress: async () => {
            setIsTogglingStatus(true);
            try {
              const endpoint = vehicle.status === 'ACTIVE'
                ? `/vehicles/${id}/inactivate`
                : `/vehicles/${id}/activate`;
              const updated = await api.patch<Vehicle>(endpoint);
              setVehicle(updated);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Error al cambiar estado';
              Alert.alert('Error', msg);
            } finally {
              setIsTogglingStatus(false);
            }
          },
        },
      ],
    );
  }, [vehicle, id]);

  // ─── Obligation Actions ───────────────────────────

  function validateDate(dateStr: string): boolean {
    // Expected format: YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }

  async function handleAddObligation() {
    setObligationError(null);
    if (!obligationDate.trim()) {
      setObligationError('La fecha de vencimiento es obligatoria');
      return;
    }
    if (!validateDate(obligationDate.trim())) {
      setObligationError('Formato invalido. Use AAAA-MM-DD');
      return;
    }

    setIsSavingObligation(true);
    try {
      await api.post(`/vehicles/${id}/legal-obligations`, {
        type: obligationType,
        expiryDate: obligationDate.trim(),
      });
      setShowAddObligation(false);
      setObligationDate('');
      setObligationType('SOAT');
      await loadObligations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al agregar obligacion';
      setObligationError(msg);
    } finally {
      setIsSavingObligation(false);
    }
  }

  async function handleRenewObligation() {
    if (!showRenewObligation) return;
    setObligationError(null);
    if (!obligationDate.trim()) {
      setObligationError('La nueva fecha de vencimiento es obligatoria');
      return;
    }
    if (!validateDate(obligationDate.trim())) {
      setObligationError('Formato invalido. Use AAAA-MM-DD');
      return;
    }

    setIsSavingObligation(true);
    try {
      await api.patch(`/vehicles/${id}/legal-obligations/${showRenewObligation.id}`, {
        expiryDate: obligationDate.trim(),
      });
      setShowRenewObligation(null);
      setObligationDate('');
      await loadObligations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al renovar obligacion';
      setObligationError(msg);
    } finally {
      setIsSavingObligation(false);
    }
  }

  function handleDeleteObligation(obligation: LegalObligation) {
    Alert.alert(
      'Eliminar obligacion',
      `Deseas eliminar la obligacion ${getObligationLabel(obligation.type)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/vehicles/${id}/legal-obligations/${obligation.id}`);
              await loadObligations();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Error al eliminar';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }

  // ─── Render ───────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  if (error || !vehicle) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Vehiculo no encontrado'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setIsLoading(true);
          loadAll().finally(() => setIsLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#1F3864"
            colors={['#1F3864']}
          />
        }
      >
        {/* ── Vehicle Header ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.plateSection}>
              <Ionicons name="car-sport" size={24} color="#1F3864" />
              <Text style={styles.headerPlate}>{vehicle.plate}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                vehicle.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  vehicle.status === 'ACTIVE' ? styles.statusActiveText : styles.statusInactiveText,
                ]}
              >
                {vehicle.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>

          <Text style={styles.headerBrandModel}>
            {vehicle.brand} {vehicle.model}
          </Text>
          <Text style={styles.headerDetails}>
            {vehicle.year}
            {vehicle.color ? ` - ${vehicle.color}` : ''}
          </Text>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                vehicle.status === 'ACTIVE' ? styles.actionDestructive : styles.actionPositive,
                isTogglingStatus && styles.actionDisabled,
              ]}
              onPress={handleToggleStatus}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={vehicle.status === 'ACTIVE' ? 'pause-circle' : 'play-circle'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.actionButtonText}>
                    {vehicle.status === 'ACTIVE' ? 'Inactivar' : 'Reactivar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tab Selector ── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Historial
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'obligations' && styles.tabActive]}
            onPress={() => setActiveTab('obligations')}
          >
            <Text style={[styles.tabText, activeTab === 'obligations' && styles.tabTextActive]}>
              Obligaciones legales
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <View style={styles.sectionContent}>
            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipContainer}
            >
              {HISTORY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.chip, historyFilter === t.key && styles.chipActive]}
                  onPress={() => handleHistoryFilterChange(t.key)}
                >
                  <Text style={[styles.chipText, historyFilter === t.key && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isLoadingHistory ? (
              <ActivityIndicator size="small" color="#1F3864" style={styles.sectionLoader} />
            ) : history.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="time-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptySectionText}>
                  Este vehiculo aun no tiene historial
                </Text>
              </View>
            ) : (
              <>
                {history.map((event, index) => (
                  <View key={event.id} style={styles.timelineItem}>
                    {/* Timeline line */}
                    {index < history.length - 1 && <View style={styles.timelineLine} />}
                    {/* Icon circle */}
                    <View style={styles.timelineIcon}>
                      <Ionicons name={getHistoryIcon(event.type)} size={16} color="#1F3864" />
                    </View>
                    {/* Content */}
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineType}>
                        {getHistoryTypeLabel(event.type)}
                      </Text>
                      <Text style={styles.timelineTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <View style={styles.timelineMeta}>
                        <Text style={styles.timelineDate}>{formatDate(event.date)}</Text>
                        <View style={styles.timelineStatusBadge}>
                          <Text style={styles.timelineStatusText}>{event.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Load more */}
                {historyPage < historyTotalPages && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={handleLoadMoreHistory}
                    disabled={isLoadingMoreHistory}
                  >
                    {isLoadingMoreHistory ? (
                      <ActivityIndicator size="small" color="#1F3864" />
                    ) : (
                      <Text style={styles.loadMoreText}>Cargar mas</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Obligations Tab ── */}
        {activeTab === 'obligations' && (
          <View style={styles.sectionContent}>
            {isLoadingObligations ? (
              <ActivityIndicator size="small" color="#1F3864" style={styles.sectionLoader} />
            ) : obligations.length === 0 ? (
              <View style={styles.emptySection}>
                <MaterialCommunityIcons name="shield-check-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptySectionText}>
                  No hay obligaciones legales registradas
                </Text>
              </View>
            ) : (
              obligations.map((obl) => {
                const status = getObligationStatus(obl.expiryDate);
                const statusConfig = getObligationStatusConfig(status);
                return (
                  <View key={obl.id} style={styles.obligationCard}>
                    <View style={styles.obligationHeader}>
                      <View style={styles.obligationInfo}>
                        <MaterialCommunityIcons
                          name={getObligationIcon(obl.type)}
                          size={24}
                          color="#1F3864"
                        />
                        <View style={styles.obligationTextGroup}>
                          <Text style={styles.obligationTitle}>
                            {getObligationLabel(obl.type)}
                          </Text>
                          <Text style={styles.obligationDate}>
                            Vence: {formatDate(obl.expiryDate)}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.obligationBadge, { backgroundColor: statusConfig.bg }]}>
                        <Text style={[styles.obligationBadgeText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.obligationActions}>
                      <TouchableOpacity
                        style={styles.obligationActionBtn}
                        onPress={() => {
                          setShowRenewObligation(obl);
                          setObligationDate('');
                          setObligationError(null);
                        }}
                      >
                        <Ionicons name="refresh" size={16} color="#1F3864" />
                        <Text style={styles.obligationActionText}>Renovar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.obligationActionBtn}
                        onPress={() => handleDeleteObligation(obl)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[styles.obligationActionText, { color: '#EF4444' }]}>
                          Eliminar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              style={styles.addObligationButton}
              onPress={() => {
                setShowAddObligation(true);
                setObligationDate('');
                setObligationType('SOAT');
                setObligationError(null);
              }}
            >
              <Ionicons name="add-circle" size={20} color="#FF6B35" />
              <Text style={styles.addObligationText}>Agregar obligacion</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Add Obligation Modal ── */}
      <Modal
        visible={showAddObligation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddObligation(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar obligacion legal</Text>

            {obligationError && (
              <Text style={styles.modalError}>{obligationError}</Text>
            )}

            {/* Type picker */}
            <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.typePickerRow}>
              {OBLIGATION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typePicker,
                    obligationType === t && styles.typePickerActive,
                  ]}
                  onPress={() => setObligationType(t)}
                >
                  <Text
                    style={[
                      styles.typePickerText,
                      obligationType === t && styles.typePickerTextActive,
                    ]}
                  >
                    {t === 'INSURANCE' ? 'Seguro' : t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Fecha de vencimiento</Text>
            <TextInput
              style={styles.modalInput}
              value={obligationDate}
              onChangeText={setObligationDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddObligation(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isSavingObligation && styles.actionDisabled]}
                onPress={handleAddObligation}
                disabled={isSavingObligation}
              >
                {isSavingObligation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Renew Obligation Modal ── */}
      <Modal
        visible={showRenewObligation !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenewObligation(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Renovar {showRenewObligation ? getObligationLabel(showRenewObligation.type) : ''}
            </Text>

            {obligationError && (
              <Text style={styles.modalError}>{obligationError}</Text>
            )}

            <Text style={styles.modalLabel}>Nueva fecha de vencimiento</Text>
            <TextInput
              style={styles.modalInput}
              value={obligationDate}
              onChangeText={setObligationDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRenewObligation(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isSavingObligation && styles.actionDisabled]}
                onPress={handleRenewObligation}
                disabled={isSavingObligation}
              >
                {isSavingObligation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Renovar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scrollContent: { paddingBottom: 32 },
  centered: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
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

  // Header card
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E6ED',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plateSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerPlate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F3864',
    letterSpacing: 1.5,
  },
  headerBrandModel: { fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 2 },
  headerDetails: { fontSize: 14, color: '#6B7280' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusActiveText: { color: '#16A34A' },
  statusInactiveText: { color: '#6B7280' },

  actionRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
  },
  actionDestructive: { backgroundColor: '#EF4444' },
  actionPositive: { backgroundColor: '#16A34A' },
  actionDisabled: { opacity: 0.5 },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#E2E6ED',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#1F3864', fontWeight: '600' },

  // Section content
  sectionContent: { margin: 16 },
  sectionLoader: { marginTop: 32 },

  // Chips
  chipScroll: { marginBottom: 16 },
  chipContainer: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E6ED',
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#1F3864' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  // Empty section
  emptySection: { alignItems: 'center', paddingVertical: 40 },
  emptySectionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 18,
    top: 38,
    bottom: -16,
    width: 2,
    backgroundColor: '#E2E6ED',
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineContent: { flex: 1 },
  timelineType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F3864',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timelineTitle: { fontSize: 14, color: '#111827', marginBottom: 4 },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDate: { fontSize: 12, color: '#6B7280' },
  timelineStatusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timelineStatusText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  // Load more
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  loadMoreText: { fontSize: 14, color: '#1F3864', fontWeight: '600' },

  // Obligation card
  obligationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E6ED',
  },
  obligationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  obligationInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  obligationTextGroup: { flex: 1 },
  obligationTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  obligationDate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  obligationBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  obligationBadgeText: { fontSize: 11, fontWeight: '600' },
  obligationActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 16,
  },
  obligationActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingVertical: 8,
  },
  obligationActionText: { fontSize: 13, fontWeight: '600', color: '#1F3864' },

  // Add obligation
  addObligationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 8,
    borderStyle: 'dashed',
    minHeight: 48,
  },
  addObligationText: { fontSize: 15, fontWeight: '600', color: '#FF6B35' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  modalInput: {
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E2E6ED',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 44,
  },
  modalError: { color: '#DC2626', fontSize: 13, marginBottom: 8, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E6ED',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Type picker
  typePickerRow: { flexDirection: 'row', gap: 8 },
  typePicker: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E6ED',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  typePickerActive: { borderColor: '#1F3864', backgroundColor: '#EFF6FF' },
  typePickerText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  typePickerTextActive: { color: '#1F3864', fontWeight: '600' },
});
