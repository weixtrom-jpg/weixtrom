import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  status: string;
}

// Colombian plate pattern: 3 letters + 2 digits + 1 letter or digit (e.g., ABC12D or ABC123)
const PLATE_REGEX = /^[A-Z]{3}\d{2}[A-Z0-9]$/;

const currentYear = new Date().getFullYear();

interface FormErrors {
  plate?: string;
  brand?: string;
  model?: string;
  year?: string;
}

export default function RegisterVehicle() {
  const router = useRouter();

  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    const cleanPlate = plate.trim().toUpperCase();
    if (!cleanPlate) {
      newErrors.plate = 'La placa es obligatoria';
    } else if (!PLATE_REGEX.test(cleanPlate)) {
      newErrors.plate = 'Formato invalido. Ej: ABC12D o ABC123';
    }

    if (!brand.trim()) {
      newErrors.brand = 'La marca es obligatoria';
    }

    if (!model.trim()) {
      newErrors.model = 'El modelo es obligatorio';
    }

    const yearNum = parseInt(year, 10);
    if (!year.trim()) {
      newErrors.year = 'El ano es obligatorio';
    } else if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
      newErrors.year = `Ingrese un ano entre 1900 y ${currentYear + 1}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      await api.post<Vehicle>('/vehicles', {
        plate: plate.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        color: color.trim() || undefined,
      });

      Alert.alert('Vehiculo registrado', 'Tu vehiculo ha sido registrado exitosamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar vehiculo';
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

        {/* Placa */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Placa <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.plate && styles.inputError]}
            value={plate}
            onChangeText={(text) => {
              setPlate(text.toUpperCase());
              if (errors.plate) setErrors((prev) => ({ ...prev, plate: undefined }));
            }}
            placeholder="ABC12D"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            maxLength={6}
          />
          {errors.plate && <Text style={styles.errorText}>{errors.plate}</Text>}
        </View>

        {/* Marca */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Marca <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.brand && styles.inputError]}
            value={brand}
            onChangeText={(text) => {
              setBrand(text);
              if (errors.brand) setErrors((prev) => ({ ...prev, brand: undefined }));
            }}
            placeholder="Ej: Chevrolet"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
          {errors.brand && <Text style={styles.errorText}>{errors.brand}</Text>}
        </View>

        {/* Modelo */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Modelo <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.model && styles.inputError]}
            value={model}
            onChangeText={(text) => {
              setModel(text);
              if (errors.model) setErrors((prev) => ({ ...prev, model: undefined }));
            }}
            placeholder="Ej: Spark GT"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
          {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
        </View>

        {/* Ano */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Ano <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.year && styles.inputError]}
            value={year}
            onChangeText={(text) => {
              setYear(text.replace(/[^0-9]/g, ''));
              if (errors.year) setErrors((prev) => ({ ...prev, year: undefined }));
            }}
            placeholder={`Ej: ${currentYear}`}
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={4}
          />
          {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
        </View>

        {/* Color (opcional) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Color (opcional)</Text>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="Ej: Rojo"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Registrar vehiculo</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },

  serverErrorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  serverErrorText: { color: '#DC2626', fontSize: 14 },

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
