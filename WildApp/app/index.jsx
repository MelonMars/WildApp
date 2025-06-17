import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
    const router = useRouter();

    const fetchChallenge = (type) => {
        // Open challenge list from challenges.json
        const challenges = require('./challenges.json');
        const challengeList = challenges[type];
        const randomIndex = Math.floor(Math.random() * challengeList.length);
        const randomChallenge = challengeList[randomIndex];
        return randomChallenge;
    }

    const navigateToPage1 = () => {
        console.log('Navigate to Page 1');
        const challenge = fetchChallenge('social');
        router.push({pathname: 'challenge', 'params': { challenge: challenge, category: 'social' }});
    };

    const navigateToPage2 = () => {
        console.log('Navigate to Page 2');
        const challenge = fetchChallenge('adventure');
        router.push({pathname: 'challenge', 'params': { challenge: challenge, category: 'adventure' }});
    };

    const navigateToPage3 = () => {
        console.log('Navigate to Page 3');
        const challenge = fetchChallenge('creative');
        router.push({pathname: 'challenge', 'params': { challenge: challenge, category: 'creative' }});
    };

    const navigateToGallery = () => {
        console.log('Navigate to Settings');
        router.push({pathname: 'gallery'});
    };

    return (
        <View style={styles.container}>
        <View style={styles.titleContainer}>
            <Text style={styles.title}>Wild</Text>
            <Text style={styles.subtitle}>Time to live.</Text>
        </View>

        <View style={styles.middleButtonsContainer}>
            <TouchableOpacity style={styles.mainButton} onPress={navigateToPage1}>
            <Text style={styles.mainButtonText}>SOCIAL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mainButton} onPress={navigateToPage2}>
            <Text style={styles.mainButtonText}>ADVENTURE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mainButton} onPress={navigateToPage3}>
            <Text style={styles.mainButtonText}>CREATIVE</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.bottomButtonContainer}>
            <TouchableOpacity style={styles.bottomButton} onPress={navigateToGallery}>
            <Text style={styles.bottomButtonText}>THE WALL</Text>
            </TouchableOpacity>
        </View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
    letterSpacing: 3,
    textShadowColor: '#D2B48C',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0522D',
    letterSpacing: 2,
    marginTop: 5,
    fontStyle: 'italic',
  },
  middleButtonsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
  },
  mainButton: {
    backgroundColor: '#D2B48C',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    letterSpacing: 1.5,
  },
  bottomButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomButton: {
    backgroundColor: '#CD853F',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#A0522D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    width: '100%',
    alignContent: 'center',
    alignItems: 'center',
  },
  bottomButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
});