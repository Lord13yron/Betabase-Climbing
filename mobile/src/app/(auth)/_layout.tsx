import { Stack } from 'expo-router';

// Land on login first; signup/forgot-password are reached via links.
export const unstable_settings = {
  initialRouteName: 'login',
};

// Email-only auth screens (Google OAuth arrives in S2). Headerless; each screen
// renders its own AuthShell header.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
