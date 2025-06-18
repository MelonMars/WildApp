import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  BackHandler,
  Vibration,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { common_styles, colors, typography } from './styles';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const CowardPage = () => {
  const [shakeAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0));
  const [dustAnim] = useState(new Animated.Value(0));
  const [timeLeft, setTimeLeft] = useState(10);
  
  const { challenge, category } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    Vibration.vibrate([0, 100, 50, 100]);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 40,
      friction: 5,
      useNativeDriver: true,
    }).start();

    const shameShake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 2, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -2, duration: 150, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    );
    shameShake.start();

    const dustFloat = Animated.loop(
      Animated.sequence([
        Animated.timing(dustAnim, { toValue: 8, duration: 4000, useNativeDriver: true }),
        Animated.timing(dustAnim, { toValue: -8, duration: 4000, useNativeDriver: true }),
      ])
    );
    dustFloat.start();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleRedemption = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      "WILDERNESS AVOIDED",
      "ADVENTURE ABANDONED",
      "NATURE CALLS... NO ANSWER",
      "TRAIL NOT TAKEN",
      "EXPLORER STATUS: REVOKED"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
        
        <View style={common_styles.backgroundTexture} />
        <View style={styles.shameOverlay} />
        
        <Animated.View style={[styles.dustMote1, { transform: [{ translateY: dustAnim }] }]} />
        <Animated.View style={[styles.dustMote2, { transform: [{ translateX: dustAnim }] }]} />
        <Animated.View style={[styles.dustMote3, { transform: [{ translateY: dustAnim }, { translateX: dustAnim }] }]} />
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
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
            <View style={[common_styles.polaroidLarge, styles.shamePolaroid]}>
              <View style={[common_styles.cowardStamp, styles.bigCowardStamp]}>
                <Text style={[common_styles.cowardStampText, styles.bigStampText]}>
                  RETREAT
                </Text>
              </View>
              <View style={[common_styles.photoFrame, common_styles.photoMedium, styles.shamePhoto]}>
                <View style={common_styles.photoPlaceholderContent}>
                  <Text style={styles.shameIcon}>🏃‍♂️💨</Text>
                  <Text style={[common_styles.photoPlaceholderText, styles.shamePhotoText]}>
                    RETREATING
                  </Text>
                  <Text style={common_styles.photoPlaceholderSubtext}>
                    from adventure
                  </Text>
                </View>
              </View>
              
              <View style={common_styles.captionArea}>
                <Text style={styles.shameTitle}>ADVENTURE ABANDONED</Text>
                <Text style={styles.shameSubtitle}>{getShameMessage()}</Text>
              </View>
              
              <View style={common_styles.polaroidFooter}>
                <Text style={[common_styles.usernameStamp, styles.retreaterStamp]}>
                  RETREATER
                </Text>
                <Text style={common_styles.dateStamp}>
                  {new Date().toLocaleDateString()}
                </Text>
              </View>
            </View>

            {challenge && (
              <View style={[common_styles.polaroidMedium, styles.failedChallengePolaroid]}>
                <View style={styles.failedStamp}>
                  <Text style={styles.failedStampText}>ABANDONED</Text>
                </View>
                
                <View style={[common_styles.photoFrame, styles.failedPhoto]}>
                  <View style={common_styles.photoPlaceholderContent}>
                    <Text style={styles.sadIcon}>😔</Text>
                    <Text style={common_styles.photoPlaceholderText}>
                      WHAT COULD HAVE BEEN
                    </Text>
                  </View>
                </View>
                
                <View style={common_styles.captionArea}>
                  <Text style={styles.failedLabel}>THE MISSION YOU FLED:</Text>
                  <Text style={[common_styles.challengeText, styles.failedChallenge]}>
                    {challenge}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.shameStats}>
              <Text style={styles.statText}>🏕️ CAMPSITES AVOIDED: +1</Text>
              <Text style={styles.statText}>🥾 TRAILS UNTAKEN: +1</Text>
              <Text style={styles.statText}>📸 MEMORIES UNMADE: +1</Text>
              <Text style={styles.statText}>😰 REGRET LEVEL: MAXIMUM</Text>
            </View>
            
            <View style={styles.motivationContainer}>
              <Text style={styles.brutalMotivation}>
                WHILE YOU'RE HERE{'\n'}
                OTHERS ARE OUT THERE{'\n'}
                CONQUERING MOUNTAINS{'\n'}
                AND CAPTURING SUNSETS
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
        
        <View style={styles.bottomSection}>
          {timeLeft > 0 ? (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>
                REFLECTING ON YOUR RETREAT FOR {timeLeft} MORE SECONDS
              </Text>
              <View style={styles.countdownFrame}>
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
              style={[common_styles.secondaryButton, styles.redemptionButton]}
              onPress={handleRedemption}
              activeOpacity={0.8}
            >
              <Text style={[common_styles.secondaryButtonText, styles.redemptionText]}>
                PLAN YOUR RETURN
              </Text>
              <Text style={styles.redemptionSubtext}>
                (next time, answer the call)
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.cornerLeaf1} />
        <View style={styles.cornerLeaf2} />
        <View style={styles.cornerLeaf3} />
        <View style={styles.cornerLeaf4} />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = {
  safeContainer: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
  
  container: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
  
  scrollContainer: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, 
  },
  
  shameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.dustyRed,
    opacity: 0.15,
  },
  
  dustMote1: {
    position: 'absolute',
    top: '15%',
    left: '12%',
    width: 4,
    height: 4,
    backgroundColor: colors.tan,
    opacity: 0.3,
    borderRadius: 2,
  },
  
  dustMote2: {
    position: 'absolute',
    top: '25%',
    right: '20%',
    width: 3,
    height: 3,
    backgroundColor: colors.peach,
    opacity: 0.4,
    borderRadius: 1.5,
  },
  
  dustMote3: {
    position: 'absolute',
    top: '35%',
    left: '30%',
    width: 2,
    height: 2,
    backgroundColor: colors.lightBrown,
    opacity: 0.5,
    borderRadius: 1,
  },
  
  mainContent: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 20,
    minHeight: height * 0.7,
  },
  
  shamePolaroid: {
    backgroundColor: colors.offWhite,
    borderWidth: 3,
    borderColor: colors.dustyRed,
    marginBottom: 20,
    transform: [{ rotate: '-2deg' }],
    maxWidth: width - 40,
  },
  
  bigCowardStamp: {
    top: -12,
    right: -12,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderWidth: 3,
    transform: [{ rotate: '20deg' }],
  },
  
  bigStampText: {
    fontSize: 12,
    fontWeight: '900',
  },
  
  shamePhoto: {
    backgroundColor: colors.lightGray,
    borderColor: colors.dustyRed,
    borderWidth: 2,
    minHeight: 120,
  },
  
  shameIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  
  shamePhotoText: {
    color: colors.vintageRed,
    fontWeight: '900',
  },
  
  shameTitle: {
    ...typography.headerSmall,
    color: colors.vintageRed,
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 16,
  },
  
  shameSubtitle: {
    ...typography.bodyMedium,
    color: colors.dustyRed,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 5,
    letterSpacing: 0.5,
    fontSize: 12,
  },
  
  retreaterStamp: {
    color: colors.dustyRed,
    fontWeight: '900',
  },
  
  failedChallengePolaroid: {
    backgroundColor: colors.offWhite,
    borderWidth: 2,
    borderColor: colors.lightBrown,
    marginBottom: 20,
    transform: [{ rotate: '1.5deg' }],
    position: 'relative',
    maxWidth: width - 50,
  },
  
  failedStamp: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: colors.dustyRed,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.vintageRed,
    transform: [{ rotate: '-15deg' }],
    zIndex: 10,
  },
  
  failedStampText: {
    ...typography.stamp,
    color: colors.polaroidWhite,
    fontWeight: '900',
    fontSize: 10,
  },
  
  failedPhoto: {
    height: 100,
    backgroundColor: colors.lightGray,
    borderColor: colors.mediumGray,
  },
  
  sadIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  
  failedLabel: {
    ...typography.label,
    color: colors.dustyRed,
    textAlign: 'center',
    marginBottom: 5,
    fontSize: 10,
  },
  
  failedChallenge: {
    color: colors.darkBrown,
    fontWeight: '700',
    fontSize: 12,
  },
  
  shameStats: {
    backgroundColor: colors.offWhite,
    padding: 15,
    borderWidth: 2,
    borderColor: colors.lightBrown,
    marginBottom: 20,
    transform: [{ rotate: '-0.5deg' }],
    alignItems: 'flex-start',
    maxWidth: width - 40,
  },
  
  statText: {
    ...typography.bodySmall,
    color: colors.darkBrown,
    marginBottom: 3,
    fontWeight: '600',
    fontSize: 11,
  },
  
  motivationContainer: {
    backgroundColor: colors.polaroidWhite,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.mediumGray,
    transform: [{ rotate: '1deg' }],
    ...common_styles.lightShadow,
    maxWidth: width - 40,
    marginBottom: 20,
  },
  
  brutalMotivation: {
    ...typography.bodyMedium,
    color: colors.darkBrown,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 15,
    alignItems: 'center',
    backgroundColor: colors.darkBrown,
    borderTopWidth: 1,
    borderTopColor: colors.lightBrown,
  },
  
  countdownContainer: {
    alignItems: 'center',
    gap: 12,
  },
  
  countdownText: {
    ...typography.bodySmall,
    color: colors.dustyRed,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  
  countdownFrame: {
    width: Math.min(200, width - 80),
    height: 6,
    backgroundColor: colors.offWhite,
    borderWidth: 2,
    borderColor: colors.lightBrown,
    padding: 1,
  },
  
  countdownProgress: {
    height: '100%',
    backgroundColor: colors.dustyRed,
  },
  
  redemptionButton: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderWidth: 3,
    borderColor: colors.lightBrown,
    transform: [{ rotate: '-0.5deg' }],
    maxWidth: width - 60,
  },
  
  redemptionText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  
  redemptionSubtext: {
    ...typography.bodySmall,
    color: colors.mediumGray,
    textAlign: 'center',
    marginTop: 3,
    fontStyle: 'italic',
    fontSize: 10,
  },
  
  cornerLeaf1: {
    position: 'absolute',
    top: '8%',
    left: '5%',
    width: 25,
    height: 25,
    backgroundColor: colors.oliveGreen,
    opacity: 0.3,
    borderRadius: 12,
    transform: [{ rotate: '45deg' }],
  },
  
  cornerLeaf2: {
    position: 'absolute',
    top: '10%',
    right: '8%',
    width: 18,
    height: 32,
    backgroundColor: colors.forestGreen,
    opacity: 0.2,
    borderRadius: 9,
    transform: [{ rotate: '-30deg' }],
  },
  
  cornerLeaf3: {
    position: 'absolute',
    bottom: '12%',
    left: '7%',
    width: 20,
    height: 28,
    backgroundColor: colors.mossGreen,
    opacity: 0.25,
    borderRadius: 10,
    transform: [{ rotate: '60deg' }],
  },
  
  cornerLeaf4: {
    position: 'absolute',
    bottom: '10%',
    right: '10%',
    width: 28,
    height: 20,
    backgroundColor: colors.lightBrown,
    opacity: 0.3,
    borderRadius: 14,
    transform: [{ rotate: '-45deg' }],
  },
};

export default CowardPage;