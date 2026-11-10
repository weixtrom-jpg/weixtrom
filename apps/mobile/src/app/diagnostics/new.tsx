import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';

// ---- Types ----

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface VehiclesResponse {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DiagnosticRequest {
  id: string;
  description: string;
  status: string;
}

interface FormErrors {
  vehicleId?: string;
  description?: string;
}

// ---- Component ----

export default function NewDiagnostic() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load user vehicles on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadVehicles() {
        setIsLoadingVehicles(true);
        setVehicleError(null);
        try {
          const res = await api.get<VehiclesResponse>('/vehicles?limit=100&status=ACTIVE');
          if (!cancelled) {
            setVehicles(res.data);
            if (res.data.length === 1) {
              setSelectedVehicleId(res.data[0].id);
            }
          }
        } catch (err) {
          if (!cancelled) {
            const msg = err instanceof Error ? err.message : 'Error al cargar vehiculos';
            setVehicleError(msg);
          }
        } finally {
          if (!cancelled) setIsLoadingVehicles(false);
        }
      }

      loadVehicles();
      return () => { cancelled = true; };
    }, []),
  );

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!selectedVehicleId) {
      newErrors.vehicleId = 'Selecciona un vehiculo';
    }

    const trimmed = description.trim();
    if (!trimmed) {
      newErrors.description = 'La descripcion es obligatoria';
    } else if (trimmed.length < 10) {
      newErrors.description = 'La descripcion debe tener al menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      await api.post<DiagnosticRequest>('/diagnostics', {
        vehicleId: selectedVehicleId,
        description: description.trim(),
      });

      Alert.alert(
        'Solicitud creada',
        'Tu solicitud de diagnostico ha sido enviada. Un taller la atendera pronto.',
        [{ text: 'OK', onPress: () => router.replace('/diagnostics') }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la solicitud';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {serverError && (
          <View style={styles.serverErrorContainer}>
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        )}

        {/* Vehicle selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Vehiculo <Text style={styles.required}>*</Text>
          </Text>

          {isLoadingVehicles ? (
            <ActivityIndicator size="small" color="#1F3864" style={styles.vehicleLoader} />
          ) : vehicleError ? (
            <View style={styles.vehicleErrorContainer}>
              <Text style={styles.vehicleErrorText}>{vehicleError}</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <View style={styles.vehicleEmptyContainer}>
              <Text style={styles.vehicleEmptyText}>
                No tienes vehiculos activos. Registra uno primero.
              </Text>
              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => router.push('/vehicle/register')}
              >
                <Text style={styles.registerLinkText}>Registrar vehiculo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.vehicleList}>
              {vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleOption,
                    selectedVehicleId === v.id && styles.vehicleOptionSelected,
                    errors.vehicleId && !selectedVehicleId && styles.vehicleOptionError,
                  ]}
                  onPress={() => {
                    setSelectedVehicleId(v.id);
                    if (errors.vehicleId) setErrors((prev) => ({ ...prev, vehicleId: undefined }));
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.vehicleOptionContent}>
                    <Text style={[
                      styles.vehicleOptionPlate,
                      selectedVehicleId === v.id && styles.vehicleOptionPlateSelected,
                    ]}>
                      {v.plate}
                    </Text>
                    <Text style={styles.vehicleOptionInfo}>
                      {v.brand} {v.model} ({v.year})
                    </Text>
                  </View>
                  {selectedVehicleId === v.id && (
                    <View style={styles.checkMark}>
                      <Text style={styles.checkMarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {errors.vehicleId && <Text style={styles.errorText}>{errors.vehicleId}</Text>}
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Descripcion del problema <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              errors.description && styles.inputError,
            ]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            placeholder="Describe el problema o sintoma que presenta tu vehiculo (min. 10 caracteres)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>
            {description.trim().length}/2000
          </Text>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, (isSubmitting || vehicles.length === 0) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || vehicles.length === 0}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Solicitar diagnostico</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 32 },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E6ED',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 44,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  charCount: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },

  serverErrorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  serverErrorText: { color: '#DC2626', fontSize: 14 },

  // Vehicle selection
  vehicleLoader: { marginVertical: 16 },
  vehicleErrorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
  },
  vehicleErrorText: { color: '#DC2626', fontSize: 13 },
  vehicleEmptyContainer: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  vehicleEmptyText: { color: '#92400E', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  registerLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  registerLinkText: { color: '#FF6B35', fontWeight: '600', fontSize: 14 },

  vehicleList: { gap: 8 },
  vehicleOption: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E6ED',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  vehicleOptionSelected: {
    borderColor: '#1F3864',
    backgroundColor: '#EFF6FF',
  },
  vehicleOptionError: {
    borderColor: '#EF4444',
  },
  vehicleOptionContent: { flex: 1 },
  vehicleOptionPlate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F3864',
    letterSpacing: 1,
  },
  vehicleOptionPlateSelected: {
    color: '#1F3864',
  },
  vehicleOptionInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1F3864',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkMarkText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Submit
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
