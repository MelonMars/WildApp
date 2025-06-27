import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, ScrollView, Image, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from './contexts/AppContext';
import { common_styles, colors, typography, shadows } from './styles'; 
import * as Haptics from 'expo-haptics';
import { PostService } from './services/postService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from './contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Profile() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [profileData, setProfileData] = useState({
        level: 1,
        streak: 0,
        totalChallenges: 0,
        socialChallenges: 0,
        adventureChallenges: 0,
        creativeChallenges: 0,
        dailyChallenges: 0,
        achievements: []
    });
    const params = useLocalSearchParams();
    const [showAllAchievements, setShowAllAchievements] = useState(false);
    const [showAchievementsModal, setShowAchievementsModal] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');

    const [isLoading, setIsLoading] = useState(true);

    if (loading) {
        return (
            <View style={common_styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                <LinearGradient
                    colors={[colors.lightBrown, colors.mediumBrown, colors.darkBrown]}
                    style={common_styles.backgroundTexture}
                />
                <View style={common_styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.vintageOrange} />
                    <Text style={common_styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    if (!user) {
        router.replace('/authentication');
        return null;
    }

    const getFilteredAchievements = () => {
        if (selectedDifficulty === 'all') {
            return profileData.achievements;
        }
        return profileData.achievements.filter(achievement => 
            achievement.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase()
        );
    };

    const loadProfileData = async () => {
        setIsLoading(true);
        try {
            const storedStreak = params?.streak || 0;
            const streak = storedStreak ? parseInt(storedStreak, 10) : 0;

            const posts = params.usersPosts;
            let stats = {
                totalChallenges: 0,
                socialChallenges: 0,
                adventureChallenges: 0,
                creativeChallenges: 0,
                dailyChallenges: 0
            };

            if (posts) {
                const parsedPosts = JSON.parse(posts);
                const completedChallenges = parsedPosts.filter(post => post.challenge);
                
                stats.totalChallenges = completedChallenges.length;
                stats.socialChallenges = completedChallenges.filter(c => c.challenge.category === 'social').length;
                stats.adventureChallenges = completedChallenges.filter(c => c.challenge.category === 'adventure').length;
                stats.creativeChallenges = completedChallenges.filter(c => c.challenge.category === 'creative').length;
                stats.dailyChallenges = completedChallenges.filter(c => c.challenge.category === 'daily').length;
            }

            const level = Math.floor(stats.totalChallenges / 5) + 1;

            const userAchievements = await PostService.getAchievements(user);
            const allAchievements = await PostService.getAllAchievements();
            const updatedAchievements = userAchievements.map(ua => {
                const achievement = allAchievements.find(a => a.id === ua.id);
                return {
                    ...achievement,
                    unlocked: !!ua
                };
            });
            const lockedAchievements = allAchievements.filter(a => !updatedAchievements.some(ua => ua.id === a.id));
            updatedAchievements.push(...lockedAchievements.map(a => ({
                ...a,
                unlocked: false
            })));
            setProfileData({
                level,
                streak,
                ...stats,
                achievements: updatedAchievements
            });

        } catch (error) {
            console.error('Error loading profile data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadProfileData();
        }, [])
    );

    const navigateToGallery = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: '/gallery',
            params: { userOnly: 'true' }
        });
    };

    const navigateBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const getNextLevelProgress = () => {
        const challengesInCurrentLevel = profileData.totalChallenges % 5;
        return (challengesInCurrentLevel / 5) * 100;
    };

    const renderAchievement = (achievement) => (
        <View 
            key={achievement.id} 
            style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementLocked
            ]}
        >
            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            <Text style={[styles.achievementName, !achievement.unlocked && styles.achievementTextLocked]}>
                {achievement.name}
            </Text>
            <Text style={[styles.achievementDescription, !achievement.unlocked && styles.achievementTextLocked]}>
                {achievement.description}
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={common_styles.container}>
                <View style={common_styles.backgroundTexture} />
                <View style={common_styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.vintageOrange} />
                    <Text style={common_styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={common_styles.container} showsVerticalScrollIndicator={false}>
            <View style={common_styles.backgroundTexture} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.profileSection}>
                <View style={styles.profilePictureContainer}>
                    {/* <Image source={{ uri: user.profilePicture }} style={styles.profilePicture} /> */}
                    <View style={styles.profilePicture}>
                        <Text style={styles.profilePictureText}>
                            {user?.email ? user.email.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                    <View style={styles.profilePictureTape} />
                </View>
                
                <Text style={styles.userName}>{user?.email || 'Wild Explorer'}</Text>
                
                <View style={styles.levelContainer}>
                    <Text style={styles.levelText}>Level {profileData.level}</Text>
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <View 
                                style={[
                                    styles.progressBarFill,
                                    { width: `${getNextLevelProgress()}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {profileData.totalChallenges % 5}/5 to next level
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Stats</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.streak}</Text>
                        <Text style={styles.statLabel}>🔥 Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.totalChallenges}</Text>
                        <Text style={styles.statLabel}>🎯 Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.socialChallenges}</Text>
                        <Text style={styles.statLabel}>🤝 Social</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.adventureChallenges}</Text>
                        <Text style={styles.statLabel}>🧭 Adventure</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.creativeChallenges}</Text>
                        <Text style={styles.statLabel}>🎨 Creative</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.dailyChallenges}</Text>
                        <Text style={styles.statLabel}>📅 Daily</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity 
                style={styles.achievementsSection}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAchievementsModal(true);
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={styles.achievementsGrid}>
                    {profileData.achievements.slice(0, 5).map(renderAchievement)}
                </View>
                {profileData.achievements.length > 5 && (
                    <View style={styles.expandButton}>
                        <Text style={styles.expandButtonText}>
                            TAP TO VIEW ALL ({profileData.achievements.length})
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
                <Modal
                    visible={showAchievementsModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowAchievementsModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Achievements</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowAchievementsModal(false);
                                }}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterContainer}>
                            <Text style={styles.filterLabel}>Filter by Difficulty:</Text>
                            <View style={styles.filterButtons}>
                                {['all', 'easy', 'medium', 'hard', 'expert'].map((difficulty) => (
                                    <TouchableOpacity
                                        key={difficulty}
                                        style={[
                                            styles.filterButton,
                                            selectedDifficulty === difficulty && styles.filterButtonActive
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedDifficulty(difficulty);
                                        }}
                                    >
                                        <Text style={[
                                            styles.filterButtonText,
                                            selectedDifficulty === difficulty && styles.filterButtonTextActive
                                        ]}>
                                            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <ScrollView 
                            style={styles.modalContent}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalAchievementsGrid}
                        >
                            {getFilteredAchievements().map(renderAchievement)}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Text style={styles.resultsCount}>
                                Showing {getFilteredAchievements().length} of {profileData.achievements.length} achievements
                            </Text>
                        </View>
                    </View>
                </Modal>

            <View style={styles.actionsSection}>  
                <TouchableOpacity style={styles.galleryButton} onPress={navigateToGallery}>
                    <Text style={styles.galleryButtonText}>🖼️ MY WALL</Text>
                    <View style={styles.galleryButtonDistress} />
                </TouchableOpacity>
                <View style={[common_styles.tapeHorizontal, styles.bottomTape]} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        fontSize: 28,
        color: colors.tan,
        fontWeight: 'bold',
    },
    headerTitle: {
        ...typography.headerLarge,
        color: colors.tan,
        fontWeight: '900',
        letterSpacing: 3,
        fontSize: 24,
    },
    headerSpacer: {
        width: 48,
    },
    
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 30,
    },
    profilePictureContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    profilePicture: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.tan,
        ...shadows.lightShadow,
    },
    profilePictureText: {
        fontSize: 36,
        color: colors.polaroidWhite,
        fontWeight: 'bold',
    },
    profilePictureTape: {
        position: 'absolute',
        top: -5,
        right: 10,
        width: 30,
        height: 15,
        backgroundColor: colors.vintageOrange,
        transform: [{ rotate: '15deg' }],
        opacity: 0.8,
    },
    userName: {
        ...typography.headerMedium,
        color: colors.tan,
        textAlign: 'center',
        fontWeight: '700',
        marginBottom: 20,
    },
    
    levelContainer: {
        alignItems: 'center',
        width: '100%',
    },
    levelText: {
        ...typography.headerSmall,
        color: colors.vintageOrange,
        fontWeight: '800',
        marginBottom: 10,
        fontSize: 18,
    },
    progressBarContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBarBackground: {
        width: '80%',
        height: 8,
        backgroundColor: colors.darkGray,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.vintageOrange,
        borderRadius: 4,
    },
    progressText: {
        ...typography.bodySmall,
        color: colors.peach,
        fontSize: 12,
    },
    
    statsSection: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    sectionTitle: {
        ...typography.headerMedium,
        color: colors.tan,
        fontWeight: '800',
        marginBottom: 15,
        textAlign: 'center',
        letterSpacing: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: colors.lightBrown,
        padding: 15,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.tan,
        width: '30%',
        alignItems: 'center',
        marginBottom: 10,
        transform: [{ rotate: '0.5deg' }],
        ...shadows.lightShadow,
    },
    statNumber: {
        ...typography.headerLarge,
        color: colors.polaroidWhite,
        fontWeight: '900',
        fontSize: 24,
    },
    statLabel: {
        ...typography.bodySmall,
        color: colors.peach,
        textAlign: 'center',
        marginTop: 5,
        fontSize: 11,
        fontWeight: '600',
    },
    
    achievementsSection: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    achievementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    achievementCard: {
        backgroundColor: colors.forestGreen,
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.oliveGreen,
        width: '48%',
        alignItems: 'center',
        marginBottom: 12,
        transform: [{ rotate: '-0.5deg' }],
        ...shadows.lightShadow,
    },
    achievementLocked: {
        backgroundColor: colors.darkGray,
        borderColor: colors.mediumGray,
        opacity: 0.6,
    },
    achievementIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    achievementName: {
        ...typography.bodyMedium,
        color: colors.polaroidWhite,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
        fontSize: 12,
    },
    achievementDescription: {
        ...typography.bodySmall,
        color: colors.peach,
        textAlign: 'center',
        fontSize: 10,
        lineHeight: 12,
    },
    achievementTextLocked: {
        color: colors.mediumGray,
    },
    
    actionsSection: {
        paddingHorizontal: 40,
        paddingBottom: 60,
        alignItems: 'center',
        position: 'relative',
    },
    galleryButton: {
        backgroundColor: colors.lightBrown,
        paddingVertical: 18,
        paddingHorizontal: 50,
        borderWidth: 3,
        borderColor: colors.tan,
        position: 'relative',
        transform: [{ rotate: '-0.5deg' }],
        ...shadows.lightShadow,
    },
    galleryButtonText: {
        ...typography.headerMedium,
        color: colors.polaroidWhite,
        textAlign: 'center',
        fontWeight: '800',
        letterSpacing: 4,
    },
    galleryButtonDistress: {
        position: 'absolute',
        top: -4,
        left: 10,
        width: 20,
        height: 3,
        backgroundColor: colors.vintageRed,
        transform: [{ rotate: '-5deg' }],
        opacity: 0.7,
    },
    bottomTape: {
        bottom: 20,
        right: 30,
        transform: [{ rotate: '12deg' }],
    },
    expandButton: {
        backgroundColor: colors.forestGreen,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.oliveGreen,
        alignSelf: 'center',
        marginTop: 15,
        transform: [{ rotate: '0.5deg' }],
        ...shadows.lightShadow,
    },
    expandButtonText: {
        ...typography.bodyMedium,
        color: colors.polaroidWhite,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 1,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666',
        fontWeight: 'bold',
    },
    filterContainer: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    filterButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f8f8f8',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    filterButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    modalAchievementsGrid: {
        paddingVertical: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#f8f8f8',
    },
    resultsCount: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});