import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Linking } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle deep linking for password reset
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      if (url.includes('reset-password')) {
        // Extract the query parameters
        const params = new URLSearchParams(url.split('?')[1]);
        const userId = params.get('userId');
        const secret = params.get('secret');
        
        if (userId && secret) {
          // Navigate to reset password screen with parameters
          router.push({
            pathname: '/login',
            params: { 
              resetPassword: 'true',
              userId,
              secret 
            }
          });
        }
      }
    };

    // Add event listener for deep linking
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was launched from a deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Add more screens as needed */}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}//_layout.tsx