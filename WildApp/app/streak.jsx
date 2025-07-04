import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { common_styles, colors, typography, shadows } from './styles';

const { width, height } = Dimensions.get('window');

const StreakPage = () => {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [streakNumberAnim] = useState(new Animated.Value(0));

    const [bounceAnim] = useState(new Animated.Value(0));
    const [glowAnim] = useState(new Animated.Value(0));
    const [confettiAnims] = useState(
        Array.from({ length: 12 }, () => ({
            translateY: new Animated.Value(-50),
            translateX: new Animated.Value(0),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(0),
        }))
    );

    const router = useRouter();
    const { newPost, streak, isNewPost, newAchievements } = useLocalSearchParams();

    const streakNumber = parseInt(streak, 10) || 1;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Animated.sequence([
                Animated.timing(streakNumberAnim, {
                    toValue: 1.3,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(streakNumberAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 4,
                    useNativeDriver: true,
                }),
            ]).start();

            setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(bounceAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(bounceAnim, {
                            toValue: 0,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 500);

            setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(glowAnim, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(glowAnim, {
                            toValue: 0,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 300);

            setTimeout(() => {
                const confettiStagger = confettiAnims.map((anim, index) => {
                    const randomX = (Math.random() - 0.5) * 200;
                    const randomRotation = Math.random() * 360;

                    return Animated.parallel([
                        Animated.timing(anim.opacity, {
                            toValue: 1,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.translateY, {
                            toValue: height + 100,
                            duration: 3000 + Math.random() * 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.translateX, {
                            toValue: randomX,
                            duration: 3000 + Math.random() * 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.rotate, {
                            toValue: randomRotation,
                            duration: 3000 + Math.random() * 1000,
                            useNativeDriver: true,
                        }),
                    ]);
                });

                Animated.stagger(50, confettiStagger).start();
            }, 800);

        }, 1000);
    }, []);

    const handleContinue = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (newAchievements) {
            const achievementsList = JSON.parse(newAchievements);
            if (achievementsList.length > 0) {
                router.push({
                    pathname: "achievements",
                    params: {
                        achievements: achievementsList,
                    }
                });
                return;
            }
        }
        router.push({
                pathname: "gallery",
                params: {
                    newPost,
                    isNewPost,
                }
        });
    };

    const getStreakMessage = (streak) => {
        if (streak === 1) return "FIRST BLOOD!";
        if (streak === 2) return "DOUBLE KILL!";
        if (streak === 3) return "TRIPLE THREAT!";
        if (streak === 5) return "HIGH FIVE!";
        if (streak === 7) return "LUCKY SEVEN!";
        if (streak === 10) return "PERFECT TEN!";
        if (streak % 10 === 0) return "MILESTONE CRUSHER!";
        if (streak > 20) return "LEGEND STATUS!";
        return "STREAK MACHINE!";
    };

    const getStreakDescription = (streak) => {
        if (streak === 1) return "Your journey begins!";
        if (streak <= 3) return "Building momentum...";
        if (streak <= 7) return "Getting into rhythm!";
        if (streak <= 10) return "Unstoppable force!";
        return "Pure dedication!";
    };

    const bounceTransform = bounceAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    return (
        <View style={common_styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />

            <LinearGradient
                colors={[colors.lightBrown, colors.mediumBrown, colors.darkBrown]}
                style={common_styles.backgroundTexture}
            />

            {confettiAnims.map((anim, index) => {
                const confettiColors = [
                    colors.vintageOrange,
                    colors.forestGreen,
                    colors.peach,
                    colors.oliveGreen,
                    colors.mossGreen,
                ];
                const color = confettiColors[index % confettiColors.length];

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.confetti,
                            {
                                left: 20 + (index % 6) * (width - 40) / 6,
                                backgroundColor: color,
                                opacity: anim.opacity,
                                transform: [
                                    { translateY: anim.translateY },
                                    { translateX: anim.translateX },
                                    {
                                        rotate: anim.rotate.interpolate({
                                            inputRange: [0, 360],
                                            outputRange: ['0deg', '360deg'],
                                        })
                                    },
                                ],
                            }
                        ]}
                    />
                );
            })}

            <ScrollView>
            <Animated.View
                style={[
                    common_styles.contentContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        justifyContent: 'center',
                    }
                ]}
            >
                <Animated.View style={[common_styles.header, { marginBottom: 40 }]}>
                    <Text style={common_styles.headerTitle}>STREAK ACTIVATED!</Text>
                    <View style={common_styles.headerLine} />
                </Animated.View>

                <View style={styles.streakContainer}>
                    <Animated.View
                        style={[
                            styles.glowEffect,
                            {
                                opacity: glowOpacity,
                                transform: [{ translateY: bounceTransform }],
                            }
                        ]}
                    />

                    <Animated.View
                        style={[
                            styles.streakNumberContainer,
                            {
                                transform: [
                                    { scale: streakNumberAnim },
                                    { translateY: bounceTransform }
                                ],
                            }
                        ]}
                    >
                        <Text style={styles.streakNumber}>{streakNumber}</Text>
                        <Text style={styles.streakLabel}>DAY STREAK</Text>
                    </Animated.View>
                </View>

                <Animated.View
                    style={[
                        styles.messageContainer,
                        {
                            transform: [{ translateY: bounceTransform }],
                        }
                    ]}
                >
                    <Text style={styles.streakMessage}>{getStreakMessage(streakNumber)}</Text>
                    <Text style={styles.streakDescription}>{getStreakDescription(streakNumber)}</Text>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.badgeContainer,
                        {
                            transform: [{ translateY: bounceTransform }],
                        }
                    ]}
                >
                    <View style={[styles.vintageBadge, { backgroundColor: colors.vintageOrange }]}>
                        <Text style={styles.badgeText}>CONSISTENCY</Text>
                        <Text style={styles.badgeSubtext}>CHAMPION</Text>
                    </View>
                    <View style={[common_styles.tapeHorizontal, styles.badgeTape]} />
                </Animated.View>

                <TouchableOpacity
                    style={[
                        common_styles.primaryButton,
                        styles.continueButton,
                        {
                            backgroundColor: colors.forestGreen,
                            borderColor: colors.oliveGreen,
                        }
                    ]}
                    onPress={handleContinue}
                >
                    <Text style={[common_styles.primaryButtonText, { color: colors.polaroidWhite }]}>
                        SEE YOUR VICTORY
                    </Text>
                </TouchableOpacity>
            </Animated.View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    confetti: {
        position: 'absolute',
        width: 8,
        height: 8,
        top: -50,
        zIndex: 1000,
    },
    streakContainer: {
        alignItems: 'center',
        marginVertical: 40,
        position: 'relative',
    },
    glowEffect: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.vintageOrange,
        top: -20,
        shadowColor: colors.vintageOrange,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
    },
    streakNumberContainer: {
        alignItems: 'center',
        backgroundColor: colors.polaroidWhite,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderWidth: 3,
        borderColor: colors.vintageOrange,
        ...shadows.heavyShadow,
        zIndex: 5,
    },
    streakNumber: {
        ...typography.headerLarge,
        fontSize: 72,
        fontWeight: '900',
        color: colors.vintageOrange,
        textShadowColor: colors.darkBrown,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
        lineHeight: 72,
    },
    streakLabel: {
        ...typography.stamp,
        fontSize: 14,
        color: colors.darkBrown,
        letterSpacing: 2,
        marginTop: 5,
    },
    messageContainer: {
        alignItems: 'center',
        marginVertical: 30,
    },
    streakMessage: {
        ...typography.headerMedium,
        fontSize: 24,
        fontWeight: '800',
        color: colors.vintageOrange,
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: colors.darkBrown,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    streakDescription: {
        ...typography.bodyMedium,
        color: colors.lightBrown,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    badgeContainer: {
        alignItems: 'center',
        marginVertical: 20,
        position: 'relative',
    },
    vintageBadge: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.darkBrown,
        transform: [{ rotate: '-2deg' }],
        ...shadows.lightShadow,
    },
    badgeText: {
        ...typography.stamp,
        fontSize: 12,
        color: colors.polaroidWhite,
        textAlign: 'center',
        letterSpacing: 1.5,
    },
    badgeSubtext: {
        ...typography.stamp,
        fontSize: 10,
        color: colors.polaroidWhite,
        textAlign: 'center',
        letterSpacing: 1,
        marginTop: 2,
    },
    badgeTape: {
        position: 'absolute',
        top: -5,
        right: -10,
        width: 40,
        transform: [{ rotate: '15deg' }],
    },
    continueButton: {
        marginTop: 40,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderWidth: 3,
        ...shadows.mediumShadow,
    },
});

export default StreakPage;