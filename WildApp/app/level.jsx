import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { common_styles, colors, typography, shadows } from './styles';

const { width, height } = Dimensions.get('window');

const LevelUpPage = () => {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [levelNumberAnim] = useState(new Animated.Value(0));
    const [progressBarAnim] = useState(new Animated.Value(0));

    const [pulseAnim] = useState(new Animated.Value(0));
    const [sparkleAnim] = useState(new Animated.Value(0));
    const [starsAnims] = useState(
        Array.from({ length: 8 }, () => ({
            translateY: new Animated.Value(-100),
            translateX: new Animated.Value(0),
            scale: new Animated.Value(0),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(0),
        }))
    );

    const router = useRouter();
    const { newLevel, previousLevel, totalPosts, newAchievements, newPost, isNewPost } = useLocalSearchParams();

    const currentLevel = parseInt(newLevel, 10) || 2;
    const prevLevel = parseInt(previousLevel, 10) || 1;
    const postsCount = parseInt(totalPosts, 10) || 0;

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
                Animated.timing(levelNumberAnim, {
                    toValue: 1.4,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(levelNumberAnim, {
                    toValue: 1,
                    tension: 40,
                    friction: 5,
                    useNativeDriver: true,
                }),
            ]).start();

            setTimeout(() => {
                Animated.timing(progressBarAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: false,
                }).start();
            }, 400);

            setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulseAnim, {
                            toValue: 1,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseAnim, {
                            toValue: 0,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 200);

            setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(sparkleAnim, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(sparkleAnim, {
                            toValue: 0,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 600);

            setTimeout(() => {
                const starAnimations = starsAnims.map((anim, index) => {
                    const angle = (index / starsAnims.length) * 2 * Math.PI;
                    const distance = 120 + Math.random() * 60;
                    const randomX = Math.cos(angle) * distance;
                    const randomY = Math.sin(angle) * distance;
                    const randomRotation = Math.random() * 720;

                    return Animated.parallel([
                        Animated.timing(anim.opacity, {
                            toValue: 1,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.scale, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.translateX, {
                            toValue: randomX,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.translateY, {
                            toValue: randomY,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.rotate, {
                            toValue: randomRotation,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ]);
                });

                Animated.stagger(100, starAnimations).start(() => {
                    setTimeout(() => {
                        starsAnims.forEach(anim => {
                            Animated.timing(anim.opacity, {
                                toValue: 0,
                                duration: 800,
                                useNativeDriver: true,
                            }).start();
                        });
                    }, 1000);
                });
            }, 1000);

        }, 800);
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
        router.push("gallery");
    };

    const getLevelTitle = (level) => {
        if (level === 2) return "RISING STAR!";
        if (level === 3) return "PHOTO ENTHUSIAST!";
        if (level === 4) return "MEMORY KEEPER!";
        if (level === 5) return "VISUAL STORYTELLER!";
        if (level === 10) return "MASTER PHOTOGRAPHER!";
        if (level >= 15) return "LEGEND OF MEMORIES!";
        return "LEVEL CHAMPION!";
    };

    const getLevelDescription = (level) => {
        if (level === 2) return "Your photo journey is taking off!";
        if (level === 3) return "Building your visual story...";
        if (level === 4) return "Capturing life's moments!";
        if (level === 5) return "Your skills are developing!";
        if (level >= 10) return "You're a true memory master!";
        return "Keep creating amazing memories!";
    };

    const getLevelReward = (level) => {
        if (level === 2) return "New frame unlocked!";
        if (level === 3) return "Special filters available!";
        if (level === 4) return "Premium borders unlocked!";
        if (level === 5) return "Advanced editing tools!";
        return "Exclusive content unlocked!";
    };

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
    });

    const pulseOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0.8],
    });

    const sparkleRotation = sparkleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const progressWidth = progressBarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={common_styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />

            <LinearGradient
                colors={[colors.forestGreen, colors.mediumBrown, colors.darkBrown]}
                style={common_styles.backgroundTexture}
            />

            {starsAnims.map((anim, index) => {
                const starColors = [
                    colors.vintageOrange,
                    colors.peach,
                    colors.polaroidWhite,
                    colors.lightBrown,
                ];
                const color = starColors[index % starColors.length];

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.star,
                            {
                                left: width / 2 - 4,
                                top: height / 2 - 100,
                                backgroundColor: color,
                                opacity: anim.opacity,
                                transform: [
                                    { translateX: anim.translateX },
                                    { translateY: anim.translateY },
                                    { scale: anim.scale },
                                    {
                                        rotate: anim.rotate.interpolate({
                                            inputRange: [0, 720],
                                            outputRange: ['0deg', '720deg'],
                                        })
                                    },
                                ],
                            }
                        ]}
                    />
                );
            })}

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
                <Animated.View style={[common_styles.header, { marginBottom: 15, marginTop: 50 }]}>
                    <Text style={common_styles.headerTitle}>LEVEL UP!</Text>
                    <View style={common_styles.headerLine} />
                </Animated.View>

                <View style={styles.levelContainer}>
                    <Animated.View
                        style={[
                            styles.glowEffect,
                            {
                                opacity: pulseOpacity,
                                transform: [{ scale: pulseScale }],
                            }
                        ]}
                    />

                    <Animated.View
                        style={[
                            styles.sparkleContainer,
                            {
                                transform: [{ rotate: sparkleRotation }],
                            }
                        ]}
                    >
                        <Text style={styles.sparkleText}>✨</Text>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.levelNumberContainer,
                            {
                                transform: [{ scale: levelNumberAnim }],
                            }
                        ]}
                    >
                        <Text style={styles.levelNumber}>{currentLevel}</Text>
                        <Text style={styles.levelLabel}>LEVEL</Text>
                    </Animated.View>
                </View>

                <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>
                        Level {prevLevel} → Level {currentLevel}
                    </Text>
                    <View style={styles.progressBarBackground}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                { width: progressWidth }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {postsCount} memories captured!
                    </Text>
                </View>

                <View style={styles.messageContainer}>
                    <Text style={styles.levelMessage}>{getLevelTitle(currentLevel)}</Text>
                    <Text style={styles.levelDescription}>{getLevelDescription(currentLevel)}</Text>
                </View>

                <View style={styles.rewardContainer}>
                    <View style={[styles.rewardBadge, { backgroundColor: colors.forestGreen }]}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push({
                                    pathname: "gallery",
                                    params: {
                                        newPost,
                                        isNewPost,
                                    }
                                });
                            }}
                            >
                            <Text style={styles.rewardText}>Advance</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[common_styles.tapeHorizontal, styles.rewardTape]} />
                </View>

                <TouchableOpacity
                    style={[
                        common_styles.primaryButton,
                        styles.continueButton,
                        {
                            backgroundColor: colors.vintageOrange,
                            borderColor: colors.darkBrown,
                        }
                    ]}
                    onPress={handleContinue}
                >
                    <Text style={[common_styles.primaryButtonText, { color: colors.polaroidWhite }]}>
                        CLAIM YOUR REWARDS
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    star: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        zIndex: 1000,
    },
    levelContainer: {
        alignItems: 'center',
        marginVertical: 30,
        position: 'relative',
    },
    glowEffect: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: colors.forestGreen,
        shadowColor: colors.forestGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 25,
        elevation: 15,
    },
    sparkleContainer: {
        position: 'absolute',
        top: -30,
        right: -20,
        zIndex: 10,
    },
    sparkleText: {
        fontSize: 24,
        textShadowColor: colors.darkBrown,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    levelNumberContainer: {
        alignItems: 'center',
        backgroundColor: colors.polaroidWhite,
        borderRadius: 25,
        paddingVertical: 25,
        paddingHorizontal: 35,
        borderWidth: 4,
        borderColor: colors.forestGreen,
        ...shadows.heavyShadow,
        zIndex: 5,
    },
    levelNumber: {
        ...typography.headerLarge,
        fontSize: 64,
        fontWeight: '900',
        color: colors.forestGreen,
        textShadowColor: colors.darkBrown,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
        lineHeight: 64,
    },
    levelLabel: {
        ...typography.stamp,
        fontSize: 16,
        color: colors.darkBrown,
        letterSpacing: 3,
        marginTop: 5,
    },
    progressContainer: {
        alignItems: 'center',
        marginVertical: 25,
        width: '80%',
        alignSelf: 'center',
    },
    progressLabel: {
        ...typography.bodyMedium,
        color: colors.lightBrown,
        marginBottom: 4,
        fontSize: 16,
        fontWeight: '600',
    },
    progressBarBackground: {
        width: '100%',
        height: 12,
        backgroundColor: colors.mediumBrown,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.darkBrown,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.vintageOrange,
        borderRadius: 5,
    },
    progressText: {
        ...typography.bodySmall,
        color: colors.peach,
        marginTop: 8,
        fontStyle: 'italic',
    },
    messageContainer: {
        alignItems: 'center',
        marginVertical: 25,
    },
    levelMessage: {
        ...typography.headerMedium,
        fontSize: 26,
        fontWeight: '800',
        color: colors.vintageOrange,
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: colors.darkBrown,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    levelDescription: {
        ...typography.bodyMedium,
        color: colors.lightBrown,
        textAlign: 'center',
        fontStyle: 'italic',
        fontSize: 16,
    },
    rewardContainer: {
        alignItems: 'center',
        marginVertical: 20,
        position: 'relative',
    },
    rewardBadge: {
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.darkBrown,
        transform: [{ rotate: '1deg' }],
        ...shadows.mediumShadow,
    },
    rewardText: {
        ...typography.stamp,
        fontSize: 14,
        color: colors.polaroidWhite,
        textAlign: 'center',
        letterSpacing: 1.5,
        fontWeight: '700',
    },
    rewardSubtext: {
        ...typography.stamp,
        fontSize: 11,
        color: colors.polaroidWhite,
        textAlign: 'center',
        letterSpacing: 0.5,
        marginTop: 4,
        fontStyle: 'italic',
    },
    rewardTape: {
        position: 'absolute',
        top: -8,
        left: -15,
        width: 45,
        transform: [{ rotate: '-20deg' }],
    },
    continueButton: {
        marginTop: 30,
        paddingVertical: 18,
        paddingHorizontal: 35,
        borderWidth: 3,
        ...shadows.mediumShadow,
    },
});

export default LevelUpPage;