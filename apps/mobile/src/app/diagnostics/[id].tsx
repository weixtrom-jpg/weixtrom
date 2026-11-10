import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

// ---- Types ----

interface DiagnosticVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
}

interface Diagnosis {
  findings: string;
  recommendation: string;
}

interface DiagnosticDetail {
  id: string;
  description: string;
  status: 'PENDING' | 'TAKEN' | 'DIAGNOSED' | 'EXPIRED';
  vehicle: DiagnosticVehicle;
  diagnosis: Diagnosis | null;
  createdAt: string;
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
    month: 'long',
    day: 'numeric',
  });
}

// Timeline steps
const STEPS = [
  { key: 'PENDING', label: 'Solicitada' },
  { key: 'TAKEN', label: 'En atencion' },
  { key: 'DIAGNOSED', label: 'Diagnosticada' },
] as const;

function getStepIndex(status: string): number {
  switch (status) {
    case 'PENDING': return 0;
    case 'TAKEN': return 1;
    case 'DIAGNOSED': return 2;
    case 'EXPIRED': return -1; // special case
    default: return 0;
  }
}

// ---- Component ----

export default function DiagnosticDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [diagnostic, setDiagnostic] = useState<DiagnosticDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostic = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<DiagnosticDetail>(`/diagnostics/${id}`);
      setDiagnostic(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar la solicitud';
      setError(message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadDiagnostic().finally(() => setIsLoading(false));
    }, [loadDiagnostic]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDiagnostic();
    setIsRefreshing(false);
  }, [loadDiagnostic]);

  // ---- Render ----

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  if (error || !diagnostic) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Solicitud no encontrada'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setIsLoading(true);
          loadDiagnostic().finally(() => setIsLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = getStatusConfig(diagnostic.status);
  const currentStep = getStepIndex(diagnostic.status);
  const isExpired = diagnostic.status === 'EXPIRED';

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
      {/* Status badge */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(diagnostic.createdAt)}</Text>
      </View>

      {/* Vehicle card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="car-sport" size={20} color="#1F3864" />
          <Text style={styles.cardTitle}>Vehiculo</Text>
        </View>
        <Text style={styles.vehiclePlate}>{diagnostic.vehicle.plate}</Text>
        <Text style={styles.vehicleInfo}>
          {diagnostic.vehicle.brand} {diagnostic.vehicle.model} ({diagnostic.vehicle.year})
        </Text>
        {diagnostic.vehicle.color && (
          <Text style={styles.vehicleColor}>Color: {diagnostic.vehicle.color}</Text>
        )}
      </View>

      {/* Description */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="document-text-outline" size={20} color="#1F3864" />
          <Text style={styles.cardTitle}>Descripcion del problema</Text>
        </View>
        <Text style={styles.descriptionBody}>{diagnostic.description}</Text>
      </View>

      {/* Progress stepper */}
      {!isExpired && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="git-branch-outline" size={20} color="#1F3864" />
            <Text style={styles.cardTitle}>Progreso</Text>
          </View>
          <View style={styles.stepper}>
            {STEPS.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepIndicatorColumn}>
                    <View
                      style={[
                        styles.stepDot,
                        isCompleted && styles.stepDotCompleted,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      {isCompleted && (
                        <Text style={styles.stepDotCheck}>✓</Text>
                      )}
                    </View>
                    {index < STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          index < currentStep && styles.stepLineCompleted,
                        ]}
                      />
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Expired message */}
      {isExpired && (
        <View style={[styles.card, styles.expiredCard]}>
          <Ionicons name="time-outline" size={24} color="#6B7280" />
          <Text style={styles.expiredText}>
            Esta solicitud ha expirado. Puedes crear una nueva solicitud de diagnostico.
          </Text>
        </View>
      )}

      {/* Status message */}
      {diagnostic.status === 'PENDING' && (
        <View style={[styles.card, styles.infoCard]}>
          <Ionicons name="hourglass-outline" size={24} color="#1D4ED8" />
          <Text style={styles.infoText}>
            Esperando que un taller tome tu solicitud...
          </Text>
        </View>
      )}

      {diagnostic.status === 'TAKEN' && (
        <View style={[styles.card, styles.warningCard]}>
          <Ionicons name="construct-outline" size={24} color="#D97706" />
          <Text style={styles.warningText}>
            Un taller esta revisando tu vehiculo
          </Text>
        </View>
      )}

      {/* Diagnosis result */}
      {diagnostic.status === 'DIAGNOSED' && diagnostic.diagnosis && (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            <Text style={[styles.cardTitle, { color: '#16A34A' }]}>Resultado del diagnostico</Text>
          </View>

          <Text style={styles.diagnosisLabel}>Hallazgos</Text>
          <Text style={styles.diagnosisBody}>{diagnostic.diagnosis.findings}</Text>

          <Text style={[styles.diagnosisLabel, { marginTop: 16 }]}>Recomendacion</Text>
          <Text style={styles.diagnosisBody}>{diagnostic.diagnosis.recommendation}</Text>
        </View>
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
  vehicleColor: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Description
  descriptionBody: { fontSize: 15, color: '#374151', lineHeight: 22 },

  // Stepper
  stepper: { paddingLeft: 4 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicatorColumn: {
    alignItems: 'center',
    width: 28,
    marginRight: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  stepDotCurrent: {
    borderColor: '#1F3864',
    backgroundColor: '#1F3864',
  },
  stepDotCheck: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepLine: {
    width: 2,
    height: 28,
    backgroundColor: '#D1D5DB',
  },
  stepLineCompleted: {
    backgroundColor: '#16A34A',
  },
  stepLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingTop: 2,
    paddingBottom: 28,
  },
  stepLabelCompleted: { color: '#374151' },
  stepLabelCurrent: { color: '#1F3864', fontWeight: '600' },

  // Info/Warning/Success cards
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: { fontSize: 14, color: '#1D4ED8', flex: 1, lineHeight: 20 },

  warningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningText: { fontSize: 14, color: '#92400E', flex: 1, lineHeight: 20 },

  expiredCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expiredText: { fontSize: 14, color: '#6B7280', flex: 1, lineHeight: 20 },

  successCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  diagnosisLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagnosisBody: { fontSize: 15, color: '#374151', lineHeight: 22 },
});
