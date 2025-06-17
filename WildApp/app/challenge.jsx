import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const ChallengePage = () => {
    const [pulseAnim] = useState(new Animated.Value(1));
    const [shakeAnim] = useState(new Animated.Value(0));
    const { challenge, category } = useLocalSearchParams();
    const router = useRouter();

    useEffect(() => {
        const backAction = () => {
            return true;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        
        return () => backHandler.remove();
    }, [router]);

    useEffect(() => {
        const pulse = Animated.loop(
        Animated.sequence([
            Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
            }),
        ])
        );
        pulse.start();
    }, []);

    const handleCowardPress = () => {
        Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
        router.push(
            { pathname: 'coward', params: { challenge, category } }
        )
        }, 1000);
    };

    const handleCompletePress = () => {
        router.push({
            pathname: 'postchallenge',
            params: { 
            challenge, 
            category,
            completedAt: new Date().toISOString()
            }
        });
    };

    return (
        <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        
        <LinearGradient
            colors={['#2a2a2a', '#1a1a1a', '#0f0f0f']}
            style={styles.background}
        />
        
        <View style={styles.grungeOverlay} />
        
        <View style={styles.header}>
            <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
            <View style={styles.headerLine} />
        </View>

        <View style={styles.challengeContainer}>
            <Animated.View 
            style={[
                styles.challengeBox,
                { transform: [{ scale: pulseAnim }] }
            ]}
            >
            <Text style={styles.challengeTitle}>YOUR MISSION:</Text>
            <Text style={styles.challengeText}>{challenge}</Text>
            </Animated.View>

            <Text style={styles.warningText}>
            NO BACKING OUT NOW.{'\n'}
            DO IT OR FACE THE SHAME.
            </Text>
        </View>

        <View style={styles.buttonContainer}>
            <TouchableOpacity 
            style={styles.completeButton}
            onPress={handleCompletePress}
            activeOpacity={0.8}
            >
            <Text style={styles.completeButtonText}>I DID IT</Text>
            <View style={styles.buttonDistress} />
            </TouchableOpacity>

            <Animated.View 
            style={[
                styles.cowardButtonContainer,
                { transform: [{ translateX: shakeAnim }] }
            ]}
            >
            <TouchableOpacity 
                style={styles.cowardButton}
                onPress={handleCowardPress}
                activeOpacity={0.7}
            >
                <Text style={styles.cowardButtonText}>I'M A COWARD</Text>
                <View style={styles.cowardDistress} />
            </TouchableOpacity>
            </Animated.View>
        </View>

        <View style={styles.bottomGrunge} />
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grungeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    opacity: 0.7,
  },
  header: {
    marginTop: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ff6b35',
    letterSpacing: 3,
    fontFamily: 'System',
  },
  headerLine: {
    width: 100,
    height: 3,
    backgroundColor: '#ff6b35',
    marginTop: 10,
    transform: [{ rotate: '-1deg' }],
  },
  challengeContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  challengeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#333',
    transform: [{ rotate: '-0.5deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 8,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 2,
  },
  challengeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    lineHeight: 30,
    fontFamily: 'System',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ff6b35',
    textAlign: 'center',
    marginTop: 40,
    letterSpacing: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    gap: 20,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderWidth: 3,
    borderColor: '#2E7D32',
    transform: [{ rotate: '0.5deg' }],
    position: 'relative',
  },
  completeButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  buttonDistress: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    backgroundColor: '#ff6b35',
    transform: [{ rotate: '45deg' }],
  },
  cowardButtonContainer: {
    alignSelf: 'center',
  },
  cowardButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 2,
    borderColor: '#333',
    transform: [{ rotate: '-0.5deg' }],
    position: 'relative',
  },
  cowardButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ccc',
    textAlign: 'center',
    letterSpacing: 1,
  },
  cowardDistress: {
    position: 'absolute',
    bottom: -1,
    left: 5,
    width: 20,
    height: 2,
    backgroundColor: '#333',
  },
  bottomGrunge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#ff6b35',
    opacity: 0.3,
    transform: [{ skewY: '-1deg' }],
  },
});

export default ChallengePage;