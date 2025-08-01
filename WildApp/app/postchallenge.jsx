import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { PostService } from './services/postService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common_styles, colors } from './styles';
import * as Haptics from 'expo-haptics';
import { useAuth } from './contexts/AuthContext';

const { width, height } = Dimensions.get('window');
import { useRouter, useLocalSearchParams } from 'expo-router';

const PostChallengePage = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [caption, setCaption] = useState('');
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const { challenge, category, completedAt, participants, invitationId } = useLocalSearchParams();
  const { user, loading } = useAuth();

  const router = useRouter();

  useEffect(() => {
    const loadUsername = async () => {
      try {
        setUsername(user.name || user.email.split('@')[0] || 'anonymous');
      } catch (error) {
        console.error('Failed to load username:', error);
      }
    };
    loadUsername();
  }, []);

  useEffect(() => {
    const saveUsername = async () => {
      if (username) {
        try {
          await AsyncStorage.setItem('username', username);
        } catch (error) {
          console.error('Failed to save username:', error);
        }
      }
    };
    saveUsername();
  }, [username]);

  useEffect(async () => {
    if (participants && participants.length > 0) {
      const participantNames = participants.map(p => p.name || p.email.split('@')[0] || 'anonymous');
      setUsername(participantNames.join(', '));
    }
    try {
      await PostService.removeInvite(invitationId, user.id);
    } catch (error) {
      console.log("Didn't remove invite, person likely wasn't invited");
    }
  }, [participants]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
    })();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    })();
  }, []);

  useEffect(() => {
    if (locationEnabled && locationPermission) {
      getCurrentLocation();
    }
  }, [locationEnabled, locationPermission]);

  const getCurrentLocation = async () => {
    try {
      if (!locationPermission) {
        console.log('Location permission not granted');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const noise = () => (Math.random() - 0.5) * 0.001;
      setCurrentLocation({
        latitude: parseFloat((location.coords.latitude + noise()).toFixed(2)),
        longitude: parseFloat((location.coords.longitude + noise()).toFixed(2)),
      });
      
      console.log('Location obtained:', location.coords);
    } catch (error) {
      console.error('Failed to get location:', error);
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please check your location settings.'
      );
    }
  };

  const toggleLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!locationEnabled) {
      if (!locationPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission',
            'Please enable location access to tag your posts with location.'
          );
          return;
        }
      }
      
      setLocationEnabled(true);
      getCurrentLocation();
    } else {
      setLocationEnabled(false);
      setCurrentLocation(null);
    }
  };

  const takePicture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!cameraPermission) {
      Alert.alert('Camera Permission', 'Please enable camera access to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const selectFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (isPostLoading) {
      Alert.alert('Posting in progress', 'Please wait until the current post is completed.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPostLoading(true);
    if (!photo) {
      Alert.alert('Photo Required', 'Take a photo to prove you did it!');
      return;
    }

    try {
      console.log('Starting post creation process...');
      console.log("Using photo URI:", photo);
      
      console.log('Uploading photo...');
      const photoUrl = await PostService.uploadPhoto(photo);
      console.log('Photo uploaded successfully:', photoUrl);
      
      let coords = currentLocation;
      if (locationEnabled && !coords) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        } catch (error) {
          console.log('Could not get fresh location:', error);
        }
      }

      const post = {
        challenge,
        category,
        photo: photoUrl,
        caption: caption || `Just crushed: ${challenge}`,
        completedAt,
        timestamp: new Date().toISOString(),
        latitude: locationEnabled && coords ? coords.latitude : null,
        longitude: locationEnabled && coords ? coords.longitude : null,
        locationEnabled: locationEnabled
      };

      console.log('Creating post in database:', post);
      
      try {
        const existingPosts = JSON.parse(await AsyncStorage.getItem('posts')) || [];
        existingPosts.push(post);
        await AsyncStorage.setItem('posts', JSON.stringify(existingPosts));
      } catch (error) {
        console.error('Failed to save post to local storage:', error);
      }

      const originalAchievements = await PostService.getAchievements(user.id);
      const originalLevel = await PostService.getLevel(user.id);
      const newPost = await PostService.createPost(post, user);
      
      const { streakInfo } = newPost;
      const newStreak = streakInfo.newStreak || streakInfo.streakIncreased;

      const newAchievements = await PostService.getAchievements(user.id);
      const newAchievementsList = newAchievements.filter(ach =>
        !originalAchievements.some(orig => orig.id === ach.id)
      ); 
      console.log('New achievements unlocked:', newAchievementsList);
      console.log('Post created successfully:', newPost);
      const newLevel = await PostService.getLevel(user.id);
      const levelChanged = newLevel !== originalLevel;
      console.log("New level: ", newLevel, "Level changed:", levelChanged);
      setIsPostLoading(false);
      if (!newStreak) {
        if (newAchievementsList.length === 0) {
          if (levelChanged) {
        router.push({
          pathname: "level",
          params: {
            newPost: JSON.stringify(newPost),
            isNewPost: 'true',
            newLevel: newLevel,
          }
        });
          } else {
        router.push({
          pathname: "gallery",
          params: {
            newPost: JSON.stringify(newPost),
            isNewPost: 'true'
          }
        });
          }
        } else {
          router.push({
        pathname: "achievements",
        params: {
          newPost: JSON.stringify(newPost),
          isNewPost: 'true',
          newAchievements: JSON.stringify(newAchievementsList),
          levelChanged: levelChanged,
          newLevel: newLevel,
        }
          });
        }
      } else {
        router.push({
          pathname: "streak",
          params: {
        newPost: JSON.stringify(newPost),
        isNewPost: 'true',
        streak: streakInfo.currentStreak,
        newAchievements: JSON.stringify(newAchievementsList),
        levelChanged: levelChanged,
        newLevel: newLevel,
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to create post:', error);
      
      Alert.alert(
        'Post Failed', 
        'Something went wrong while posting. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handlePost() }
        ]
      );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView style={common_styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.mediumBrown} />
      
      <View style={common_styles.backgroundTexture} />

      <Animated.View 
        style={[
          common_styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={common_styles.header}>
          <Text style={common_styles.headerTitle}>CHALLENGE CRUSHED!</Text>
          <View style={common_styles.headerLine} />
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 5,
          paddingHorizontal: 20,
        }}>
          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: locationEnabled ? colors.vintageOrange : colors.darkGray,
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 2,
              marginTop: 10,
              borderColor: locationEnabled ? colors.darkBrown : colors.mediumGray,
            }}
            onPress={toggleLocation}
          >
            <Text style={{
              fontSize: 16,
              marginRight: 8,
            }}>
              {locationEnabled ? '📍' : '📍'}
            </Text>
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: locationEnabled ? colors.polaroidWhite : colors.mediumGray,
              letterSpacing: 1,
            }}>
              {locationEnabled ? 'LOCATION ON' : 'LOCATION OFF'}
            </Text>
          </TouchableOpacity>
          
          {locationEnabled && currentLocation && (
            <View style={{
              marginLeft: 10,
              padding: 5,
            }}>
              <Text style={{
                fontSize: 10,
                color: colors.darkGray,
                fontStyle: 'italic',
              }}>
                📍 Located
              </Text>
            </View>
          )}
        </View>

        <View style={common_styles.polaroidContainer}>
          <View style={common_styles.polaroidLarge}>
            <View style={common_styles.photoLarge}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              ) : (
                <View style={common_styles.photoPlaceholderContent}>
                  <Text style={common_styles.photoPlaceholderText}>TAP TO ADD PHOTO</Text>
                  <Text style={common_styles.photoPlaceholderSubtext}>PROOF REQUIRED</Text>
                </View>
              )}
              
              {!photo && (
                <View style={{
                  position: 'absolute',
                  bottom: 15,
                  right: 15,
                  flexDirection: 'row',
                  gap: 10,
                }}>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      padding: 12,
                      borderRadius: 25,
                    }}
                    onPress={takePicture}
                  >
                    <Text style={{ fontSize: 20 }}>📷</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      padding: 12,
                      borderRadius: 25,
                    }}
                    onPress={selectFromGallery}
                  >
                    <Text style={{ fontSize: 20 }}>🖼️</Text>
                  </TouchableOpacity>
                </View>
              )}

              {photo && (
                <TouchableOpacity 
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: colors.vintageOrange,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    transform: [{ rotate: '2deg' }],
                  }}
                  onPress={() => setPhoto(null)}
                >
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: colors.polaroidWhite,
                    letterSpacing: 1,
                  }}>
                    RETAKE
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={common_styles.captionArea}>
              <Text style={common_styles.challengeText}>{challenge}</Text>

              <TextInput
                style={[
                  common_styles.textInput,
                  {
                    minHeight: 60,
                    textAlign: 'center',
                    fontStyle: 'italic',
                    marginBottom: 10,
                  }
                ]}
                placeholder="Write your victory story..."
                placeholderTextColor={colors.darkGray}
                value={caption}
                onChangeText={text => {
                  setCaption(text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                multiline
                maxLength={100}
                textAlignVertical="top"
                blurOnSubmit={true}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (typeof Keyboard !== 'undefined') Keyboard.dismiss();
                }}
              />
              <View style={common_styles.polaroidFooter}>
                <Text style={common_styles.usernameStamp}>{category.toUpperCase()}</Text>
                <Text style={common_styles.dateStamp}>{formatDate(completedAt)}</Text>
              </View>
            </View>
          </View>

          <View style={[common_styles.tapeHorizontal, common_styles.tapeTopLeft]} />
          <View style={[common_styles.tapeHorizontal, common_styles.tapeTopRight]} />
        </View>

        <TouchableOpacity 
          style={[
            common_styles.primaryButton,
            !photo && { backgroundColor: colors.darkGray, borderColor: colors.mediumGray }
          ]}
          onPress={handlePost}
          disabled={!photo}
        >
          <Text style={[
            common_styles.primaryButtonText,
            !photo && { color: colors.mediumGray }
          ]}>
            POST TO THE WALL
          </Text>
        </TouchableOpacity>
      </Animated.View>
      {isPostLoading && (
        <View style={common_styles.modalOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={common_styles.loadingText}>Posting...</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default PostChallengePage;