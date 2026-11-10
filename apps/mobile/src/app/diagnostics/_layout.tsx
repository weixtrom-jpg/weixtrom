import { Stack } from 'expo-router';

export default function DiagnosticsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1F3864' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis solicitudes' }} />
      <Stack.Screen name="new" options={{ title: 'Solicitar diagnostico' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle de solicitud' }} />
    </Stack>
  );
}
