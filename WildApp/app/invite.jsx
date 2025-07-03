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
  ActivityIndicator,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common_styles, colors, typography, shadows } from './styles';
import { PostService } from './services/postService';
import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';
import { useAuth } from './contexts/AuthContext';
import * as Linking from 'expo-linking';

const InvitationsPage = () => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedInvitation, setSelectedInvitation] = useState(null);
    const [showInvitationModal, setShowInvitationModal] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [actionType, setActionType] = useState(null);
    
    const [pulseAnim] = useState(new Animated.Value(1));
    const [shakeAnim] = useState(new Animated.Value(0));
    const [fillAnim] = useState(new Animated.Value(0));
    const [isHolding, setIsHolding] = useState(false);
    const holdingRef = useRef(false);
    const fillAnimationRef = useRef(null);
    
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetchInvitations = async () => {
            try {
                setLoading(true);
                const userInvitations = await PostService.getUserInvitations(user.id);
                setInvitations(userInvitations);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching invitations:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchInvitations();
        }
    }, [user?.id]);

    const openInvitationModal = async (invitation) => {
        console.log("Opening invitation modal for:", invitation);
        try {
            const challengeData = await PostService.getChallengeById(invitation.challenge_id);
            const inviteData = await PostService.getInviteData(invitation.id);
            
            const allParticipants = [
                ...(inviteData.participants || []),
                ...(inviteData.pending_participants || [])
            ];
            
            const participantProfiles = await Promise.all(
                allParticipants.map(async (participantId) => {
                    const profile = await PostService.getUserInfo(participantId);
                    return profile;
                })
            );
            
            const participantsWithStatus = participantProfiles.map(profile => ({
                ...profile,
                isInviter: profile.id === inviteData.sender,
                isPending: inviteData.pending_participants?.includes(profile.id),
                profilePicture: profile.avatar_url
            }));

            setSelectedInvitation({
                ...invitation,
                challengeData,
                participants: participantsWithStatus
            });
            setShowInvitationModal(true);
        } catch (error) {
            console.error('Error loading invitation details:', error);
        }
    };

    const handleAcceptInvitation = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            await PostService.acceptInvite(selectedInvitation.challenge_id, user.id);
            
            setInvitations(prev => prev.filter(inv => inv.id !== selectedInvitation.id));
            setShowInvitationModal(false);
            
            const username = await PostService.getName(user) || 'anonymous';
            router.push(`/challenge/${selectedInvitation.id}/${username}`);

        } catch (error) {
            console.error('Error accepting invitation:', error);
        }
    };

    const handleDeclinePressIn = () => {
        setIsHolding(true);
        holdingRef.current = true;
        setActionType('decline');
         
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
            if (finished && holdingRef.current) {
                setShowConfirmation(true);
                setIsHolding(false);
                holdingRef.current = false;
            }
        });
    };

    const handleDeclinePressOut = () => {
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

    const handleConfirmDecline = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setShowConfirmation(false);
        
        try {
            await PostService.declineInvite(selectedInvitation.challenge_id, user.id);
            
            setInvitations(prev => prev.filter(inv => inv.id !== selectedInvitation.id));
            setShowInvitationModal(false);
            
            const cowardData = {
                challenge: selectedInvitation.challengeData.name,
                username: user.username || 'anonymous',
                challengeId: selectedInvitation.challenge_id,
            };

            await PostService.cowardPost(cowardData);
        } catch (error) {
            console.error('Error declining invitation:', error);
        }
    };

    const handleCancelDecline = () => {
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

    const renderInvitationCard = (invitation) => (
        <TouchableOpacity
            key={invitation.id}
            style={styles.invitationCard}
            onPress={() => openInvitationModal(invitation)}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardCategory}>{invitation.category?.toUpperCase()}</Text>
                <Text style={styles.cardDate}>
                    {new Date(invitation.created_at).toLocaleDateString()}
                </Text>
            </View>
            <Text style={styles.cardTitle}>{invitation.challengeName}</Text>
            <Text style={styles.cardInviter}>From: {invitation.sender_profile.name}</Text>
            <View style={styles.cardFooter}>
                <Text style={styles.cardParticipants}>
                    👥 {invitation.pending_participants?.length || 0} participants
                </Text>
                <Text style={styles.cardStatus}>PENDING</Text>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.cardParticipants}>
                    {invitation.participants?.length || 0} joined
                </Text>
            </View>
        </TouchableOpacity>
    );

    useEffect(() => {
        if (showInvitationModal) {
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
        }
    }, [showInvitationModal]);

    const fillHeight = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    if (loading) {
        return (
            <View style={[common_styles.container, styles.loadingContainer]}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                <ActivityIndicator size="large" color={colors.forestGreen} />
                <Text style={styles.loadingText}>Loading invitations...</Text>
            </View>
        );
    }

    return (
        <View style={common_styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📬 MISSION INVITATIONS</Text>
                <Text style={styles.headerSubtitle}>
                    {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
                </Text>
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {invitations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyTitle}>No Invitations</Text>
                        <Text style={styles.emptySubtitle}>
                            You don't have any pending challenge invitations.
                        </Text>
                    </View>
                ) : (
                    invitations.map(invitation => renderInvitationCard(invitation))
                )}
            </ScrollView>

            <Modal
                visible={showInvitationModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowInvitationModal(false)}
            >
                {selectedInvitation && (
                    <View style={common_styles.container}>
                        <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                        
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowInvitationModal(false)}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>INVITATION DETAILS</Text>
                        </View>

                        <ScrollView>
                            <View style={common_styles.backgroundTexture} />
                            
                            <View style={styles.paperOverlay} />
                            
                            <View style={styles.modalChallengeHeader}>
                                <View style={common_styles.categoryBadge}>
                                    <Text style={common_styles.categoryBadgeText}>
                                        {selectedInvitation.challengeData.category.toUpperCase()}
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
                                <Text style={styles.participantsTitle}>
                                    BRAVE EXPLORERS ({selectedInvitation.participants.length})
                                </Text>
                                <View style={styles.participantsContainer}>
                                    {selectedInvitation.participants.map((participant, index) => (
                                        <View key={participant.id} style={[styles.participantAvatar, { zIndex: selectedInvitation.participants.length - index }]}>
                                            {participant.profilePicture ? (
                                                <Image source={{ uri: participant.profilePicture }} style={styles.avatarImage} />
                                            ) : (
                                                <View style={styles.avatarPlaceholder}>
                                                    <Text style={styles.avatarInitial}>
                                                        {(participant.name?.charAt(0).toUpperCase() ?? participant.username?.charAt(0).toUpperCase()) || 'A'}
                                                    </Text>
                                                </View>
                                            )}
                                            {participant.isInviter && (
                                                <View style={styles.inviterBadge}>
                                                    <Text style={styles.inviterBadgeText}>👑</Text>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                                <Text style={styles.participantsSubtext}>
                                    Join your team on this epic adventure!
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
                                                {selectedInvitation.challengeData.name}
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
                                        JOIN {selectedInvitation.challengeData.finishes || 0} COMPLETED EXPEDITIONS
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={styles.modalButtonContainer}>
                                <TouchableOpacity 
                                    style={[common_styles.primaryButton, styles.acceptButton]}
                                    onPress={handleAcceptInvitation}
                                    activeOpacity={0.8}
                                >
                                    <Text style={common_styles.primaryButtonText}>🚀 ACCEPT MISSION</Text>
                                </TouchableOpacity>

                                <Animated.View 
                                    style={[
                                        styles.declineButtonContainer,
                                        { transform: [{ translateX: shakeAnim }] }
                                    ]}
                                >
                                    <TouchableOpacity 
                                        style={[common_styles.dangerButton, styles.declineButton]}
                                        onPressIn={handleDeclinePressIn}
                                        onPressOut={handleDeclinePressOut}
                                        activeOpacity={0.7}
                                    >
                                        <Animated.View 
                                            style={[
                                                styles.buttonFill,
                                                { height: fillHeight }
                                            ]}
                                        />
                                        <Text style={[common_styles.dangerButtonText, styles.declineButtonText]}>
                                            {isHolding ? '🐔 HOLD TO DECLINE...' : '🐔 DECLINE INVITATION'}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </ScrollView>
                    </View>
                )}
            </Modal>

            {showConfirmation && (
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmationModal}>
                        <Text style={styles.confirmationTitle}>⚠️ DECLINE INVITATION</Text>
                        <Text style={styles.confirmationMessage}>
                            Are you sure you want to decline this invitation?
                            {'\n\n'}
                            This action cannot be undone.
                        </Text>
                        <View style={styles.confirmationButtons}>
                            <TouchableOpacity 
                                style={[common_styles.primaryButton, styles.cancelButton]}
                                onPress={handleCancelDecline}
                            >
                                <Text style={common_styles.primaryButtonText}>🛡️ KEEP INVITATION</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[common_styles.dangerButton, styles.confirmButton]}
                                onPress={handleConfirmDecline}
                            >
                                <Text style={common_styles.dangerButtonText}>🏃 CONFIRM DECLINE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
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
    header: {
        paddingTop: 60,
        paddingHorizontal: 30,
        paddingBottom: 20,
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.headerLarge,
        color: colors.darkBrown,
        marginBottom: 8,
    },
    headerSubtitle: {
        ...typography.bodyMedium,
        color: colors.tan,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    invitationCard: {
        backgroundColor: colors.cream,
        marginBottom: 15,
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.lightGray,
        ...shadows.lightShadow,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardCategory: {
        ...typography.label,
        color: colors.forestGreen,
        fontSize: 12,
    },
    cardDate: {
        ...typography.bodySmall,
        color: colors.tan,
    },
    cardTitle: {
        ...typography.headerSmall,
        color: colors.darkBrown,
        marginBottom: 8,
    },
    cardInviter: {
        ...typography.bodyMedium,
        color: colors.darkBrown,
        marginBottom: 15,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardParticipants: {
        ...typography.bodySmall,
        color: colors.tan,
    },
    cardStatus: {
        ...typography.label,
        color: colors.vintageOrange,
        fontSize: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    emptyTitle: {
        ...typography.headerSmall,
        color: colors.darkBrown,
        marginBottom: 10,
    },
    emptySubtitle: {
        ...typography.bodyMedium,
        color: colors.tan,
        textAlign: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: colors.darkBrown,
    },
    modalTitle: {
        ...typography.headerSmall,
        color: colors.darkBrown,
        flex: 1,
        textAlign: 'center',
        marginRight: 40,
    },
    modalButtonContainer: {
        paddingHorizontal: 30,
        paddingBottom: 50,
        gap: 25,
    },
    acceptButton: {
        paddingVertical: 20,
    },
    declineButtonContainer: {
        alignSelf: 'center',
    },
    declineButton: {
        paddingVertical: 16,
    },
    declineButtonText: {
        zIndex: 1,
        position: 'relative',
    },
    buttonFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 116, 16, 0.3)',
        borderRadius: 8,
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
};

export default InvitationsPage;