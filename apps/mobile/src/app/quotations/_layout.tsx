import { Stack } from 'expo-router';

export default function QuotationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1F3864' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis cotizaciones' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle cotizacion' }} />
    </Stack>
  );
}
