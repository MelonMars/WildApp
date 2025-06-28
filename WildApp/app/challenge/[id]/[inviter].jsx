import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Animated, 
  BackHandler,
  Vibration,
  ScrollView,
  Image,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common_styles, colors, typography, shadows } from '../../styles';
import { PostService } from '../../services/postService';
import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';

const InvitePage = () => {
    const [pulseAnim] = useState(new Animated.Value(1));
    const [shakeAnim] = useState(new Animated.Value(0));
    const [wobbleAnim] = useState(new Animated.Value(0));
    const [fillAnim] = useState(new Animated.Value(0));
    const [isHolding, setIsHolding] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [challengeData, setChallengeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [participants, setParticipants] = useState([]);
    
    const holdingRef = useRef(false);
    const fillAnimationRef = useRef(null);
    const { id: challengeId, inviter } = useLocalSearchParams();
    console.log('Challenge ID:', challengeId);
    console.log('Inviter:', inviter);
    const router = useRouter();

    useEffect(() => {
        const fetchChallengeData = async () => {
            try {
                setLoading(true);
                const data = await PostService.getChallengeById(challengeId);
                setChallengeData(data);
                
                setParticipants([
                    {
                        id: 1,
                        username: inviter || 'adventure_seeker',
                        profilePicture: null,
                        isInviter: true
                    }
                ]);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching challenge:', err);
            } finally {
                setLoading(false);
            }
        };

        if (challengeId) {
            fetchChallengeData();
        }
    }, [challengeId, inviter]);

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
                challenge: challengeData.name,
                username: await AsyncStorage.getItem('username') || 'anonymous',
                challengeId: challengeId,
            };

            const result = await PostService.cowardPost(cowardData);
            console.log('Coward post created:', result);
        } catch (error) {
            console.error('Error creating coward post:', error);
        }

        setTimeout(() => {
            router.push(
                { pathname: 'coward', params: { challenge: challengeData.name, category: challengeData.category } }
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

    const handleJoinChallenge = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: 'postchallenge',
            params: { 
                challenge: challengeData.name, 
                category: challengeData.category,
                challengeId: challengeId,
                isGroupChallenge: true,
                participants: JSON.stringify(participants),
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
                message: `Join me on this WildApp challenge!\n\n"${challengeData.name}"\n\nCategory: ${challengeData.category}\n\nOpen in app: wildapp://challenge/${challengeId}`,
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
            params: { challenge: challengeData.name, category: challengeData.category }
        })
    };

    const renderParticipantAvatar = (participant, index) => (
        <View key={participant.id} style={[styles.participantAvatar, { zIndex: participants.length - index }]}>
            {participant.profilePicture ? (
                <Image source={{ uri: participant.profilePicture }} style={styles.avatarImage} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                        {participant.username.charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
            {participant.isInviter && (
                <View style={styles.inviterBadge}>
                    <Text style={styles.inviterBadgeText}>👑</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[common_styles.container, styles.loadingContainer]}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                <ActivityIndicator size="large" color={colors.forestGreen} />
                <Text style={styles.loadingText}>Loading challenge...</Text>
            </View>
        );
    }

    if (error || !challengeData) {
        return (
            <View style={[common_styles.container, styles.errorContainer]}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                <Text style={styles.errorText}>❌ Challenge not found</Text>
                <TouchableOpacity 
                    style={common_styles.primaryButton} 
                    onPress={() => router.back()}
                >
                    <Text style={common_styles.primaryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                            {challengeData.category.toUpperCase()}
                        </Text>
                    </View>
                    <View style={[common_styles.headerLine, styles.headerAccent]} />
                    <Text style={styles.missionLabel}>GROUP MISSION</Text>
                </View>

                <View style={styles.invitationBanner}>
                    <Text style={styles.invitationTitle}>🎯 CHALLENGE INVITATION</Text>
                    <Text style={styles.invitationText}>
                        You've been invited to join this adventure!
                    </Text>
                </View>

                <View style={styles.participantsSection}>
                    <Text style={styles.participantsTitle}>BRAVE EXPLORERS ({participants.length})</Text>
                    <View style={styles.participantsContainer}>
                        {participants.map((participant, index) => renderParticipantAvatar(participant, index))}
                        <TouchableOpacity
                            style={styles.addParticipantButton}
                            onPress={handleShareChallenge}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.addParticipantText}>+</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.participantsSubtext}>
                        Invite more friends to join this group challenge!
                    </Text>
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
                                        GROUP ADVENTURE
                                    </Text>
                                    <Text style={common_styles.photoPlaceholderSubtext}>
                                        together we explore
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={common_styles.captionArea}>
                                <Text style={styles.challengeLabel}>MISSION BRIEFING:</Text>
                                <Text style={[common_styles.challengeText, styles.challengeContent]}>
                                    {challengeData.name}
                                </Text>
                            </View>
                            
                            <View style={common_styles.polaroidFooter}>
                                <Text style={common_styles.usernameStamp}>TEAM EXPLORER</Text>
                                <Text style={common_styles.dateStamp}>
                                    {new Date().toLocaleDateString()}
                                </Text>
                            </View>
                        </Animated.View>
                    </View>

                    <View style={styles.warningContainer}>
                        <Text style={styles.warningText}>
                            THE WILD CALLS TO YOUR TEAM.{'\n'}
                            UNITE AND CONQUER TOGETHER!
                        </Text> 
                        <Text style={[styles.warningText, { transform: [{ rotate: '0deg' }] }]}>
                            JOIN {challengeData.finishes || 0} COMPLETED EXPEDITIONS
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                    <TouchableOpacity 
                        style={[common_styles.secondaryButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 'auto', alignSelf: 'center', paddingHorizontal: 16 }]}
                        onPress={handleShareChallenge}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 22, marginRight: 8 }}>👥</Text>
                        <Text style={common_styles.secondaryButtonText}>INVITE MORE FRIENDS</Text>
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
                        onPress={handleJoinChallenge}
                        activeOpacity={0.8}
                    >
                        <Text style={common_styles.primaryButtonText}>🚀 JOIN THE MISSION</Text>
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
                                {isHolding ? '🐔 HOLD TO DECLINE...' : '🐔 DECLINE INVITATION'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                <View style={styles.bottomAccent} />

                {showConfirmation && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.confirmationModal}>
                            <Text style={styles.confirmationTitle}>⚠️ DECLINE INVITATION</Text>
                            <Text style={styles.confirmationMessage}>
                                Are you sure you want to decline this group challenge invitation?
                                {'\n\n'}
                                Your team is counting on you! This action will mark you as unavailable for this mission.
                            </Text>
                            <View style={styles.confirmationButtons}>
                                <TouchableOpacity 
                                    style={[common_styles.primaryButton, styles.cancelButton]}
                                    onPress={handleCancelRetreat}
                                >
                                    <Text style={common_styles.primaryButtonText}>🛡️ STAY WITH TEAM</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[common_styles.dangerButton, styles.confirmButton]}
                                    onPress={handleConfirmRetreat}
                                >
                                    <Text style={common_styles.dangerButtonText}>🏃 CONFIRM DECLINE</Text>
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
    invitationBanner: {
        backgroundColor: 'rgba(34, 139, 34, 0.1)',
        marginHorizontal: 20,
        marginBottom: 15,
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.forestGreen,
        alignItems: 'center',
    },
    invitationTitle: {
        ...typography.headerSmall,
        color: colors.forestGreen,
        marginBottom: 8,
        textAlign: 'center',
    },
    invitationText: {
        ...typography.bodyMedium,
        color: colors.darkBrown,
        textAlign: 'center',
    },
    participantsSection: {
        marginHorizontal: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    participantsTitle: {
        ...typography.label,
        color: colors.darkBrown,
        marginBottom: 15,
        letterSpacing: 2,
    },
    participantsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    participantAvatar: {
        marginLeft: -10,
        borderWidth: 3,
        borderColor: colors.cream,
        borderRadius: 25,
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: colors.cream,
        fontSize: 20,
        fontWeight: 'bold',
    },
    inviterBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 20,
        height: 20,
        backgroundColor: colors.vintageOrange,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.cream,
    },
    inviterBadgeText: {
        fontSize: 12,
    },
    addParticipantButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(34, 139, 34, 0.3)',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    addParticipantText: {
        fontSize: 24,
        color: colors.forestGreen,
        fontWeight: 'bold',
    },
    participantsSubtext: {
        ...typography.bodySmall,
        color: colors.darkBrown,
        textAlign: 'center',
        fontStyle: 'italic',
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
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.bodyMedium,
        color: colors.darkBrown,
        marginTop: 20,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    errorText: {
        ...typography.headerSmall,
        color: colors.darkBrown,
        textAlign: 'center',
        marginBottom: 30,
    },
};

export default InvitePage;