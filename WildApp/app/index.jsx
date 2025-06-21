import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from './contexts/AppContext';
import { common_styles, colors, typography, shadows } from './styles'; 
import * as Haptics from 'expo-haptics';
import { PostService } from './services/postService';

export default function Home() {
    const router = useRouter();
    const { isPreloading, preloadComplete } = useApp();
    const [challenges, setChallenges] = React.useState(null);

    useEffect(() => {
        const fetchChallenges = async () => {
            try {
                const challengesData = await PostService.fetchChallenges();
                setChallenges(challengesData);
            } catch (error) {
                console.error('Error fetching challenges:', error);
            }
        };

        if (isPreloading) {
            fetchChallenges();
        }
    }, [isPreloading, preloadComplete]);

    const fetchChallenge = (type) => {
        const challengeList = challenges[type];
        const randomIndex = Math.floor(Math.random() * challengeList.length);
        const randomChallenge = challengeList[randomIndex];
        return randomChallenge;
    }

    const navigateToPage1 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Page 1');
        const challenge = fetchChallenge('social');
        router.push({
            pathname: '/challenge', 
            params: { challenge: challenge, category: 'social' }
        });
    };

    const navigateToPage2 = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Page 2');
        const challenge = fetchChallenge('adventure');
        router.push({
            pathname: '/challenge', 
            params: { challenge: challenge, category: 'adventure' }
        });
    };

    const navigateToPage3 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Navigate to Page 3');
        const challenge = fetchChallenge('creative');
        router.push({
            pathname: '/challenge', 
            params: { challenge: challenge, category: 'creative' }
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

    return (
      <View style={common_styles.container}>
          <View style={common_styles.backgroundTexture} />
          <View style={styles.titleContainer}>
              <Text style={styles.title}>Wild</Text>
              <View style={styles.titleAccent} />
              <Text style={styles.subtitle}>Time to live.</Text>
              
              {isPreloading && (
                  <View style={styles.preloadingContainer}>
                      <ActivityIndicator size="small" color={colors.lightBrown} />
                      <Text style={styles.preloadingText}>Loading gallery...</Text>
                  </View>
              )}
          </View>

          <View style={styles.middleButtonsContainer}>
              <TouchableOpacity style={styles.categoryButton} onPress={navigateToPage1}>
                  <Text style={styles.categoryButtonText}>SOCIAL</Text>
                  <View style={styles.categoryAccent} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.categoryButton, styles.categoryButtonMiddle]} onPress={navigateToPage2}>
                  <Text style={styles.categoryButtonText}>ADVENTURE</Text>
                  <View style={styles.categoryAccent} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.categoryButton} onPress={navigateToPage3}>
                  <Text style={styles.categoryButtonText}>CREATIVE</Text>
                  <View style={styles.categoryAccent} />
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
                      {isPreloading ? 'LOADING...' : 'THE WALL'}
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
                <TouchableOpacity 
                    style={[common_styles.primaryButton, {'marginTop': 20}]} 
                    onPress={handleCreateChallenge}>
                    <Text style={common_styles.primaryButtonText}>New Challenge</Text>
                </TouchableOpacity>
              <View style={[common_styles.tapeHorizontal, styles.bottomTape]} />
          </View>
      </View>
  );
}

const styles = StyleSheet.create({
    titleContainer: {
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 40,
        paddingHorizontal: 30,
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
        paddingHorizontal: 40,
        gap: 25,
    },
    
    categoryButton: {
        ...common_styles.primaryButton,
        backgroundColor: colors.forestGreen,
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderWidth: 3,
        borderColor: colors.oliveGreen,
        position: 'relative',
        transform: [{ rotate: '0.5deg' }],
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
        letterSpacing: 3,
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
        paddingVertical: 18,
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
});