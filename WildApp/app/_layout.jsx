import { Stack } from 'expo-router';
import { AppProvider } from './contexts/AppContext';

export default function Layout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}