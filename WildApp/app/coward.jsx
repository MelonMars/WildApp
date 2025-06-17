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
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const CowardPage = () => {
  const [shakeAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0));
  const [glitchAnim] = useState(new Animated.Value(0));
  const [timeLeft, setTimeLeft] = useState(10);
  
  const { challenge, category } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    Vibration.vibrate([0, 100, 50, 100]);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 3,
      useNativeDriver: true,
    }).start();

    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 3, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    );
    shakeLoop.start();

    const glitchLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glitchAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    );
    glitchLoop.start();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleRedemption = () => {
    if (timeLeft > 0) {
      Vibration.vibrate(50);
      return;
    }
    
    router.push(
        { pathname: '/', params: { redemption: true } }
    );
  };

  const getShameMessage = () => {
    const messages = [
      "COWARD DETECTED",
      "SHAME ACTIVATED",
      "COURAGE.EXE NOT FOUND",
      "FEAR LEVEL: MAXIMUM",
      "ADVENTURE DENIED"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <LinearGradient
        colors={['#330000', '#000000', '#1a0000']}
        style={styles.background}
      />
      
      <View style={styles.grungeOverlay1} />
      <View style={styles.grungeOverlay2} />
      
      <Animated.View style={[styles.glitchBar1, { transform: [{ translateX: glitchAnim }] }]} />
      <Animated.View style={[styles.glitchBar2, { transform: [{ translateX: glitchAnim }] }]} />
      
      <Animated.View 
        style={[
          styles.mainContent,
          { 
            transform: [
              { scale: scaleAnim },
              { translateX: shakeAnim }
            ] 
          }
        ]}
      >
        <Text style={styles.shameTitle}>COWARD</Text>
        <View style={styles.titleDistress} />
        
        <Text style={styles.shameSubtitle}>{getShameMessage()}</Text>
        
        {challenge && (
          <View style={styles.failedChallengeBox}>
            <Text style={styles.failedLabel}>YOU FAILED:</Text>
            <Text style={styles.failedChallenge}>{challenge}</Text>
            <View style={styles.failedStamp}>
              <Text style={styles.stampText}>FAILED</Text>
            </View>
          </View>
        )}
        
        <View style={styles.shameStats}>
          <Text style={styles.statText}>COURAGE LEVEL: 0%</Text>
          <Text style={styles.statText}>ADVENTURES AVOIDED: +1</Text>
          <Text style={styles.statText}>REGRET LEVEL: MAXIMUM</Text>
        </View>
        
        <Text style={styles.brutalMotivation}>
          YOUR FRIENDS ARE OUT THERE{'\n'}
          LIVING THEIR BEST LIVES{'\n'}
          WHILE YOU'RE HERE{'\n'}
          BEING A COWARD
        </Text>
      </Animated.View>
      
      <View style={styles.bottomSection}>
        {timeLeft > 0 ? (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>
              FACING YOUR SHAME FOR {timeLeft} MORE SECONDS
            </Text>
            <View style={styles.countdownBar}>
              <View 
                style={[
                  styles.countdownProgress, 
                  { width: `${((10 - timeLeft) / 10) * 100}%` }
                ]} 
              />
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.redemptionButton}
            onPress={handleRedemption}
            activeOpacity={0.8}
          >
            <Text style={styles.redemptionText}>SEEK REDEMPTION</Text>
            <Text style={styles.redemptionSubtext}>(try not to be a coward next time)</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.cornerDistress1} />
      <View style={styles.cornerDistress2} />
      <View style={styles.cornerDistress3} />
      <View style={styles.cornerDistress4} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grungeOverlay1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    opacity: 0.3,
  },
  grungeOverlay2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  glitchBar1: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ff0000',
    opacity: 0.8,
  },
  glitchBar2: {
    position: 'absolute',
    top: 350,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#990000',
    opacity: 0.6,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  shameTitle: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ff0000',
    textAlign: 'center',
    letterSpacing: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    transform: [{ rotate: '-2deg' }],
  },
  titleDistress: {
    width: 200,
    height: 8,
    backgroundColor: '#ff0000',
    marginTop: -10,
    transform: [{ rotate: '1deg' }],
    opacity: 0.7,
  },
  shameSubtitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ff6666',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 3,
  },
  failedChallengeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#ff0000',
    padding: 20,
    marginTop: 40,
    marginHorizontal: 20,
    transform: [{ rotate: '-1deg' }],
    position: 'relative',
  },
  failedLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ff6666',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 2,
  },
  failedChallenge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  failedStamp: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#ff0000',
    paddingHorizontal: 15,
    paddingVertical: 5,
    transform: [{ rotate: '15deg' }],
    borderWidth: 2,
    borderColor: '#990000',
  },
  stampText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  shameStats: {
    marginTop: 40,
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6666',
    letterSpacing: 1,
  },
  brutalMotivation: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ff3333',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 24,
    letterSpacing: 1,
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    gap: 15,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6666',
    textAlign: 'center',
    letterSpacing: 1,
  },
  countdownBar: {
    width: 200,
    height: 4,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  countdownProgress: {
    height: '100%',
    backgroundColor: '#ff0000',
  },
  redemptionButton: {
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderWidth: 2,
    borderColor: '#666',
    transform: [{ rotate: '0.5deg' }],
  },
  redemptionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ccc',
    textAlign: 'center',
    letterSpacing: 2,
  },
  redemptionSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    letterSpacing: 1,
  },
  cornerDistress1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    backgroundColor: '#ff0000',
    opacity: 0.3,
    transform: [{ rotate: '45deg' }],
  },
  cornerDistress2: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    backgroundColor: '#990000',
    opacity: 0.5,
  },
  cornerDistress3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    backgroundColor: '#660000',
    opacity: 0.4,
    transform: [{ rotate: '25deg' }],
  },
  cornerDistress4: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 60,
    height: 20,
    backgroundColor: '#ff0000',
    opacity: 0.2,
    transform: [{ skewX: '30deg' }],
  },
});

export default CowardPage;