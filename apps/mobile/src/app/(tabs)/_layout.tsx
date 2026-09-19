import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#6B7280',
        headerStyle: { backgroundColor: '#1F3864' },
        headerTintColor: '#fff',
        tabBarStyle: { minHeight: 56, paddingBottom: 8, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Vehiculos' }} />
      <Tabs.Screen name="services" options={{ title: 'Servicios' }} />
      <Tabs.Screen name="invoices" options={{ title: 'Facturas' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
