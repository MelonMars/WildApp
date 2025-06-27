import React, { useState, useEffect } from 'react';
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

const AchievementsPage = () => {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [achievementAnims, setAchievementAnims] = useState([]);
    const [sparkleAnims] = useState(
        Array.from({ length: 20 }, () => ({
            translateY: new Animated.Value(-30),
            translateX: new Animated.Value(0),
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
        }))
    );

    const router = useRouter();
    const { 
        newAchievements: achievementsParam,
        isNewPost,
        newPost
    } = useLocalSearchParams();

    const achievements = React.useMemo(() => {
        try {
            if (typeof achievementsParam === 'string') {
                return JSON.parse(achievementsParam);
            }
            return achievementsParam || [];
        } catch (error) {
            console.error('Error parsing achievements:', error);
            return [];
        }
    }, [achievementsParam]);

    useEffect(() => {
        const anims = achievements.map(() => ({
            iconAnim: new Animated.Value(0),
            bounceAnim: new Animated.Value(0),
            glowAnim: new Animated.Value(0),
        }));
        setAchievementAnims(anims);

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

            anims.forEach((anim, index) => {
                setTimeout(() => {
                    Animated.sequence([
                        Animated.timing(anim.iconAnim, {
                            toValue: 1.2,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.spring(anim.iconAnim, {
                            toValue: 1,
                            tension: 40,
                            friction: 6,
                            useNativeDriver: true,
                        }),
                    ]).start();

                    setTimeout(() => {
                        Animated.loop(
                            Animated.sequence([
                                Animated.timing(anim.bounceAnim, {
                                    toValue: 1,
                                    duration: 1500 + Math.random() * 500,
                                    useNativeDriver: true,
                                }),
                                Animated.timing(anim.bounceAnim, {
                                    toValue: 0,
                                    duration: 1500 + Math.random() * 500,
                                    useNativeDriver: true,
                                }),
                            ])
                        ).start();

                        Animated.loop(
                            Animated.sequence([
                                Animated.timing(anim.glowAnim, {
                                    toValue: 1,
                                    duration: 2000 + Math.random() * 1000,
                                    useNativeDriver: true,
                                }),
                                Animated.timing(anim.glowAnim, {
                                    toValue: 0,
                                    duration: 2000 + Math.random() * 1000,
                                    useNativeDriver: true,
                                }),
                            ])
                        ).start();
                    }, 200);
                }, index * 300);
            });

            setTimeout(() => {
                const sparkleStagger = sparkleAnims.map((anim, index) => {
                    const angle = (index / sparkleAnims.length) * Math.PI * 2;
                    const radius = 100 + Math.random() * 80;
                    const randomX = Math.cos(angle) * radius;
                    const randomY = Math.sin(angle) * radius;

                    return Animated.parallel([
                        Animated.timing(anim.opacity, {
                            toValue: 1,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.scale, {
                            toValue: 1,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.translateX, {
                            toValue: randomX,
                            duration: 2500 + Math.random() * 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.translateY, {
                            toValue: randomY,
                            duration: 2500 + Math.random() * 1500,
                            useNativeDriver: true,
                        }),
                    ]);
                });

                Animated.stagger(60, sparkleStagger).start();
            }, 800);

        }, 1000);
    }, [achievements]);

    const handleContinue = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        router.push({
            pathname: "gallery",
            params: {
                newPost: newPost,
                isNewPost: 'true'
            }
        });
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy':
                return colors.forestGreen;
            case 'medium':
                return colors.vintageOrange;
            case 'hard':
                return colors.darkBrown;
            case 'legendary':
                return '#8B5CF6'; 
            default:
                return colors.forestGreen;
        }
    };

    const getDifficultyLabel = (difficulty) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy':
                return 'BRONZE';
            case 'medium':
                return 'SILVER';
            case 'hard':
                return 'GOLD';
            case 'legendary':
                return 'PLATINUM';
            default:
                return 'BRONZE';
        }
    };

    const renderAchievement = (achievement, index) => {
        const anim = achievementAnims[index];
        if (!anim) return null;

        const bounceTransform = anim.bounceAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -6],
        });

        const glowOpacity = anim.glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.2, 0.5],
        });

        const difficultyColor = getDifficultyColor(achievement.difficulty || 'easy');
        const difficultyLabel = getDifficultyLabel(achievement.difficulty || 'easy');

        return (
            <View key={achievement.id || index} style={styles.achievementCard}>
                <View style={styles.achievementContainer}>
                    <Animated.View
                        style={[
                            styles.glowEffect,
                            {
                                opacity: glowOpacity,
                                backgroundColor: difficultyColor,
                                shadowColor: difficultyColor,
                                transform: [{ translateY: bounceTransform }],
                            }
                        ]}
                    />

                    <Animated.View
                        style={[
                            styles.achievementIconContainer,
                            {
                                borderColor: difficultyColor,
                                transform: [
                                    { scale: anim.iconAnim },
                                    { translateY: bounceTransform }
                                ],
                            }
                        ]}
                    >
                        <Text style={styles.achievementIcon}>{achievement.icon || '🏆'}</Text>
                    </Animated.View>
                </View>

                <Animated.View
                    style={[
                        styles.achievementInfo,
                        {
                            transform: [{ translateY: bounceTransform }],
                        }
                    ]}
                >
                    <Text style={styles.achievementTitle}>{achievement.title || 'Achievement'}</Text>
                    <Text style={styles.achievementDescription}>
                        {achievement.description || 'You\'ve accomplished something great!'}
                    </Text>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.badgeContainer,
                        {
                            transform: [{ translateY: bounceTransform }],
                        }
                    ]}
                >
                    {achievement.category && (
                        <View style={[styles.categoryBadge, { backgroundColor: colors.oliveGreen }]}>
                            <Text style={styles.categoryText}>{achievement.category.toUpperCase()}</Text>
                        </View>
                    )}
                    
                    <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
                        <Text style={styles.difficultyText}>{difficultyLabel}</Text>
                    </View>
                    
                    <View style={[common_styles.tapeHorizontal, styles.badgeTape]} />
                </Animated.View>
            </View>
        );
    };

    if (achievements.length === 0) {
        return (
            <View style={common_styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                <LinearGradient
                    colors={[colors.lightBrown, colors.mediumBrown, colors.darkBrown]}
                    style={common_styles.backgroundTexture}
                />
                <View style={[common_styles.contentContainer, { justifyContent: 'center' }]}>
                    <Text style={styles.noAchievementsText}>No achievements to display</Text>
                    <TouchableOpacity
                        style={common_styles.primaryButton}
                        onPress={handleContinue}
                    >
                        <Text style={common_styles.primaryButtonText}>GO BACK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={common_styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />

            <LinearGradient
                colors={[colors.lightBrown, colors.mediumBrown, colors.darkBrown]}
                style={common_styles.backgroundTexture}
            />

            {sparkleAnims.map((anim, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.sparkle,
                        {
                            left: width / 2,
                            top: height / 3,
                            opacity: anim.opacity,
                            transform: [
                                { translateX: anim.translateX },
                                { translateY: anim.translateY },
                                { scale: anim.scale },
                            ],
                        }
                    ]}
                />
            ))}

            <Animated.View
                style={[
                    common_styles.contentContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }
                ]}
            >
                <Animated.View style={[common_styles.header, { marginBottom: 20 }]}>
                    <Text style={common_styles.headerTitle}>
                        {achievements.length === 1 ? 'ACHIEVEMENT UNLOCKED!' : 'ACHIEVEMENTS UNLOCKED!'}
                    </Text>
                    <View style={common_styles.headerLine} />
                </Animated.View>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {achievements.map((achievement, index) => renderAchievement(achievement, index))}

                    <TouchableOpacity
                        style={[
                            common_styles.primaryButton,
                            styles.continueButton,
                        ]}
                        onPress={handleContinue}
                    >
                        <Text style={common_styles.primaryButtonText}>
                            CONTINUE
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    sparkle: {
        position: 'absolute',
        width: 4,
        height: 4,
        backgroundColor: colors.vintageOrange,
        borderRadius: 2,
        zIndex: 1000,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    achievementCard: {
        marginBottom: 30,
        alignItems: 'center',
    },
    achievementContainer: {
        alignItems: 'center',
        marginVertical: 20,
        position: 'relative',
    },
    glowEffect: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        top: -5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 12,
    },
    achievementIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.polaroidWhite,
        borderRadius: 20,
        width: 110,
        height: 110,
        borderWidth: 3,
        ...shadows.heavyShadow,
        zIndex: 5,
    },
    achievementIcon: {
        fontSize: 50,
        textAlign: 'center',
    },
    achievementInfo: {
        alignItems: 'center',
        marginVertical: 15,
        paddingHorizontal: 20,
    },
    achievementTitle: {
        ...typography.headerMedium,
        fontSize: 22,
        fontWeight: '800',
        color: colors.polaroidWhite,
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: colors.darkBrown,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    achievementDescription: {
        ...typography.bodyMedium,
        fontSize: 14,
        color: colors.lightBrown,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        position: 'relative',
        gap: 10,
    },
    categoryBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.darkBrown,
        transform: [{ rotate: '-1deg' }],
        ...shadows.lightShadow,
    },
    categoryText: {
        ...typography.stamp,
        fontSize: 9,
        color: colors.polaroidWhite,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    difficultyBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.darkBrown,
        transform: [{ rotate: '1deg' }],
        ...shadows.lightShadow,
    },
    difficultyText: {
        ...typography.stamp,
        fontSize: 9,
        color: colors.polaroidWhite,
        textAlign: 'center',
        letterSpacing: 0.5,
        fontWeight: '800',
    },
    badgeTape: {
        position: 'absolute',
        top: -6,
        right: -12,
        width: 25,
        transform: [{ rotate: '15deg' }],
    },
    continueButton: {
        marginTop: 30,
        paddingVertical: 16,
        paddingHorizontal: 32,
        backgroundColor: colors.vintageOrange,
        borderWidth: 3,
        borderColor: colors.darkBrown,
        ...shadows.mediumShadow,
    },
    noAchievementsText: {
        ...typography.headerMedium,
        color: colors.polaroidWhite,
        textAlign: 'center',
        marginBottom: 30,
    },
});

export default AchievementsPage;