import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Animated, 
  BackHandler 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common_styles, colors, typography } from './styles';
import { PostService } from './services/postService';

const ChallengePage = () => {
    const [pulseAnim] = useState(new Animated.Value(1));
    const [shakeAnim] = useState(new Animated.Value(0));
    const [wobbleAnim] = useState(new Animated.Value(0));
    const { challenge, category } = useLocalSearchParams();
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

    const handleCowardPress = async () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();

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
        }, 1000);
    };

    const handleCompletePress = () => {
        router.push({
            pathname: 'postchallenge',
            params: { 
                challenge, 
                category,
                completedAt: new Date().toISOString()
            }
        });
    };

    return (
        <Animated.View 
            style={[
                common_styles.container,
                { transform: [{ rotate: `${wobbleAnim._value}deg` }] }
            ]}
        >
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
                        <View style={[common_styles.cornerTear, common_styles.cornerTearTopLeft]} />
                        <View style={[common_styles.cornerTear, common_styles.cornerTearBottomRight]} />
                        
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
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={[common_styles.primaryButton, styles.completeButton]}
                    onPress={handleCompletePress}
                    activeOpacity={0.8}
                >
                    <Text style={common_styles.primaryButtonText}>MISSION COMPLETE</Text>
                </TouchableOpacity>

                <Animated.View 
                    style={[
                        styles.cowardButtonContainer,
                        { transform: [{ translateX: shakeAnim }] }
                    ]}
                >
                    <TouchableOpacity 
                        style={[common_styles.dangerButton, styles.cowardButton]}
                        onPress={handleCowardPress}
                        activeOpacity={0.7}
                    >
                        <Text style={common_styles.dangerButtonText}>RETREAT TO SAFETY</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <View style={styles.bottomAccent} />
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
        marginTop: 30,
        marginBottom: 40,
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
};

export default ChallengePage;