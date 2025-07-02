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
import * as Linking from 'expo-linking';
import { useAuth } from './contexts/AuthContext';

const ChallengePage = () => {
    const [pulseAnim] = useState(new Animated.Value(1));
    const [shakeAnim] = useState(new Animated.Value(0));
    const [wobbleAnim] = useState(new Animated.Value(0));
    const [fillAnim] = useState(new Animated.Value(0));
    const [isHolding, setIsHolding] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const holdingRef = useRef(false);
    const fillAnimationRef = useRef(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [friends, setFriends] = useState([]);

    const { challenge, finishes, category, challengeId } = useLocalSearchParams();
    const router = useRouter();
    const { user, loading, logOut } = useAuth();

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

            const result = await PostService.cowardPost(cowardData, user);
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
            const userFriends = await PostService.getFriends(user);
            console.log('Fetched friends:', userFriends);
            setFriends(userFriends);
        } catch (error) {
            console.error('Error fetching friends:', error);
            setFriends([]);
        }
        
        setShowShareModal(true);
    };

    const handleInviteFriend = async (friend) => {
        try {
            await PostService.createInvite({
                challengeId: challengeId,
                senderId: user.id,
                recipientId: friend.friend.id,
                challenge: challenge,
                category: category
            }, user);
            
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            console.log(`Invited ${friend.friend.name} to challenge`);
        } catch (error) {
            console.error('Error inviting friend:', error);
        }
    };    

    const handleCloseShareModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowShareModal(false);
    };

    const ShareModal = ({ visible, onClose, challenge, category, challengeId, onInviteFriend, friends = [] }) => {
        console.log("Got friends:", friends);
        const handleExternalShare = async () => {
            const url = Linking.createURL(`challenge/${challengeId}/Carter`);
            try {
                await Share.share({
                    message: `Join me on this WildApp challenge!\n\n"${challenge}"\n\nCategory: ${category}\n\nOpen in app: ${url}`,
                    title: 'WildApp Challenge Invitation',
                });
            } catch (error) {
                console.error('Error sharing challenge:', error);
            }
        };
    
        const handleMessagesShare = async () => {
            handleExternalShare();
        };
    
        if (!visible) return null;
    
        return (
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Share to Friends</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>
    
                    <ScrollView style={styles.friendsList} showsVerticalScrollIndicator={false}>
                        {friends.map((friend, index) => (
                            <TouchableOpacity
                                key={friend.friend.id}
                                style={styles.friendItem}
                                onPress={() => onInviteFriend(friend)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.friendAvatar}>
                                    <Text style={styles.friendInitial}>
                                        {friend.friend.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.friendName}>{friend.friend.name}</Text>
                                <View style={styles.inviteButton}>
                                    <Text style={styles.inviteButtonText}>Invite</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        
                        {friends.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No friends found</Text>
                                <Text style={styles.emptySubtext}>Add friends to invite them to challenges!</Text>
                            </View>
                        )}
                    </ScrollView>
    
                    <View style={styles.externalButtons}>
                        <TouchableOpacity
                            style={styles.externalButton}
                            onPress={handleExternalShare}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.externalButtonIcon}>📤</Text>
                            <Text style={styles.externalButtonText}>Share Outside App</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
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
                <ShareModal
                    visible={showShareModal}
                    onClose={handleCloseShareModal}
                    challenge={challenge}
                    category={category}
                    challengeId={challengeId}
                    onInviteFriend={handleInviteFriend}
                    friends={friends}
                />
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
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: colors.cream,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '80%',
        borderWidth: 2,
        borderBottomWidth: 0,
        borderColor: colors.darkBrown,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
    },
    title: {
        ...typography.headerSmall,
        color: colors.darkBrown,
        fontSize: 18,
    },
    closeButton: {
        padding: 5,
    },
    closeText: {
        fontSize: 20,
        color: colors.darkBrown,
        fontWeight: 'bold',
    },
    friendsList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.lightGray,
    },
    friendAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    friendInitial: {
        color: colors.cream,
        fontSize: 16,
        fontWeight: 'bold',
    },
    friendName: {
        flex: 1,
        ...typography.bodyMedium,
        color: colors.darkBrown,
        fontWeight: '600',
    },
    inviteButton: {
        backgroundColor: colors.forestGreen,
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 15,
    },
    inviteButtonText: {
        color: colors.cream,
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.darkBrown,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    emptySubtext: {
        ...typography.bodySmall,
        color: colors.darkBrown,
        textAlign: 'center',
        opacity: 0.7,
    },
    externalButtons: {
        gap: 12,
    },
    externalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.forestGreen,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.darkBrown,
    },
    externalButtonIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    externalButtonText: {
        color: colors.cream,
        ...typography.bodyMedium,
        fontWeight: 'bold',
    },
};

export default ChallengePage;