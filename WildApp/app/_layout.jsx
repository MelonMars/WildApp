import { Stack } from 'expo-router';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';

const originalConsoleError = console.error;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Encountered two children with the same key')
  ) {
    return;
  }
  originalConsoleError(...args);
};

export default function Layout() {
  return (
    <AuthProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProvider>
    </AuthProvider>
  );
}