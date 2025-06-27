import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from './config/supabase';

import { common_styles, colors, typography, shadows } from './styles';

export default function AuthPage() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [flipAnim] = useState(new Animated.Value(0));

  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
        
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        Alert.alert(
          'Check Your Email!',
          'We sent you a confirmation link. Please check your email to complete registration.',
          [{ text: 'OK', onPress: () => setIsLogin(true) }]
        );
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Auth error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        'Authentication Error',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
    
  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.timing(flipAnim, {
      toValue: flipAnim._value === 0 ? 2 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', confirmPassword: '' });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const flipRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <KeyboardAvoidingView 
      style={common_styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
      <LinearGradient
        colors={[colors.lightBrown, colors.mediumBrown, colors.darkBrown]}
        style={common_styles.backgroundTexture}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={common_styles.headerTitle}>COURAGE CLUB</Text>
            <Text style={common_styles.headerSubtitle}>
              {isLogin ? 'WELCOME BACK' : 'JOIN THE BRAVE'}
            </Text>
          </View>

          <Animated.View 
            style={[
              styles.authPolaroid,
              common_styles.polaroidLarge,
              {
                transform: [{ rotateX: flipRotation }]
              }
            ]}
          >
            <View style={styles.polaroidContent}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {isLogin ? 'SIGN IN' : 'SIGN UP'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {isLogin ? 'Ready for your next challenge?' : 'Start your journey of courage'}
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.email && styles.inputError
                    ]}
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.dustyBrown}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.password && styles.inputError
                    ]}
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    placeholder="••••••••"
                    placeholderTextColor={colors.dustyBrown}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.confirmPassword && styles.inputError
                      ]}
                      value={formData.confirmPassword}
                      onChangeText={(text) => handleInputChange('confirmPassword', text)}
                      placeholder="••••••••"
                      placeholderTextColor={colors.dustyBrown}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    loading && styles.submitButtonDisabled
                  ]}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.polaroidWhite} size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>
                        {isLogin ? 'SIGN IN' : 'SIGN UP'}
                      </Text>
                      <Text style={styles.submitButtonIcon}>
                        {isLogin ? '🔓' : '✨'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={toggleMode}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleText}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <Text style={styles.toggleTextBold}>
                      {isLogin ? 'SIGN UP' : 'SIGN IN'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[
              common_styles.tapeHorizontal,
              common_styles.tapeTopLeft,
              { transform: [{ rotate: '-3deg' }] }
            ]} />
            <View style={[
              common_styles.tapeHorizontal,
              common_styles.tapeBottomRight,
              { transform: [{ rotate: '2deg' }] }
            ]} />
          </Animated.View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.back();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← BACK TO CHALLENGES</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  authPolaroid: {
    width: '100%',
    maxWidth: 400,
    minHeight: 450,
    marginBottom: 30,
    transform: [{ rotate: '1deg' }],
  },
  polaroidContent: {
    flex: 1,
    padding: 20,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  formTitle: {
    ...typography.headerLarge,
    color: colors.darkBrown,
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 8,
  },
  formSubtitle: {
    ...typography.bodyMedium,
    color: colors.dustyBrown,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...typography.stamp,
    color: colors.darkBrown,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    ...typography.bodyMedium,
    backgroundColor: colors.polaroidWhite,
    borderWidth: 2,
    borderColor: colors.lightBrown,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.darkBrown,
    ...shadows.lightShadow,
  },
  inputError: {
    borderColor: colors.vintageRed,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.vintageRed,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.forestGreen,
    borderWidth: 2,
    borderColor: colors.oliveGreen,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...shadows.mediumShadow,
  },
  submitButtonDisabled: {
    backgroundColor: colors.dustyBrown,
    borderColor: colors.lightBrown,
  },
  submitButtonText: {
    ...typography.stamp,
    color: colors.polaroidWhite,
    fontSize: 14,
    letterSpacing: 1.5,
    marginRight: 8,
  },
  submitButtonIcon: {
    fontSize: 16,
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.dustyBrown,
    fontSize: 12,
    textAlign: 'center',
  },
  toggleTextBold: {
    ...typography.stamp,
    color: colors.forestGreen,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.lightBrown,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
  },
  backButtonText: {
    ...typography.stamp,
    color: colors.lightBrown,
    fontSize: 10,
    letterSpacing: 1,
  },
});