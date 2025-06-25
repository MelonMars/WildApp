import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Animated, 
  BackHandler,
  Vibration,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common_styles, colors, typography, shadows } from './styles';
import { PostService } from './services/postService';
import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';

const ChallengePage = () => {
    const [pulseAnim] = useState(new Animated.Value(1));
    const [shakeAnim] = useState(new Animated.Value(0));
    const [wobbleAnim] = useState(new Animated.Value(0));
    const [fillAnim] = useState(new Animated.Value(0));
    const [isHolding, setIsHolding] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const holdingRef = useRef(false);
    const fillAnimationRef = useRef(null);
    const { challenge, finishes, category } = useLocalSearchParams();
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
                    toValue: 1.02,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        const wobble = Animated.loop(
            Animated.sequence([
                Animated.timing(wobbleAnim, {
                    toValue: 0.5,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(wobbleAnim, {
                    toValue: -0.5,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        );
        wobble.start();
    }, []);

    const handleCowardPressIn = () => {
        console.log('Press in - starting hold');
        setIsHolding(true);
        holdingRef.current = true;
         
        Vibration.vibrate([0, 100, 0], true);

        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();

        fillAnimationRef.current = Animated.timing(fillAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
        });
        
        fillAnimationRef.current.start(({ finished }) => {
            Vibration.cancel();
            console.log('Animation finished:', finished, 'Still holding:', holdingRef.current);
            if (finished && holdingRef.current) {
                console.log('Showing confirmation');
                setShowConfirmation(true);
                setIsHolding(false);
                holdingRef.current = false;
            }
        });
    };

    const handleCowardPressOut = () => {
        console.log('Press out - stopping hold');
        setIsHolding(false);
        holdingRef.current = false;
        
        Vibration.cancel();

        if (fillAnimationRef.current) {
            fillAnimationRef.current.stop();
        }
        
        Animated.timing(fillAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleConfirmRetreat = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setShowConfirmation(false);
        
        try {
            const cowardData = {
                challenge: challenge,
                username: await AsyncStorage.getItem('username') || 'anonymous',
            };

            const result = await PostService.cowardPost(cowardData);
            console.log('Coward post created:', result);
        } catch (error) {
            console.error('Error creating coward post:', error);
        }

        setTimeout(() => {
            router.push(
                { pathname: 'coward', params: { challenge, category } }
            );
        }, 500);
    };

    const handleCancelRetreat = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        setShowConfirmation(false);
        setIsHolding(false);
        holdingRef.current = false;
        
        Animated.timing(fillAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleCompletePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: 'postchallenge',
            params: { 
                challenge, 
                category,
                completedAt: new Date().toISOString()
            }
        });
    };

    const fillHeight = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const handleShareChallenge = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `Join me on this WildApp challenge!\n\n"${challenge}"\n\nCategory: ${category}\n\nCan you complete it?`,
                title: 'WildApp Challenge Invitation',
            });
        } catch (error) {
            console.error('Error sharing challenge:', error);
        }
    };

    const navigateToMap = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: 'map',
            params: { challenge: challenge, category: category }
        })
    };

    return (
        <Animated.View 
            style={[
                common_styles.container,
                { transform: [{ rotate: `${wobbleAnim._value}deg` }] }
            ]}
        >
            <ScrollView>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                
                <View style={common_styles.backgroundTexture} />
                
                <View style={styles.paperOverlay} />
                
                <View style={styles.header}>
                    <View style={common_styles.categoryBadge}>
                        <Text style={common_styles.categoryBadgeText}>
                            {category.toUpperCase()}
                        </Text>
                    </View>
                    <View style={[common_styles.headerLine, styles.headerAccent]} />
                    <Text style={styles.missionLabel}>FIELD MISSION</Text>
                </View>

                <View style={common_styles.contentContainer}>
                    <View style={common_styles.polaroidContainer}>
                        <Animated.View 
                            style={[
                                common_styles.polaroidLarge,
                                styles.challengePolaroid,
                                { transform: [
                                    { scale: pulseAnim },
                                    { rotate: '-1.5deg' }
                                ]}
                            ]}
                        >
                            <View style={[common_styles.tapeHorizontal, common_styles.tapeTopLeft]} />
                            <View style={[common_styles.tapeHorizontal, common_styles.tapeBottomRight]} />
                            
                            <View style={[common_styles.photoFrame, common_styles.photoMedium]}>
                                <View style={common_styles.photoPlaceholderContent}>
                                    <Text style={styles.adventureIcon}>🏞️</Text>
                                    <Text style={common_styles.photoPlaceholderText}>
                                        YOUR ADVENTURE
                                    </Text>
                                    <Text style={common_styles.photoPlaceholderSubtext}>
                                        awaits capture
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={common_styles.captionArea}>
                                <Text style={styles.challengeLabel}>MISSION BRIEFING:</Text>
                                <Text style={[common_styles.challengeText, styles.challengeContent]}>
                                    {challenge}
                                </Text>
                            </View>
                            
                            <View style={common_styles.polaroidFooter}>
                                <Text style={common_styles.usernameStamp}>EXPLORER</Text>
                                <Text style={common_styles.dateStamp}>
                                    {new Date().toLocaleDateString()}
                                </Text>
                            </View>
                        </Animated.View>
                    </View>

                    <View style={styles.warningContainer}>
                        <Text style={styles.warningText}>
                            THE WILD CALLS TO YOU.{'\n'}
                            ANSWER OR RETREAT IN SHAME.
                        </Text> 
                        <Text style={[styles.warningText, { rotateX: '-80deg' }]}>
                            JOIN {finishes} BRAVE EXPLORERS
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                    <TouchableOpacity 
                        style={[common_styles.secondaryButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 'auto', alignSelf: 'center', paddingHorizontal: 16 }]}
                        onPress={handleShareChallenge}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 22, marginRight: 8 }}>📤</Text>
                        <Text style={common_styles.secondaryButtonText}>SHARE & INVITE FRIENDS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.circleButton, { marginTop: 0 }]}
                        onPress={navigateToMap}>
                        <Text style={{ fontSize: 32 }}>🌎</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[common_styles.primaryButton, styles.completeButton]}
                        onPress={handleCompletePress}
                        activeOpacity={0.8}
                    >
                        <Text style={common_styles.primaryButtonText}>🏁 MISSION COMPLETE</Text>
                    </TouchableOpacity>

                    <Animated.View 
                        style={[
                            styles.cowardButtonContainer,
                            { transform: [{ translateX: shakeAnim }] }
                        ]}
                    >
                        <TouchableOpacity 
                            style={[common_styles.dangerButton, styles.cowardButton]}
                            onPressIn={handleCowardPressIn}
                            onPressOut={handleCowardPressOut}
                            activeOpacity={0.7}
                        >
                            <Animated.View 
                                style={[
                                    styles.buttonFill,
                                    { height: fillHeight }
                                ]}
                            />
                            <Text style={[common_styles.dangerButtonText, styles.cowardButtonText]}>
                                {isHolding ? '🐔 HOLD TO RETREAT...' : '🐔 RETREAT TO SAFETY'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                <View style={styles.bottomAccent} />

                {showConfirmation && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.confirmationModal}>
                            <Text style={styles.confirmationTitle}>⚠️ RETREAT CONFIRMATION</Text>
                            <Text style={styles.confirmationMessage}>
                                Are you absolutely certain you want to abandon this mission and retreat to safety?
                                {'\n\n'}
                                This action will mark you as a coward for this challenge.
                            </Text>
                            <View style={styles.confirmationButtons}>
                                <TouchableOpacity 
                                    style={[common_styles.primaryButton, styles.cancelButton]}
                                    onPress={handleCancelRetreat}
                                >
                                    <Text style={common_styles.primaryButtonText}>🛡️ STAY BRAVE</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[common_styles.dangerButton, styles.confirmButton]}
                                    onPress={handleConfirmRetreat}
                                >
                                    <Text style={common_styles.dangerButtonText}>🐱 CONFIRM RETREAT</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </Animated.View>
    );
};

const styles = {
    paperOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(245,245,220,0.05)',
        opacity: 0.8,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 30,
        alignItems: 'center',
        paddingBottom: 20,
    },
    headerAccent: {
        backgroundColor: colors.forestGreen,
        width: 120,
        height: 4,
        transform: [{ rotate: '1deg' }],
    },
    missionLabel: {
        ...typography.headerSmall,
        color: colors.tan,
        marginTop: 15,
        letterSpacing: 3,
        fontFamily: typography.fontFamily,
    },
    challengePolaroid: {
        backgroundColor: colors.polaroidWhite,
        borderWidth: 2,
        borderColor: colors.lightGray,
        shadowColor: colors.deepShadow,
        shadowOffset: { width: 4, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 15,
    },
    adventureIcon: {
        fontSize: 48,
        marginBottom: 10,
    },
    challengeLabel: {
        ...typography.label,
        color: colors.forestGreen,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 2,
    },
    challengeContent: {
        ...typography.bodyLarge,
        color: colors.darkBrown,
        fontWeight: '800',
        lineHeight: 24,
    },
    warningContainer: {
        marginTop: 15,
        marginBottom: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    warningText: {
        ...typography.bodyMedium,
        color: colors.vintageOrange,
        textAlign: 'center',
        fontWeight: '800',
        letterSpacing: 1.5,
        lineHeight: 22,
        transform: [{ rotate: '-0.5deg' }],
    },
    buttonContainer: {
        paddingHorizontal: 30,
        paddingBottom: 50,
        gap: 25,
    },
    completeButton: {
        paddingVertical: 20,
        shadowColor: colors.deepShadow,
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        transform: [{ rotate: '1deg' }],
    },
    cowardButtonContainer: {
        alignSelf: 'center',
    },
    cowardButton: {
        paddingVertical: 16,
        transform: [{ rotate: '-1deg' }],
        borderWidth: 3,
    },
    bottomAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 25,
        backgroundColor: colors.forestGreen,
        opacity: 0.4,
        transform: [{ skewY: '1deg' }],
    },
    buttonFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 116, 16, 0.3)',
        borderRadius: 8,
    },
    cowardButtonText: {
        zIndex: 1,
        position: 'relative',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    confirmationModal: {
        backgroundColor: colors.cream,
        margin: 20,
        padding: 25,
        borderRadius: 15,
        borderWidth: 3,
        borderColor: colors.darkBrown,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    confirmationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.darkBrown,
        textAlign: 'center',
        marginBottom: 15,
        fontFamily: 'serif',
    },
    confirmationMessage: {
        fontSize: 16,
        color: colors.darkBrown,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
        fontFamily: 'serif',
    },
    confirmationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    cancelButton: {
        flex: 1,
    },
    confirmButton: {
        flex: 1,
    },
    circleButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lightShadow,
    },
};

export default ChallengePage;