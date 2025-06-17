import { Stack } from 'expo-router';
import { AppProvider } from './contexts/AppContext';

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
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}