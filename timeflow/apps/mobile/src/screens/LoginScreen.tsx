/**
 * Login Screen
 *
 * Handles Google OAuth authentication for mobile using expo-auth-session.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexts/AuthContext';

// Ensure browser session completes properly
WebBrowser.maybeCompleteAuthSession();

// Backend URL - update for production
const BACKEND_URL = __DEV__
  ? 'http://localhost:3001'
  : 'https://your-production-backend.com';

// Custom redirect scheme for mobile OAuth
const redirectScheme = 'timeflow';
const redirectUri = AuthSession.makeRedirectUri({
  scheme: redirectScheme,
  path: 'auth/callback',
});

export function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Start OAuth flow by redirecting to backend
      const authUrl = `${BACKEND_URL}/api/auth/google/start?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      // Use AuthSession for better OAuth handling
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: redirectUri,
      });

      if (result.type === 'success') {
        // Extract token from redirect URL
        const url = result.url || '';
        const tokenMatch = url.match(/token=([^&]+)/);

        if (tokenMatch && tokenMatch[1]) {
          const token = decodeURIComponent(tokenMatch[1]);
          await login(token);
        } else {
          // Fallback: try to get token from backend callback
          // The backend should redirect to our redirectUri with token
          throw new Error('No token received from authentication');
        }
      } else if (result.type === 'cancel') {
        // User canceled the authentication
        console.log('User canceled authentication');
      } else {
        throw new Error(`Authentication failed: ${result.type}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Failed to authenticate with Google'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Branding */}
        <View style={styles.header}>
          <Text style={styles.logo}>TimeFlow</Text>
          <Text style={styles.tagline}>Smart Task Scheduling</Text>
        </View>

        {/* Description */}
        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            Automatically schedule your tasks into your calendar based on priorities and availability.
          </Text>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.loginButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>
          By signing in, you agree to sync your tasks with Google Calendar
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  description: {
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 280,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginRight: 12,
    backgroundColor: '#fff',
    color: '#3b82f6',
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
    borderRadius: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 32,
  },
});
