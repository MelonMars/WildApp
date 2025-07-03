import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from './contexts/AppContext';
import { common_styles, colors, typography, shadows } from './styles'; 
import * as Haptics from 'expo-haptics';
import { PostService } from './services/postService';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from './contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter(); 

    useEffect(() => {
        if (!user && !loading) {
          router.replace('/authentication');
        }
    }, [user, loading, router]);

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

    return <HomeContent user={user} />;
}

function HomeContent({ user }) {
    const router = useRouter();
    const { isPreloading, preloadComplete } = useApp();
    const [challenges, setChallenges] = useState(null);
    const [loadingTodaysChallenge, setLoadingTodaysChallenge] = useState(true);
    const [todaysChallenge, setTodaysChallenge] = useState(null);
    const [streak, setStreak] = useState(0);
    const [needStreak, setNeedStreak] = useState(false);
    const [usersPosts, setUsersPosts] = useState(null);
    const [userCompletedChallenges, setUserCompletedChallenges] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [locationPermission, setLocationPermission] = useState(null);
    const [challengeInvites, setChallengeInvites] = useState(0);
    const [friendRequests, setFriendRequests] = useState(0);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');

            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
            }
        } catch (error) {
            console.error('Error requesting location permission:', error);
            setLocationPermission(false);
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance;
    };

    const getStreak = async () => {
        try {
            const streak = await PostService.getStreak(user);
            if (streak !== null) {
                setStreak(streak);
            } else {
                setStreak(0);
            }
            
            const streakLastUpdated = await PostService.getStreakLastUpdated(user);
            
            if (streakLastUpdated) {
                const today = new Date();
                const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
                
                let lastUpdatedStr;
                if (typeof streakLastUpdated === 'string') {
                    lastUpdatedStr = streakLastUpdated.split('T')[0];
                } else {
                    const date = new Date(streakLastUpdated);
                    lastUpdatedStr = date.getFullYear() + '-' + 
                        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(date.getDate()).padStart(2, '0');
                }
                
                const todayDate = new Date(todayStr);
                const lastDate = new Date(lastUpdatedStr);
                const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
                
                console.log('Today:', todayStr, 'Last Updated:', lastUpdatedStr, 'Days Diff:', daysDiff);
                
                if (daysDiff === 0) {
                    setNeedStreak(false);
                } else if (daysDiff === 1) {
                    setNeedStreak(true);
                } else if (daysDiff > 1) {
                    console.log('Streak expired, resetting to 0');
                    setStreak(0);
                    await PostService.updateStreak(user, 0);
                    setNeedStreak(true);
                }
            } else {
                setNeedStreak(true);
            }
        } catch (error) {
            console.error('Error fetching streak:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            getStreak();
        }, [user])
    );
  
    useFocusEffect(
        useCallback(() => {
            const fetchUsersPosts = async () => {
                try {
                    const posts = await PostService.getUsersPosts(user);
                    if (posts) {
                        setUsersPosts(posts);
                        const completedChallenges = posts.filter(post => post.challenge);
                        setUserCompletedChallenges(completedChallenges);
                    } 
                }
                catch (error) {
                    console.error('Error fetching user posts:', error);
                }
            };
            fetchUsersPosts();
        }, [user])
    );

    useEffect(() => {
        const fetchChallenges = async () => {
            try {
                const challengesData = await PostService.fetchChallenges();
                setChallenges(challengesData);
            } catch (error) {
                console.error('Error fetching challenges:', error);
            }
        };

        if (preloadComplete && !challenges) {
            fetchChallenges();
        }
    }, [isPreloading, preloadComplete, challenges]);
    
    useEffect(() => {
        requestLocationPermission(); 
    }, []);

    useEffect(() => {
        const fetchTodaysChallenge = async () => {
            setLoadingTodaysChallenge(true);
            try {
                const challenge = await PostService.getTodaysChallenge();
                console.log('Fetched today\'s challenge:', challenge);
                setTodaysChallenge(challenge);
            } catch (error) {
                console.log('Error fetching today\'s challenge:', error);
            } finally {
                setLoadingTodaysChallenge(false);
            }
        };

        fetchTodaysChallenge();
    }, []);

    useEffect(() => {
        const fetchChallengeInvites = async () => {
            try {
                const invites = await PostService.getUserInvitations(user.id);
                setChallengeInvites(invites.length);
            } catch (error) {
                console.error('Error fetching challenge invites:', error);
            }
        };

        if (user) {
            fetchChallengeInvites();
        }
    }, [user]);

    useEffect(() => {
        const fetchFriendRequests = async () => {
            try {
                const requests = await PostService.getPendingFriendRequests(user);
                setFriendRequests(requests.length);
            } catch (error) {
                console.error('Error fetching friend requests:', error);
            }
        };

        if (user) {
            fetchFriendRequests();
        }
    }, [user]);

    const fetchChallenge = (type) => {
        if (!challenges || !challenges[type]) return null;
        
        const completedNames = userCompletedChallenges.map(post => post.challenge?.name);
        let availableChallenges = challenges[type].filter(
            challenge => !completedNames.includes(challenge.name)
        );
        
        if (!userLocation || locationPermission !== true) {
            availableChallenges = availableChallenges.filter(challenge => !challenge.local);
        } else {
            availableChallenges = availableChallenges.filter(challenge => {
                if (!challenge.local) return true;
                
                const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    challenge.latitude,
                    challenge.longitude
                );
                return distance <= 50;
            });
        }

        const challengeList = availableChallenges.length > 0 ? availableChallenges : 
        challenges[type].filter(challenge => !challenge.local);

        if (challengeList.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * challengeList.length);
        return challengeList[randomIndex];
    };

    const navigateToPage1 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Page 1');
        const challenge = fetchChallenge('social');
        console.log('Fetched challenge:', challenge);
        router.push({
            pathname: '/challenge',
            params: { challenge: challenge.name, finishes: challenge.finishes, category: 'social', challengeId: challenge.id }
        });
    };

    const navigateToPage2 = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Page 2');
        const challenge = fetchChallenge('adventure');
        router.push({
            pathname: '/challenge', 
            params: { challenge: challenge.name, finishes: challenge.finishes, category: 'adventure', challengeId: challenge.id }
        });
    };

    const navigateToPage3 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Page 3');
        const challenge = fetchChallenge('creative');
        router.push({
            pathname: '/challenge', 
            params: { challenge: challenge.name, finishes: challenge.finishes, category: 'creative', challengeId: challenge.id }
        });
    };

    const navigateToGallery = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Gallery');
        router.push('/gallery');
    };

    const handleCreateChallenge = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Create Challenge');
        router.push('/createchallenge');
    }

    const navigateToMap = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Map');
        router.push('/map');
    };

    const navigateToProfile = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Profile');
        router.push({
            pathname: '/profile',
            params: {  streak: streak, usersPosts: JSON.stringify(usersPosts), userCompletedChallenges: userCompletedChallenges }
        });
    };

    const navigateToInvite = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Invite');
        router.push('/invite');
    }

    const handleTodaysChallenge = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: '/challenge',
            params: { challenge: todaysChallenge.name, finishes: todaysChallenge.finishes, category: 'daily' }
        });
    }

    return (
        <View style={common_styles.container}>
            <View style={common_styles.backgroundTexture} />
                <View style={styles.titleContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>     Wild</Text>
                        <View style={styles.iconContainer}>
                            {usersPosts && (
                                <TouchableOpacity
                                    onPress={navigateToProfile}
                                    style={styles.iconButton}
                                    accessibilityLabel="Profile"
                                >
                                    <Text style={styles.iconText}>👤</Text>
                                    {friendRequests > 0 && (
                                        <View style={styles.notificationBadge}>
                                            <Text style={styles.badgeText}>
                                                {friendRequests}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={navigateToInvite}
                                style={styles.iconButton}
                                accessibilityLabel="Invite Friends"
                            >
                                <Text style={styles.iconText}>📩</Text>
                                {challengeInvites > 0 && (
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.badgeText}>
                                            {challengeInvites}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.titleAccent} />
                    <Text style={styles.subtitle}>Time to live.</Text>
                    
                    {isPreloading && (
                        <View style={styles.preloadingContainer}>
                            <ActivityIndicator size="small" color={colors.lightBrown} />
                            <Text style={styles.preloadingText}>Loading gallery...</Text>
                        </View>
                    )}
                </View>
            <View style={styles.todaysChallengeRow}>
                <TouchableOpacity style={styles.todaysChallengeButton} onPress={handleTodaysChallenge}>
                    {!loadingTodaysChallenge ? (
                        <Text style={[common_styles.secondaryButtonText, styles.challengeButtonText]} numberOfLines={1}>
                            {todaysChallenge?.name || 'No challenge today'}
                        </Text>
                    ) : (
                        <ActivityIndicator size="small" color={colors.polaroidWhite} />
                    )}
                </TouchableOpacity>
                <Text style={styles.streakCounter}>
                    {streak} {needStreak ? '⌛' : '🔥'}
                </Text>
            </View>
            <View style={styles.middleButtonsContainer}>
                <TouchableOpacity
                    style={styles.categoryButton}
                    onPress={navigateToPage1}
                    disabled={!challenges || Object.keys(challenges).length === 0}
                >
                    {!challenges || Object.keys(challenges).length === 0 ? (
                        <ActivityIndicator size="small" color={colors.polaroidWhite} />
                    ) : (
                        <Text style={styles.categoryButtonText}>🤝SOCIAL</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.categoryButton, styles.categoryButtonMiddle]}
                    onPress={navigateToPage2}
                    disabled={!challenges || Object.keys(challenges).length === 0}
                >
                    {!challenges || Object.keys(challenges).length === 0 ? (
                        <ActivityIndicator size="small" color={colors.polaroidWhite} />
                    ) : (
                        <Text style={styles.categoryButtonText}>🧭ADVENTURE</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.categoryButton}
                    onPress={navigateToPage3}
                    disabled={!challenges || Object.keys(challenges).length === 0}
                >
                    {!challenges || Object.keys(challenges).length === 0 ? (
                        <ActivityIndicator size="small" color={colors.polaroidWhite} />
                    ) : (
                        <Text style={styles.categoryButtonText}>🎨CREATIVE</Text>
                    )}
                </TouchableOpacity>
            </View>
            <View style={styles.bottomButtonContainer}>
                <TouchableOpacity 
                    style={[
                        styles.galleryButton,
                        isPreloading && styles.galleryButtonLoading
                    ]} 
                    onPress={navigateToGallery}
                    disabled={isPreloading}
                >
                    <Text style={styles.galleryButtonText}>
                        {isPreloading ? 'LOADING...' : '🖼️ THE WALL'}
                    </Text>
                    {isPreloading && (
                        <ActivityIndicator 
                            size="small" 
                            color={colors.polaroidWhite}
                            style={styles.buttonSpinner}
                        />
                    )}
                    <View style={styles.galleryButtonDistress} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', marginTop: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <TouchableOpacity 
                        style={[common_styles.primaryButton, { marginTop: 0 }]} 
                        onPress={handleCreateChallenge}>
                        <Text style={common_styles.primaryButtonText}>✏️ New Challenge</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.circleButton, { marginTop: 0 }]}
                        onPress={navigateToMap}>
                        <Text style={{ fontSize: 32 }}>🌎</Text>
                    </TouchableOpacity>
                </View>
                <View style={[common_styles.tapeHorizontal, styles.bottomTape]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },    
    title: {
        ...typography.headerLarge,
        fontSize: 48,
        color: colors.tan,
        fontWeight: '900',
        letterSpacing: 8,
        textAlign: 'center',
        textShadowColor: colors.deepShadow,
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 0,
        transform: [{ rotate: '-1deg' }],
    }, 
    titleAccent: {
        width: 120,
        height: 4,
        backgroundColor: colors.vintageOrange,
        marginTop: 8,
        transform: [{ rotate: '1deg' }],
        opacity: 0.8,
    },
    subtitle: {
        ...typography.bodyLarge,
        color: colors.peach,
        fontWeight: '600',
        letterSpacing: 3,
        marginTop: 15,
        fontStyle: 'italic',
        transform: [{ rotate: '0.5deg' }],
    },
    preloadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: `${colors.lightBrown}40`,
        borderWidth: 1,
        borderColor: colors.tan,
        transform: [{ rotate: '-0.5deg' }],
    },
    preloadingText: {
        ...typography.bodySmall,
        color: colors.tan,
        marginLeft: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    
    middleButtonsContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 10,
        flexDirection: 'row',
        gap: 15,
    },

    categoryButton: {
        ...common_styles.primaryButton,
        backgroundColor: colors.forestGreen,
        paddingVertical: 20,
        paddingHorizontal: 2,
        borderWidth: 3,
        borderColor: colors.oliveGreen,
        position: 'relative',
        transform: [{ rotate: '0.5deg' }],
        flex: 1,
        minWidth: 115,
        height: 60,
    },
    
    categoryButtonMiddle: {
        transform: [{ rotate: '-1deg' }],
        backgroundColor: colors.oliveGreen,
        borderColor: colors.mossGreen,
    },
    
    categoryButtonText: {
        ...typography.headerSmall,
        color: colors.polaroidWhite,
        textAlign: 'center',
        fontWeight: '900',
        letterSpacing: 1,
        fontSize: 12,
    },
    
    categoryAccent: {
        position: 'absolute',
        bottom: -3,
        right: 15,
        width: 15,
        height: 15,
        backgroundColor: colors.vintageOrange,
        transform: [{ rotate: '45deg' }],
    },
    
    bottomButtonContainer: {
        paddingHorizontal: 40,
        paddingBottom: 60,
        alignItems: 'center',
        position: 'relative',
    },
    
    galleryButton: {
        backgroundColor: colors.lightBrown,
        paddingVertical: 9,
        paddingHorizontal: 50,
        borderWidth: 3,
        borderColor: colors.tan,
        position: 'relative',
        transform: [{ rotate: '-0.5deg' }],
        ...shadows.lightShadow,
    },    
    galleryButtonLoading: {
        backgroundColor: colors.darkGray,
        borderColor: colors.mediumGray,
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
    buttonSpinner: {
        position: 'absolute',
        right: 15,
        top: '50%',
        marginTop: -10,
    },
    bottomTape: {
        bottom: 20,
        right: 30,
        transform: [{ rotate: '12deg' }],
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
    todaysChallengeButton: {
        ...common_styles.secondaryButton,
        marginBottom: 20,
        marginTop: -15,
        width: '80%',
        alignSelf: 'center',
    },
    todaysChallengeRow: {
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    todaysChallengeButton: {
        ...common_styles.secondaryButton,
        marginBottom: 0,
        marginTop: 0,
        flex: 1,
        marginRight: 12,
        minWidth: 0,
        paddingHorizontal: 12,
    },
    challengeButtonText: {
        flexShrink: 1,
    },
    streakCounter: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.vintageOrange,
        letterSpacing: 1,
        flexShrink: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 8,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        padding: 4,
        position: 'relative',
    },
    iconText: {
        fontSize: 24,
    },    
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: 'red',
        borderRadius: 10,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },    
    middleButtonsContainer: {
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingVertical: 20,
        gap: 15,
    },    
    categoryButton: {
        ...common_styles.primaryButton,
        backgroundColor: colors.forestGreen,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderWidth: 3,
        borderColor: colors.oliveGreen,
        position: 'relative',
        transform: [{ rotate: '0.5deg' }],
        width: '100%',
        height: 55,
    },    
    categoryButtonMiddle: {
        transform: [{ rotate: '-1deg' }],
        backgroundColor: colors.oliveGreen,
        borderColor: colors.mossGreen,
    },
});