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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { PostService, NewChallengeService } from './services/postService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common_styles, colors } from './styles';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useAuth } from './contexts/AuthContext';

const { width, height } = Dimensions.get('window');
import { useRouter } from 'expo-router';

const CreateChallengePage = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [challengeName, setChallengeName] = useState('');
  const [category, setCategory] = useState('');
  const [caption, setCaption] = useState('');
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLocalChallenge, setIsLocalChallenge] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const { user, loading } = useAuth();

  const router = useRouter();

  const categories = [
    { id: 'creative', name: 'CREATIVE', emoji: '🎨' },
    { id: 'social', name: 'SOCIAL', emoji: '👥' },
    { id: 'adventure', name: 'ADVENTURE', emoji: '🏔️' },
  ];

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
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
      return false;
    }
  };

  useEffect(() => {
    const loadUsername = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        if (storedUsername) {
          setUsername(storedUsername);
        }
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
  }, []);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (!challengeName.trim()) {
      Alert.alert('Challenge Name Required', 'What challenge did you complete?');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a category for your challenge');
      return;
    }

    if (!photo) {
      Alert.alert('Photo Required', 'Upload proof that you completed this challenge!');
      return;
    }

    if (isLocalChallenge && (!userLocation || !locationPermission)) {
      Alert.alert(
        'Location Required', 
        'You need to enable location access to create a local challenge.',
        [
          { text: 'Create Global Instead', onPress: () => setIsLocalChallenge(false) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      console.log('Starting user challenge post creation...');
      console.log("Using photo URI:", photo);
      
      console.log('Uploading photo...');
      const photoUrl = await PostService.uploadPhoto(photo);
      console.log('Photo uploaded successfully:', photoUrl);
      
      const post = {
        challenge: challengeName.trim(),
        category: selectedCategory,
        photo: photoUrl,
        caption: caption.trim() || `Just completed my own challenge: ${challengeName.trim()}`,
        username: username.trim() || 'anonymous',
        completedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        isUserGenerated: true,
        ...(isLocalChallenge && userLocation && {
          local: true,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        })
      };

      console.log('Creating user challenge post in database:', post);
      
      const newPost = await NewChallengeService.submitNewChallenge(post, user);
      
      console.log('User challenge post created successfully:', newPost);
      
      router.push('/gallery');
    } catch (error) {
      console.error('Failed to create user challenge post:', error);
      
      Alert.alert(
        'Post Failed', 
        'Something went wrong while posting your challenge. Please try again.',
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

  const isFormValid = challengeName.trim() && selectedCategory && photo;

  return (
    <KeyboardAvoidingView 
      style={common_styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.mediumBrown} />
      
      <View style={common_styles.backgroundTexture} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
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
            <Text style={common_styles.headerTitle}>CREATE YOUR CHALLENGE</Text>
            <Text style={[common_styles.headerSubtitle, { color: colors.vintageOrange, marginTop: 5 }]}>
              SHOW THE WORLD WHAT YOU ACCOMPLISHED
            </Text>
            <View style={common_styles.headerLine} />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={[{ marginBottom: 8, color: colors.offWhite, fontSize: 14, fontWeight: '600', marginTop: 8 }]}>
              WHAT CHALLENGE DID YOU COMPLETE?
            </Text>
            <TextInput
              style={[
                common_styles.textInput,
                {
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: 'center',
                  backgroundColor: colors.polaroidWhite,
                  borderWidth: 2,
                  borderColor: challengeName.trim() ? colors.vintageOrange : colors.mediumGray,
                }
              ]}
              placeholder="e.g., Ran 5 miles, Learned to juggle, Cooked a new recipe..."
              placeholderTextColor={colors.darkGray}
              value={challengeName}
              onChangeText={text => {
                setChallengeName(text);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              maxLength={80}
              multiline
              textAlignVertical="center"
              returnKeyType="done"
              onSubmitEditing={() => {
                  if (typeof Keyboard !== 'undefined') Keyboard.dismiss();
                }}
            />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={[{ marginBottom: 12, color: colors.offWhite, fontSize: 14, fontWeight: '600'  }]}>
              CHOOSE A CATEGORY
            </Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat.id && styles.categoryButtonSelected
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === cat.id && styles.categoryTextSelected
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={[{ marginBottom: 12, color: colors.offWhite, fontSize: 14, fontWeight: '600' }]}>
              CHALLENGE LOCATION
            </Text>
            
            <TouchableOpacity
              style={[
                styles.localToggle,
                isLocalChallenge && styles.localToggleActive
              ]}
              onPress={async () => {
                if (!isLocalChallenge) {
                  const locationGranted = await requestLocationPermission();
                  if (locationGranted) {
                    setIsLocalChallenge(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } else {
                    Alert.alert(
                      'Location Access Required',
                      'To create location-based challenges, please enable location access when prompted.'
                    );
                  }
                } else {
                  setIsLocalChallenge(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
              <Text style={styles.localToggleEmoji}>
                {isLocalChallenge ? '📍' : '🌍'}
              </Text>
              <Text style={[
                styles.localToggleText,
                isLocalChallenge && styles.localToggleTextActive
              ]}>
                {isLocalChallenge ? 'LOCAL CHALLENGE' : 'GLOBAL CHALLENGE'}
              </Text>
              <Text style={[
                styles.localToggleSubtext,
                isLocalChallenge && styles.localToggleSubtextActive
              ]}>
                {isLocalChallenge 
                  ? 'Only people nearby can see this' 
                  : 'Everyone can see this challenge'
                }
              </Text>
              {isLocalChallenge && !userLocation && (
                <Text style={[styles.localToggleSubtext, { color: colors.vintageRed, marginTop: 4 }]}>
                  Getting location...
                </Text>
              )}
            </TouchableOpacity>
          </View>


          <View style={common_styles.polaroidContainer}>
            <View style={common_styles.polaroidLarge}>
              <View style={common_styles.photoLarge}>
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : (
                  <View style={common_styles.photoPlaceholderContent}>
                    <Text style={[common_styles.photoPlaceholderText, { fontSize: 14 }]}>
                      UPLOAD PROOF
                    </Text>
                    <Text style={[common_styles.photoPlaceholderSubtext, { fontSize: 11 }]}>
                      SHOW YOU DID IT!
                    </Text>
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
                <Text style={[common_styles.challengeText, { fontSize: 12 }]}>
                  {challengeName || 'Your Challenge Name'}
                </Text>

                <TextInput
                  style={[
                    common_styles.textInput,
                    {
                      minHeight: 50,
                      textAlign: 'center',
                      fontStyle: 'italic',
                      marginBottom: 10,
                      fontSize: 12,
                    }
                  ]}
                  placeholder="Tell your story..."
                  placeholderTextColor={colors.darkGray}
                  value={caption}
                  onChangeText={text => {
                    setCaption(text);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  multiline
                  maxLength={100}
                  textAlignVertical="top"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (typeof Keyboard !== 'undefined') Keyboard.dismiss();
                 }}
                />
                <View style={common_styles.polaroidFooter}>
                  <Text style={common_styles.usernameStamp}>
                    {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'CATEGORY'}
                  </Text>
                  <Text style={common_styles.dateStamp}>{formatDate(new Date().toISOString())}</Text>
                </View>
              </View>
            </View>

            <View style={[common_styles.tapeHorizontal, common_styles.tapeTopLeft]} />
            <View style={[common_styles.tapeHorizontal, common_styles.tapeTopRight]} />
          </View>

          <TouchableOpacity 
            style={[
              common_styles.primaryButton,
              !isFormValid && { backgroundColor: colors.darkGray, borderColor: colors.mediumGray }
            ]}
            onPress={handlePost}
            disabled={!isFormValid}
          >
            <Text style={[
              common_styles.primaryButtonText,
              !isFormValid && { color: colors.mediumGray }
            ]}>
              {!challengeName.trim() ? 'NAME YOUR CHALLENGE' : 
               !selectedCategory ? 'SELECT CATEGORY' :
               !photo ? 'ADD PROOF PHOTO' : 
               'POST YOUR CHALLENGE'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.helpButton, {'marginBottom': 20, 'marginTop': 10, 'color': colors.offWhite}]}>
            💡 Share your personal achievements and inspire others to try new things!
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.polaroidWhite,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.mediumGray,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  categoryButtonSelected: {
    borderColor: colors.vintageOrange,
    backgroundColor: colors.lightBrown,
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.darkBrown,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  categoryTextSelected: {
    color: colors.vintageOrange,
  },
  helpText: {
    fontSize: 12,
    color: colors.darkGray,
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  }, 
  localToggle: {
    backgroundColor: colors.polaroidWhite,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.mediumGray,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  localToggleActive: {
    borderColor: colors.vintageOrange,
    backgroundColor: colors.lightBrown,
  },
  localToggleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  localToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.darkBrown,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  localToggleTextActive: {
    color: colors.vintageOrange,
  },
  localToggleSubtext: {
    fontSize: 10,
    color: colors.darkGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  localToggleSubtextActive: {
    color: colors.mediumBrown,
  },
});

export default CreateChallengePage;