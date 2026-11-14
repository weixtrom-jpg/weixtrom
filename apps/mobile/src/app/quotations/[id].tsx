import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

// ---- Types ----

interface QuotationVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
}

interface QuotationLineItem {
  id: string;
  type: 'SERVICE' | 'PART';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuotationDetail {
  id: string;
  description: string;
  notes: string | null;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  vehicle: QuotationVehicle;
  items: QuotationLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

// ---- Helpers ----

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Borrador', bg: '#F3F4F6', color: '#6B7280' },
  SENT: { label: 'Recibida', bg: '#DBEAFE', color: '#1D4ED8' },
  APPROVED: { label: 'Aprobada', bg: '#DCFCE7', color: '#16A34A' },
  REJECTED: { label: 'Rechazada', bg: '#FEE2E2', color: '#DC2626' },
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  SERVICE: { label: 'Servicio', bg: '#EDE9FE', color: '#7C3AED' },
  PART: { label: 'Repuesto', bg: '#FEF3C7', color: '#D97706' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.SERVICE;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

// ---- Component ----

export default function QuotationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [comment, setComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  const loadQuotation = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<QuotationDetail>(`/quotations/${id}`);
      setQuotation(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar la cotizacion';
      setError(message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadQuotation().finally(() => setIsLoading(false));
    }, [loadQuotation]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadQuotation();
    setIsRefreshing(false);
  }, [loadQuotation]);

  const handleApprove = useCallback(() => {
    Alert.alert(
      'Aprobar cotizacion',
      'Al aprobar se generara una orden de trabajo. Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'default',
          onPress: async () => {
            setIsApproving(true);
            try {
              await api.patch(`/quotations/${id}/approve`);
              Alert.alert('Cotizacion aprobada', 'Se ha generado una orden de trabajo.');
              await loadQuotation();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Error al aprobar';
              Alert.alert('Error', message);
            } finally {
              setIsApproving(false);
            }
          },
        },
      ],
    );
  }, [id, loadQuotation]);

  const handleReject = useCallback(async () => {
    setIsRejecting(true);
    try {
      await api.patch(`/quotations/${id}/reject`, { rejectionReason: rejectionReason || undefined });
      Alert.alert('Cotizacion rechazada', 'El taller sera notificado.');
      setShowRejectInput(false);
      setRejectionReason('');
      await loadQuotation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al rechazar';
      Alert.alert('Error', message);
    } finally {
      setIsRejecting(false);
    }
  }, [id, rejectionReason, loadQuotation]);

  const handleSendComment = useCallback(async () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    setIsSendingComment(true);
    try {
      await api.post(`/quotations/${id}/comment`, { comment: trimmed });
      setComment('');
      await loadQuotation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar comentario';
      Alert.alert('Error', message);
    } finally {
      setIsSendingComment(false);
    }
  }, [id, comment, loadQuotation]);

  // ---- Render ----

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  if (error || !quotation) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Cotizacion no encontrada'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setIsLoading(true);
          loadQuotation().finally(() => setIsLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = getStatusConfig(quotation.status);
  const isSent = quotation.status === 'SENT';

  return (
    <ScrollView
      style={styles.container}
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
      {/* Status badge + date */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(quotation.createdAt)}</Text>
      </View>

      {/* Vehicle card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="car-sport" size={20} color="#1F3864" />
          <Text style={styles.cardTitle}>Vehiculo</Text>
        </View>
        <Text style={styles.vehiclePlate}>{quotation.vehicle.plate}</Text>
        <Text style={styles.vehicleInfo}>
          {quotation.vehicle.brand} {quotation.vehicle.model} ({quotation.vehicle.year})
        </Text>
      </View>

      {/* Description / notes */}
      {(quotation.description || quotation.notes) && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="document-text-outline" size={20} color="#1F3864" />
            <Text style={styles.cardTitle}>Descripcion</Text>
          </View>
          {quotation.description ? (
            <Text style={styles.descriptionBody}>{quotation.description}</Text>
          ) : null}
          {quotation.notes ? (
            <Text style={[styles.descriptionBody, { marginTop: quotation.description ? 8 : 0 }]}>
              {quotation.notes}
            </Text>
          ) : null}
        </View>
      )}

      {/* Items table */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="list-outline" size={20} color="#1F3864" />
          <Text style={styles.cardTitle}>Items ({quotation.items.length})</Text>
        </View>
        {quotation.items.map((item) => {
          const typeCfg = getTypeConfig(item.type);
          return (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <View style={[styles.typeBadge, { backgroundColor: typeCfg.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: typeCfg.color }]}>
                    {typeCfg.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <View style={styles.itemCalc}>
                <Text style={styles.itemCalcText}>
                  {item.quantity} x {formatCOP.format(item.unitPrice)}
                </Text>
                <Text style={styles.itemTotal}>{formatCOP.format(item.total)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Financial summary */}
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCOP.format(quotation.subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>IVA (19%)</Text>
          <Text style={styles.summaryValue}>{formatCOP.format(quotation.tax)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCOP.format(quotation.total)}</Text>
        </View>
      </View>

      {/* Approved message */}
      {quotation.status === 'APPROVED' && (
        <View style={[styles.card, styles.successCard]}>
          <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
          <Text style={styles.successText}>
            Cotizacion aprobada. Se genero una orden de trabajo.
          </Text>
        </View>
      )}

      {/* Rejected message */}
      {quotation.status === 'REJECTED' && (
        <View style={[styles.card, styles.rejectedCard]}>
          <Ionicons name="close-circle" size={24} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.rejectedText}>Cotizacion rechazada</Text>
            {quotation.rejectionReason ? (
              <Text style={styles.rejectionReason}>
                Motivo: {quotation.rejectionReason}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Actions (only when SENT) */}
      {isSent && (
        <>
          {/* Comment */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="chatbubble-outline" size={20} color="#1F3864" />
              <Text style={styles.cardTitle}>Comentario</Text>
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Escribe un comentario..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
              editable={!isSendingComment}
            />
            <TouchableOpacity
              style={[styles.commentButton, (!comment.trim() || isSendingComment) && styles.buttonDisabled]}
              disabled={!comment.trim() || isSendingComment}
              onPress={handleSendComment}
            >
              {isSendingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.commentButtonText}>Enviar comentario</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Approve / Reject buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.approveButton, isApproving && styles.buttonDisabled]}
              disabled={isApproving || isRejecting}
              onPress={handleApprove}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.approveButtonText}>Aprobar cotizacion</Text>
                </>
              )}
            </TouchableOpacity>

            {!showRejectInput ? (
              <TouchableOpacity
                style={[styles.rejectButton, isRejecting && styles.buttonDisabled]}
                disabled={isApproving || isRejecting}
                onPress={() => setShowRejectInput(true)}
              >
                <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                <Text style={styles.rejectButtonText}>Rechazar</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.rejectInputContainer}>
                <TextInput
                  style={styles.rejectInput}
                  placeholder="Motivo del rechazo (opcional)"
                  placeholderTextColor="#9CA3AF"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  editable={!isRejecting}
                />
                <View style={styles.rejectActions}>
                  <TouchableOpacity
                    style={styles.rejectCancelButton}
                    onPress={() => {
                      setShowRejectInput(false);
                      setRejectionReason('');
                    }}
                    disabled={isRejecting}
                  >
                    <Text style={styles.rejectCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectConfirmButton, isRejecting && styles.buttonDisabled]}
                    disabled={isRejecting}
                    onPress={handleReject}
                  >
                    {isRejecting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.rejectConfirmText}>Confirmar rechazo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scrollContent: { padding: 16, paddingBottom: 32 },
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

  // Status row
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 13, color: '#6B7280' },

  // Card
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },

  // Vehicle
  vehiclePlate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F3864',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  vehicleInfo: { fontSize: 15, fontWeight: '500', color: '#111827' },

  // Description
  descriptionBody: { fontSize: 15, color: '#374151', lineHeight: 22 },

  // Items
  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  itemDescription: { fontSize: 14, color: '#374151', marginBottom: 4 },
  itemCalc: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCalcText: { fontSize: 13, color: '#6B7280' },
  itemTotal: { fontSize: 14, fontWeight: '600', color: '#111827' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, color: '#374151' },
  divider: {
    height: 1,
    backgroundColor: '#E2E6ED',
    marginVertical: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#1F3864' },

  // Status cards
  successCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successText: { fontSize: 14, color: '#16A34A', flex: 1, lineHeight: 20 },

  rejectedCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rejectedText: { fontSize: 14, fontWeight: '600', color: '#DC2626', lineHeight: 20 },
  rejectionReason: { fontSize: 13, color: '#7F1D1D', marginTop: 4, lineHeight: 20 },

  // Comment
  commentInput: {
    borderWidth: 1,
    borderColor: '#E2E6ED',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  commentButton: {
    backgroundColor: '#1F3864',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  commentButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Action buttons
  actionButtons: { marginBottom: 16 },
  approveButton: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginBottom: 10,
  },
  approveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  rejectButton: {
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: '#fff',
  },
  rejectButtonText: { color: '#DC2626', fontWeight: '700', fontSize: 16 },

  // Reject input
  rejectInputContainer: {
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#E2E6ED',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  rejectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rejectCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  rejectCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  rejectConfirmButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  rejectConfirmText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  buttonDisabled: { opacity: 0.6 },
});
