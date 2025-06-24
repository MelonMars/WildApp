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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { PostService } from './services/postService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common_styles, colors } from './styles';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
import { useRouter, useLocalSearchParams } from 'expo-router';

const PostChallengePage = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [caption, setCaption] = useState('');
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const { challenge, category, completedAt } = useLocalSearchParams();

  const router = useRouter();

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
      
      const post = {
        challenge,
        category,
        photo: photoUrl,
        caption: caption || `Just crushed: ${challenge}`,
        username: username || 'anonymous',
        completedAt,
        timestamp: new Date().toISOString(),
      };

      console.log('Creating post in database:', post);
      
      const newPost = await PostService.createPost(post);
      
      const lastCompleted = await AsyncStorage.getItem('lastCompleted');
      const lastCompletedDate = lastCompleted ? new Date(lastCompleted) : null;
      const today = new Date();
      let streak = (await AsyncStorage.getItem('streak')) || "0";
      
      if (lastCompletedDate && lastCompletedDate.toDateString() !== today.toDateString()) {
          streak = (parseInt(streak, 10) + 1).toString();
      }

      await AsyncStorage.setItem('streak', streak);
      await AsyncStorage.setItem('lastCompleted', new Date().toISOString());

      console.log('Post created successfully:', newPost);
      
      router.push({
        pathname: "gallery",
        params: {
          newPost: JSON.stringify(newPost),
          isNewPost: 'true'
        }
      });
      
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
    <View style={common_styles.container}>
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
              
              <TextInput
                style={[
                  common_styles.textInput,
                  {
                    textAlign: 'center',
                    marginBottom: 15,
                  }
                ]}
                placeholder="Your name (optional)"
                placeholderTextColor={colors.darkGray}
                value={username}
                onChangeText={text => {
                  setUsername(text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                maxLength={30}
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
    </View>
  );
};

export default PostChallengePage;