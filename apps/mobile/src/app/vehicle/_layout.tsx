import { Stack } from 'expo-router';

export default function VehicleLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1F3864' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="register" options={{ title: 'Registrar vehiculo' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del vehiculo' }} />
    </Stack>
  );
}
