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
      completedAt,
      timestamp: new Date().toISOString(),
    };

    console.log('Creating post in database:', post);
    
    const newPost = await PostService.createPost(post);
    
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <LinearGradient
        colors={['#2a2a2a', '#1a1a1a', '#0f0f0f']}
        style={styles.background}
      />

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>CHALLENGE CRUSHED!</Text>
          <View style={styles.headerLine} />
        </View>

        <View style={styles.polaroidContainer}>
          <View style={styles.polaroid}>
            <View style={styles.photoFrame}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.placeholderPhoto}>
                  <Text style={styles.placeholderText}>TAP TO ADD PHOTO</Text>
                  <Text style={styles.placeholderSubtext}>PROOF REQUIRED</Text>
                </View>
              )}
              
              {!photo && (
                <View style={styles.photoButtons}>
                  <TouchableOpacity 
                    style={styles.photoButton}
                    onPress={takePicture}
                  >
                    <Text style={styles.photoButtonText}>📷</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.photoButton}
                    onPress={selectFromGallery}
                  >
                    <Text style={styles.photoButtonText}>🖼️</Text>
                  </TouchableOpacity>
                </View>
              )}

              {photo && (
                <TouchableOpacity 
                  style={styles.retakeButton}
                  onPress={() => setPhoto(null)}
                >
                  <Text style={styles.retakeText}>RETAKE</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.captionArea}>
              <Text style={styles.challengeStamp}>{challenge}</Text>
              
              <TextInput
                style={styles.captionInput}
                placeholder="Write your victory story..."
                placeholderTextColor="#666"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={100}
                textAlignVertical="top"
              />
              <TextInput
                style={styles.captionInput}
                placeholder="Your name (optional)"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                maxLength={30}
                textAlignVertical="top"
              />

              <View style={styles.polaroidDetails}>
                <Text style={styles.categoryStamp}>{category.toUpperCase()}</Text>
                <Text style={styles.dateStamp}>{formatDate(completedAt)}</Text>
              </View>
            </View>

            <View style={styles.cornerDistress1} />
            <View style={styles.cornerDistress2} />
            <View style={styles.cornerDistress3} />
          </View>

          <View style={styles.tape1} />
          <View style={styles.tape2} />
        </View>

        <TouchableOpacity 
          style={[
            styles.postButton,
            !photo && styles.postButtonDisabled
          ]}
          onPress={handlePost}
          disabled={!photo}
        >
          <Text style={[
            styles.postButtonText,
            !photo && styles.postButtonTextDisabled
          ]}>
            POST TO THE WALL
          </Text>
          <View style={styles.postButtonDistress} />
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 30,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 3,
  },
  headerLine: {
    width: 120,
    height: 3,
    backgroundColor: '#4CAF50',
    marginTop: 8,
    transform: [{ rotate: '1deg' }],
  },
  polaroidContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  polaroid: {
    width: width * 0.85,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 10,
    transform: [{ rotate: '-1deg' }],
    position: 'relative',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#ddd',
    marginBottom: 15,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 1,
  },
  placeholderSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 5,
    letterSpacing: 1,
  },
  photoButtons: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 25,
  },
  photoButtonText: {
    fontSize: 20,
  },
  retakeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,107,53,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '2deg' }],
  },
  retakeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  captionArea: {
    minHeight: 80,
  },
  challengeStamp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  captionInput: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'System',
    minHeight: 40,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  polaroidDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  categoryStamp: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ff6b35',
    letterSpacing: 1,
    transform: [{ rotate: '-1deg' }],
  },
  dateStamp: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    transform: [{ rotate: '1deg' }],
  },
  cornerDistress1: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 8,
    height: 8,
    backgroundColor: '#333',
    transform: [{ rotate: '45deg' }],
  },
  cornerDistress2: {
    position: 'absolute',
    top: -1,
    right: 10,
    width: 15,
    height: 2,
    backgroundColor: '#999',
  },
  cornerDistress3: {
    position: 'absolute',
    bottom: 5,
    left: -1,
    width: 2,
    height: 10,
    backgroundColor: '#ccc',
  },
  tape1: {
    position: 'absolute',
    top: -8,
    left: 20,
    width: 40,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    transform: [{ rotate: '-5deg' }],
    borderRadius: 2,
  },
  tape2: {
    position: 'absolute',
    top: -5,
    right: 30,
    width: 35,
    height: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '8deg' }],
    borderRadius: 2,
  },
  postButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    paddingHorizontal: 40,
    marginTop: 30,
    borderWidth: 3,
    borderColor: '#2E7D32',
    transform: [{ rotate: '0.5deg' }],
    position: 'relative',
  },
  postButtonDisabled: {
    backgroundColor: '#666',
    borderColor: '#444',
  },
  postButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  postButtonTextDisabled: {
    color: '#999',
  },
  postButtonDistress: {
    position: 'absolute',
    bottom: -2,
    right: 10,
    width: 12,
    height: 12,
    backgroundColor: '#ff6b35',
    transform: [{ rotate: '45deg' }],
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: 15,
    marginBottom: 30,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
  },
});

export default PostChallengePage;