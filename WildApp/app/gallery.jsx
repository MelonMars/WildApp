import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Share,
  Linking,
  ActionSheetIOS,
  Alert,
  Platform,
  TextInput, 
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from './contexts/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from './contexts/AuthContext';

import { PostService } from './services/postService';
import { common_styles, colors, typography, shadows } from './styles';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);


export default function GalleryPage() {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [posts, setPosts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newPostAnim] = useState(new Animated.Value(0));
    const [isNewPostAnimating, setIsNewPostAnimating] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [modalAnim] = useState(new Animated.Value(0));

    const scrollY = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const router = useRouter();
    const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);
    const [myPosts, setMyPosts] = useState([]);  
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [selectedUsername, setSelectedUsername] = useState(null);

    const [showCommentModal, setShowCommentModal] = useState(false);
    const [commentModalAnim] = useState(new Animated.Value(0));
    const [commentText, setCommentText] = useState('');
    const [commentInputRef, setCommentInputRef] = useState(null);

    const { newPost, challenge, category, photo, caption, completedAt, timestamp, isNewPost, userOnly } = useLocalSearchParams();
    const { preloadedPosts, preloadedLastDoc, preloadedHasMore, preloadComplete, setPreloadedPosts } = useApp();
    const { user, loading: isAuthLoading } = useAuth();

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        if (preloadComplete && preloadedPosts.length > 0) {
            setPosts(preloadedPosts);
            setLastDoc(preloadedLastDoc);
            setHasMore(preloadedHasMore);
        } else if (preloadComplete && preloadedPosts.length === 0) {
            fetchMorePosts();
        }
    }, [preloadComplete, preloadedPosts, preloadedLastDoc, preloadedHasMore]);

    const loadMyPosts = async () => {
        try {
            const storedPosts = await AsyncStorage.getItem('posts');
            
            if (storedPosts) {
                const parsedPosts = JSON.parse(storedPosts);
                setMyPosts(parsedPosts);
            }
        } catch (error) {
            console.error('Failed to load user posts:', error);
        }
    };

    const onRefresh = async () => {
        if (showMyPostsOnly || selectedUsername) {
            if (showMyPostsOnly) {
                await loadMyPosts();
            }
            setRefreshing(false);
            return;
        }
        
        setRefreshing(true);
        try {
            setLastDoc(null);
            setHasMore(true);
            
            const { posts: newPosts, lastDoc: newLastDoc, hasMore: moreAvailable } =
                await PostService.fetchPosts(null, 10);
            
            setPosts(newPosts);
            setPreloadedPosts(newPosts);
            setLastDoc(newLastDoc);
            setHasMore(moreAvailable);
            
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
        } catch (error) {
            console.error('Failed to refresh posts:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadMyPosts();
    }, []);

    useEffect(() => {
        if (showMyPostsOnly) {
            setFilteredPosts(myPosts);
        } else {
            setFilteredPosts(posts);
        }
    }, [showMyPostsOnly, posts, myPosts]);

    useEffect(() => {
        if (selectedUsername) {
            setFilteredPosts(posts.filter(post => post.username === selectedUsername));
        } else if (showMyPostsOnly) {
            setFilteredPosts(myPosts);
        } else {
            setFilteredPosts(posts);
        }
    }, [showMyPostsOnly, posts, myPosts, selectedUsername]);    

    const handleUsernameFilter = (username) => {
        if (selectedUsername === username) {
            setSelectedUsername(null);
        } else {
            setSelectedUsername(username);
            setShowMyPostsOnly(false);
        }
        closeModal();
    };    

    const fetchMorePosts = async () => {
        if (loading || !hasMore || showMyPostsOnly) return;
        setLoading(true);
        try {
            const { posts: newPosts, lastDoc: newLastDoc, hasMore: moreAvailable } =
                await PostService.fetchPosts(lastDoc, 2);
            setPosts(prevPosts => [...prevPosts, ...newPosts]);
            setPreloadedPosts(prevPosts => [...prevPosts, ...newPosts]);
            setLastDoc(newLastDoc);
            setHasMore(moreAvailable);
        } catch (error) {
            console.error('Failed to fetch more posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsersPosts = async (user) => {
        const newPosts = await PostService.getPostsByUsername(user);
        if (newPosts && newPosts.length > 0) {
            setPosts(prevPosts => [...prevPosts, ...newPosts]);
            setPreloadedPosts(newPosts);
            setLastDoc(null);
            setHasMore(false);
        } else {
            setPosts([]);
            setPreloadedPosts([]);
            setLastDoc(null);
            setHasMore(false);
        }
    }

    const handleEndReached = () => {
        if (selectedUsername) {
            fetchUsersPosts(selectedUsername);
        }
        fetchMorePosts();
    };

    const openModal = (post) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPost(post);
        Animated.spring(modalAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const closeModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.timing(modalAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setSelectedPost(null);
        });
    };

    useEffect(() => {
        if (newPost || isNewPost === 'true') {
            let parsedPost;
            if (newPost) {
                try {
                    parsedPost = typeof newPost === 'string' ? JSON.parse(newPost) : newPost;
                } catch (error) {
                    console.error('Failed to parse newPost:', error);
                    return;
                }
            } else if (isNewPost === 'true') {
                parsedPost = {
                    challenge,
                    category,
                    photo,
                    caption,
                    completedAt,
                    timestamp
                };
            }
            const formattedPost = {
                id: Date.now().toString(),
                username: 'anonymous',
                ...parsedPost,
                completed_at: parsedPost.completedAt || parsedPost.completed_at
            };
            setPosts(prevPosts => [formattedPost, ...prevPosts]);
            setPreloadedPosts(prevPosts => [formattedPost, ...prevPosts]);
            setIsNewPostAnimating(true);
            Animated.sequence([
                Animated.timing(newPostAnim, {
                    toValue: 0.5,
                    duration: 0,
                    useNativeDriver: true,
                }),
                Animated.spring(newPostAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setTimeout(() => {
                    setIsNewPostAnimating(false);
                    newPostAnim.setValue(0);
                }, 500);
            });
        }
    }, [newPost, isNewPost, challenge, category, photo, caption, completedAt, timestamp]);

    useEffect(() => {
        if (userOnly) {
            setShowMyPostsOnly(true);
            setFilteredPosts(myPosts);
        }
    }, [userOnly, myPosts]);

    const formatTimeAgo = (dateString) => {
        if (!dateString) {
            console.log("No date provided, returning 'Just now'");
            return 'Just now';
        }
        const now = new Date();
        const postDate = new Date(dateString);
        if (isNaN(postDate.getTime())) {
            return 'Just now';
        }
        const diffInMs = now - postDate;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${Math.floor(diffInHours / 24)}d ago`;
    };

    const getCategoryColor = (category) => {
        const categoryColors = {
            social: colors.vintageOrange,
            fitness: colors.forestGreen,
            adventure: colors.oliveGreen,
            creative: colors.mossGreen,
            mindful: colors.peach,
            COWARD: colors.vintageRed,
        };
        return categoryColors[category] || colors.darkGray;
    };

    const renderCowardPost = (item, animatedTransforms, isNewPost) => {
        return (
            <View style={styles.photoContainer}>
                <View style={[styles.cowardPhotoContainer, common_styles.photoFrame]}>
                    <Text style={styles.cowardX}>✗</Text>
                </View>
                <View style={[
                    common_styles.categoryBadge,
                    { backgroundColor: getCategoryColor('COWARD') }
                ]}>
                    <Text style={common_styles.categoryBadgeText}>COWARD</Text>
                </View>
            </View>
        );
    };

    const renderNormalPost = (item) => {
        return (
            <View style={styles.photoContainer}>
                <Image
                    source={{ uri: item.photo }}
                    style={[common_styles.photoFrame, styles.postPhoto]}
                    resizeMode="cover"
                />
                <View style={[
                    common_styles.categoryBadge,
                    { backgroundColor: getCategoryColor(item.category) }
                ]}>
                    <Text style={common_styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
                </View>
            </View>
        );
    };

    const renderCowardCaption = (item) => {
        return (
            <View style={[common_styles.captionArea, styles.postCaptionArea]}>
                <Text style={common_styles.challengeText} numberOfLines={2}>
                    {item.challenge}
                </Text>
                <Text style={styles.cowardText}>
                    <Text style={styles.cowardUsername}>{item.username.toUpperCase()}</Text>
                    <Text style={styles.cowardLabel}> is a </Text>
                    <Text style={styles.cowardUsername}>COWARD</Text>
                </Text>
                <View style={common_styles.polaroidFooter}>
                    <Text style={common_styles.dateStamp}>{formatTimeAgo(item.completed_at)}</Text>
                </View>
            </View>
        );
    };

    const renderNormalCaption = (item) => {
        return (
            <View style={[common_styles.captionArea, styles.postCaptionArea]}>
                <Text style={common_styles.challengeText} numberOfLines={2}>
                    {item.challenge}
                </Text>
                <Text style={common_styles.captionText} numberOfLines={2}>
                    "{item.caption}"
                </Text>
                <View style={common_styles.polaroidFooter}>
                    <Text style={common_styles.usernameStamp}>@{item.username}</Text>
                    <Text style={common_styles.dateStamp}>{formatTimeAgo(item.completed_at)}</Text>
                </View>
            </View>
        );
    };

    const renderLikesAndComments = (item) => {
        const has_user_liked = item.users_who_liked && item.users_who_liked.includes(user?.id);
        const heart_emoji = has_user_liked ? '❤️' : '🖤';
        
        const commentCount = Array.isArray(item.comments) 
            ? item.comments.length 
            : (item.commentCount || item.comments || 0);
        
        return (
            <View style={common_styles.polaroidFooter}>
                <TouchableOpacity 
                    onPress={() => handleLike(item).catch(e => console.error('HandleLike error', e))}
                    activeOpacity={0.7}
                >
                    <Text style={common_styles.likesCount}>
                        {item.likes ? `${item.likes} ${heart_emoji}` : `0 ${heart_emoji}`}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => handleComment(item)}
                    activeOpacity={0.7}
                >
                    <Text style={common_styles.commentsCount}>
                        {commentCount > 0 ? `${commentCount} 💬` : '0 💬'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };
    

    const handleLike = async (item) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('Like post:', item.id);
        const res = await PostService.togglePostLike(item.id, user);
        if (res.success) {
          setPosts(posts => posts.map(p =>
            p.id === item.id
              ? { ...p, likes: res.newLikesCount, users_who_liked: res.usersWhoLiked }
              : p
          ));
            setPreloadedPosts(preloadedPosts => preloadedPosts.map(p =>
                p.id === item.id
                ? { ...p, likes: res.newLikesCount, users_who_liked: res.usersWhoLiked }
                : p
            ));
        }
    };      
    
    const handleComment = (item) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPost(item);
        setShowCommentModal(true);
        
        Animated.timing(commentModalAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                commentInputRef?.focus();
            }, 100);
        });
    };

    const closeCommentModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        Animated.timing(commentModalAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowCommentModal(false);
            setSelectedPost(null);
            setCommentText('');
        });
    };

    const handleSubmitComment = async () => {
        if (!commentText.trim() || !selectedPost) return;
        
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            const newComment = await PostService.addComment(selectedPost.id, commentText, user);
            
            console.log('Submitting comment:', commentText, 'for post:', selectedPost.id);
            
            setPosts(posts => posts.map(p =>
                p.id === selectedPost.id
                    ? { 
                        ...p, 
                        comments: Array.isArray(p.comments) 
                            ? [...p.comments, newComment]
                            : [newComment],
                        commentCount: (p.commentCount || 0) + 1
                    }
                    : p
            ));
            
            setPreloadedPosts(preloadedPosts => preloadedPosts.map(p =>
                p.id === selectedPost.id
                    ? { 
                        ...p, 
                        comments: Array.isArray(p.comments) 
                            ? [...p.comments, newComment]
                            : [newComment],
                        commentCount: (p.commentCount || 0) + 1
                    }
                    : p
            ));
            
            setSelectedPost(prev => ({
                ...prev,
                comments: Array.isArray(prev.comments) 
                    ? [...prev.comments, newComment]
                    : [newComment]
            }));
            
            setCommentText('');
            closeCommentModal();
            
        } catch (error) {
            console.error('Failed to submit comment:', error);
        }
    };    

    const renderCommentModal = () => {
        if (!showCommentModal || !selectedPost) return null;
    
        const translateY = commentModalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [height, 0],
            extrapolate: 'clamp',
        });
        
        const comments = Array.isArray(selectedPost.comments) ? selectedPost.comments : [];
        
        return (
            <Animated.View 
                style={[
                    styles.commentModalOverlay,
                    {
                        opacity: commentModalAnim,
                        transform: [{ translateY }]
                    }
                ]}
            >
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill}
                    onPress={closeCommentModal}
                    activeOpacity={1}
                />
                
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.commentModalContainer}
                >
                    <View style={styles.commentModalContent}>
                        <View style={styles.modalHandle} />
                        
                        <View style={styles.commentModalHeader}>
                            <Text style={styles.commentModalTitle}>Comments</Text>
                            <TouchableOpacity
                                style={styles.commentCloseButton}
                                onPress={closeCommentModal}
                            >
                                <Text style={styles.commentCloseButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                                                
                        <ScrollView 
                            style={styles.commentsList}
                            showsVerticalScrollIndicator={false}
                        >
                            {comments.slice().reverse().map((comment, index) => (
                                <View key={comment.id || index} style={styles.commentItem}>
                                    <View style={styles.commentAvatar}>
                                        {comment.profile_picture ? (
                                            <Image
                                                source={{ uri: comment.profile_picture }}
                                                style={styles.commentAvatarImage}
                                            />
                                        ) : (
                                            <Text style={styles.commentAvatarText}>
                                                {comment.username.charAt(0).toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.commentContent}>
                                        <View style={styles.commentHeader}>
                                            <Text style={styles.commentUsername}>@{comment.username}</Text>
                                            <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
                                        </View>
                                        <Text style={styles.commentText}>{comment.text}</Text>
                                    </View>
                                </View>
                            ))}
                            
                            {comments.length === 0 && (
                                <View style={styles.noCommentsContainer}>
                                    <Text style={styles.noCommentsText}>No comments yet</Text>
                                    <Text style={styles.noCommentsSubText}>Be the first to comment!</Text>
                                </View>
                            )}
                        </ScrollView>
                        <View style={styles.commentInputContainer}>
                            <TextInput
                                ref={setCommentInputRef}
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor={colors.dustyRed}
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                                maxLength={200}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={[
                                    styles.commentSubmitButton,
                                    commentText.trim() ? styles.commentSubmitButtonActive : {}
                                ]}
                                onPress={handleSubmitComment}
                                disabled={!commentText.trim()}
                            >
                                <Text style={[
                                    styles.commentSubmitButtonText,
                                    commentText.trim() ? styles.commentSubmitButtonTextActive : {}
                                ]}>
                                    POST
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Animated.View>
        );
    };
    
    const renderPost = ({ item, index }) => {
        const inputRange = [-1, 0, (index + 1) * 200, (index + 2) * 200];
        const scale = scrollY.interpolate({
            inputRange,
            outputRange: [1, 1, 1, 0.95],
            extrapolate: 'clamp',
        });
        const rotation = (index % 3 - 1) * 2;
        const offsetX = (index % 2) * 10 - 5;
        const isNewPost = index === 0 && isNewPostAnimating;
        const isCowardPost = item.category === 'COWARD';
        
        let animatedTransforms = [
            { scale },
            { rotate: `${rotation}deg` },
            { translateX: offsetX }
        ];
        
        if (isNewPost) {
            const slamTranslateY = newPostAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [-300, -50, 0],
                extrapolate: 'clamp',
            });
            const slamRotation = newPostAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [-25, -5, rotation],
                extrapolate: 'clamp',
            });
            const slamScale = newPostAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 1.1, 1],
                extrapolate: 'clamp',
            });
            animatedTransforms = [
                { scale: slamScale },
                { rotate: `${slamRotation}deg` },
                { translateX: offsetX },
                { translateY: slamTranslateY }
            ];
        }
        
        return (
            <Animated.View
                style={[
                    styles.postContainer,
                    {
                        transform: animatedTransforms,
                        ...(isNewPost ? {
                            shadowColor: getCategoryColor(item.category),
                            shadowOffset: { width: 0, height: 5 },
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                            elevation: 10,
                        } : {})
                    }
                ]}
            >
                <TouchableOpacity
                    style={[
                        common_styles.polaroidSmall,
                        styles.polaroidPost,
                        isNewPost ? {
                            borderWidth: 2,
                            borderColor: getCategoryColor(item.category),
                        } : {},
                        isCowardPost ? common_styles.failureContainer : {}
                    ]}
                    activeOpacity={0.9}
                    onPress={() => openModal(item)}
                >
                    {isCowardPost ?
                        renderCowardPost(item, animatedTransforms, isNewPost) :
                        renderNormalPost(item)
                    }
                    {isCowardPost ?
                        renderCowardCaption(item) :
                        renderNormalCaption(item)
                    }
                    <View onStartShouldSetResponder={() => true}>
                        {!isCowardPost && renderLikesAndComments(item)}
                    </View>
                    <View style={[
                        common_styles.tapeHorizontal,
                        common_styles.tapeTopLeft,
                        {
                            left: 20 + (index % 3) * 15,
                            transform: [{ rotate: `${(index % 5 - 2) * 3}deg` }]
                        }
                    ]} />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderModal = () => {
        if (!selectedPost) return null;
        
        const isCowardPost = selectedPost.category === 'COWARD';
        const hasLocation = selectedPost.latitude && selectedPost.longitude;
        
        const modalScale = modalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
            extrapolate: 'clamp',
        });

        const handleShare = async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            try {
                const shareContent = isCowardPost
                    ? `${selectedPost.username.toUpperCase()} is a COWARD! 📸 Challenge: "${selectedPost.challenge}"`
                    : `"${selectedPost.caption}" - @${selectedPost.username} 📸 Challenge: "${selectedPost.challenge}"`;

                const options = [
                    'Share as Story',
                    'Regular Share',
                    'Cancel'
                ];
                
                const choice = await showActionSheet(options);
                
                if (choice === 0) {
                    await shareAsStory();
                } else if (choice === 1) {
                    await regularShare(shareContent);
                }
                
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        };

        const shareAsStory = async () => {
            try {
                let localImageUri = selectedPost.photo;
                
                if (selectedPost.photo && selectedPost.photo.startsWith('http')) {
                    const filename = selectedPost.photo.split('/').pop() || 'shared_image.jpg';
                    const localUri = `${FileSystem.documentDirectory}${filename}`;
                    
                    const { uri } = await FileSystem.downloadAsync(selectedPost.photo, localUri);
                    localImageUri = uri;
                }
                
                const platforms = [
                    { name: 'Instagram Stories', scheme: 'instagram-stories', action: () => shareToInstagramStory(localImageUri) },
                    { name: 'Snapchat', scheme: 'snapchat', action: () => shareToSnapchat(localImageUri) },
                    { name: 'Facebook Stories', scheme: 'fb', action: () => shareToFacebookStory(localImageUri) },
                    'Cancel'
                ];
                
                const platformChoice = await showActionSheet(platforms.map(p => typeof p === 'string' ? p : p.name));
                
                if (platformChoice !== 'Cancel' && platformChoice < platforms.length - 1) {
                    const selectedPlatform = platforms[platformChoice];
                    if (typeof selectedPlatform === 'object') {
                        await selectedPlatform.action();
                    }
                }
                
            } catch (error) {
                console.log('Story share failed:', error);
                await regularShare();
            }
        };

        const shareToInstagramStory = async (imageUri) => {
            try {
                const instagramURL = `instagram-stories://share?media=${encodeURIComponent(imageUri)}`;
                
                const canOpen = await Linking.canOpenURL('instagram-stories://share');
                if (canOpen) {
                    await Linking.openURL(instagramURL);
                } else {
                    throw new Error('Instagram not installed');
                }
            } catch (error) {
                console.log('Instagram story share failed:', error);
                const fallbackURL = 'instagram://story-camera';
                const canOpenFallback = await Linking.canOpenURL(fallbackURL);
                
                if (canOpenFallback) {
                    await Linking.openURL(fallbackURL);
                } else {
                    const storeURL = Platform.OS === 'ios' 
                        ? 'https://apps.apple.com/app/instagram/id389801252'
                        : 'https://play.google.com/store/apps/details?id=com.instagram.android';
                    await Linking.openURL(storeURL);
                }
            }
        };

        const shareToSnapchat = async (imageUri) => {
            try {
                const snapchatURL = `snapchat://camera`;
                
                const canOpen = await Linking.canOpenURL(snapchatURL);
                if (canOpen) {
                    await MediaLibrary.saveToLibraryAsync(imageUri);
                    await Linking.openURL(snapchatURL);
                } else {
                    throw new Error('Snapchat not installed');
                }
            } catch (error) {
                console.log('Snapchat share failed:', error);
                const storeURL = Platform.OS === 'ios'
                    ? 'https://apps.apple.com/app/snapchat/id447188370'
                    : 'https://play.google.com/store/apps/details?id=com.snapchat.android';
                await Linking.openURL(storeURL);
            }
        };

        const shareToFacebookStory = async (imageUri) => {
            try {
                const facebookURL = `fb://story-camera`;
                
                const canOpen = await Linking.canOpenURL(facebookURL);
                if (canOpen) {
                    await MediaLibrary.saveToLibraryAsync(imageUri);
                    await Linking.openURL(facebookURL);
                } else {
                    throw new Error('Facebook not installed');
                }
            } catch (error) {
                console.log('Facebook story share failed:', error);
                const storeURL = Platform.OS === 'ios'
                    ? 'https://apps.apple.com/app/facebook/id284882215'
                    : 'https://play.google.com/store/apps/details?id=com.facebook.katana';
                await Linking.openURL(storeURL);
            }
        };

        const regularShare = async (shareContent) => {
            const shareOptions = {
                title: 'Check this out!',
                message: shareContent || `"${selectedPost.caption}" - @${selectedPost.username} 📸 Challenge: "${selectedPost.challenge}"`,
                url: selectedPost.photo || undefined,
            };
            
            await Share.share(shareOptions);
        };

        const showActionSheet = async (options) => {
            return new Promise((resolve) => {
                if (Platform.OS === 'ios') {
                    ActionSheetIOS.showActionSheetWithOptions(
                        {
                            options: options,
                            cancelButtonIndex: options.length - 1,
                        },
                        (buttonIndex) => {
                            resolve(buttonIndex);
                        }
                    );
                } else {
                    const buttons = options.slice(0, -1).map((option, index) => ({
                        text: option,
                        onPress: () => resolve(index),
                    }));
                    
                    buttons.push({
                        text: options[options.length - 1],
                        style: 'cancel',
                        onPress: () => resolve(options.length - 1),
                    });

                    Alert.alert(
                        'Choose an option',
                        '',
                        buttons,
                        { cancelable: true, onDismiss: () => resolve(options.length - 1) }
                    );
                }
            });
        };

        return (
            <Animated.View 
                style={[
                    common_styles.modalOverlay,
                    {
                        opacity: modalAnim,
                        transform: [{ scale: modalScale }]
                    }
                ]}
            >
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill}
                    onPress={closeModal}
                    activeOpacity={1}
                />
                <Animated.View style={common_styles.modalContent}>
                    <TouchableOpacity
                        style={common_styles.closeButton}
                        onPress={closeModal}
                    >
                        <Text style={common_styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.retroShareButton}
                        onPress={handleShare}
                        activeOpacity={0.8}
                    >
                        <View style={styles.retroShareIcon}>
                            <Text style={styles.retroShareIconText}>📤</Text>
                        </View>
                        <Text style={styles.retroShareText}>SHARE</Text>
                        <View style={styles.retroShareGlow} />
                    </TouchableOpacity>
                    
                    <View style={[
                        common_styles.polaroidLarge,
                        styles.modalPolaroid,
                        isCowardPost ? common_styles.failureContainer : {}
                    ]}>
                        {isCowardPost ? (
                            <View style={styles.modalPhotoContainer}>
                                <View style={[common_styles.photoFrame, styles.modalCowardPhotoContainer]}>
                                    <Text style={styles.modalCowardX}>✗</Text>
                                </View>
                                <View style={[
                                    common_styles.categoryBadge,
                                    { backgroundColor: getCategoryColor('COWARD') }
                                ]}>
                                    <Text style={common_styles.categoryBadgeText}>COWARD</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.modalPhotoContainer}>
                                <Image
                                    source={{ uri: selectedPost.photo }}
                                    style={[common_styles.photoFrame, styles.modalPostPhoto]}
                                    resizeMode="cover"
                                />
                                <View style={[
                                    common_styles.categoryBadge,
                                    { backgroundColor: getCategoryColor(selectedPost.category) }
                                ]}>
                                    <Text style={common_styles.categoryBadgeText}>{selectedPost.category.toUpperCase()}</Text>
                                </View>
                            </View>
                        )}
                        
                        <View style={[common_styles.captionArea, styles.modalCaptionArea]}>
                            <Text style={[common_styles.challengeText, styles.modalChallengeText]}>
                                {selectedPost.challenge}
                            </Text>
                            {isCowardPost ? (
                                <Text style={[common_styles.failureText, styles.modalCowardText]}>
                                    <Text style={styles.modalCowardUsername}>{selectedPost.username.toUpperCase()}</Text>
                                    <Text style={styles.modalCowardLabel}> is a </Text>
                                    <Text style={styles.modalCowardUsername}>COWARD</Text>
                                </Text>
                            ) : (
                                <Text style={[common_styles.captionText, styles.modalCaptionText]}>
                                    "{selectedPost.caption}"
                                </Text>
                            )}
                            <View style={common_styles.polaroidFooter}>
                            <TouchableOpacity
                                onPress={() => {
                                    handleUsernameFilter(selectedPost.username);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}>
                                <Text style={common_styles.usernameStamp}>@{selectedPost.username}</Text>
                            </TouchableOpacity>
                                <Text style={common_styles.dateStamp}>{formatTimeAgo(selectedPost.completed_at)}</Text>
                            </View>
                        </View>
                        
                        {hasLocation && (
                            <>
                                <View style={styles.mapContainer}>
                                    <MapView
                                        style={styles.modalMap}
                                        initialRegion={{
                                            latitude: parseFloat(selectedPost.latitude),
                                            longitude: parseFloat(selectedPost.longitude),
                                            latitudeDelta: 0.0922,
                                            longitudeDelta: 0.0421,
                                        }}
                                        scrollEnabled={false}
                                        zoomEnabled={false}
                                        rotateEnabled={false}
                                        pitchEnabled={false}
                                    >
                                        <Marker
                                            coordinate={{
                                                latitude: parseFloat(selectedPost.latitude),
                                                longitude: parseFloat(selectedPost.longitude),
                                            }}
                                            title="Challenge Location"
                                            description={selectedPost.challenge}
                                        />
                                    </MapView>
                                    <View style={styles.mapOverlay}>
                                        <Text style={styles.locationText}>📍 Challenge Location</Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={[styles.circleButton, { marginTop: 0, alignSelf: 'center' }]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        router.push({
                                            pathname: '/map',
                                            params: {
                                                latitude: selectedPost.latitude,
                                                longitude: selectedPost.longitude,
                                            }
                                        })
                                }}>
                                    <Text style={{ fontSize: 18 }}>🌎</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        
                        <View style={[common_styles.tapeHorizontal, common_styles.tapeTopLeft]} />
                        <View style={[common_styles.tapeHorizontal, common_styles.tapeBottomRight]} />
                    </View>
                </Animated.View>
            </Animated.View>
        );
    };

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={common_styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.vintageOrange} />
                <Text style={common_styles.loadingText}>Loading more posts...</Text>
            </View>
        );
    };

    if (!preloadComplete) {
        return (
            <View style={common_styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.vintageOrange} />
                <Text style={common_styles.loadingText}>Loading gallery...</Text>
            </View>
        );
    }

    return (
        <View style={common_styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
            <LinearGradient
                colors={[colors.lightBrown, colors.mediumBrown, colors.darkBrown]}
                style={common_styles.backgroundTexture}
            />
            <Animated.View style={[common_styles.header, { opacity: fadeAnim, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <TouchableOpacity
                    style={[common_styles.ghostButton, styles.backButton]}
                    onPress={() => {
                        router.navigate('/');
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                >
                    <Text style={common_styles.ghostButtonText}>← HOME</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={common_styles.headerTitle}>THE WALL</Text>
                    <Text style={common_styles.headerSubtitle}>PROOF OF COURAGE</Text>
                    <TouchableOpacity
                        style={[styles.filterToggle, (showMyPostsOnly || selectedUsername) && styles.filterToggleActive]}
                        onPress={() => {
                            setShowMyPostsOnly(!showMyPostsOnly);
                            setSelectedUsername(null); 
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[styles.filterToggleText, (showMyPostsOnly || selectedUsername) && styles.filterToggleTextActive]}>
                            {selectedUsername ? `👤 @${selectedUsername.toUpperCase()}` : 
                            showMyPostsOnly ? '📱 MY POSTS' : '🌍 ALL POSTS'}
                        </Text>
                    </TouchableOpacity>

                </View>
                <View style={{ width: 70 }} />
            </Animated.View>
            <View style={common_styles.headerLine} />
            <Animated.View style={[common_styles.galleryContainer, { opacity: fadeAnim }]}>
                <AnimatedFlatList
                    ref={flatListRef}
                    data={filteredPosts}
                    renderItem={renderPost}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={common_styles.galleryRow}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={common_styles.galleryContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.vintageOrange}
                            colors={[colors.vintageOrange]}
                            progressBackgroundColor={colors.polaroidWhite}
                            title="Pull to refresh..."
                            titleColor={colors.dustyRed}
                        />
                    }
                />
            </Animated.View>
            <View style={styles.bottomAccent} />
            {renderModal()}
            {renderCommentModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    postContainer: {
        flex: 0.48,
        marginBottom: 20,
        alignItems: 'center',
    },
    polaroidPost: {
        width: '100%',
        minHeight: 200,
    },
    photoContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    postPhoto: {
        height: 120,
        borderRadius: 2,
    },
    cowardPhotoContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
    },
    cowardX: {
        ...typography.headerLarge,
        color: colors.vintageRed,
        fontWeight: '900',
    },
    postCaptionArea: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    cowardText: {
        ...typography.bodySmall,
        color: colors.vintageRed,
        textAlign: 'center',
        fontWeight: '800',
        marginTop: 4,
    },
    cowardUsername: {
        ...typography.stamp,
        color: colors.vintageRed,
        letterSpacing: 1,
    },
    cowardLabel: {
        ...typography.bodySmall,
        color: colors.dustyRed,
    },
    modalPolaroid: {
        width: '100%',
        minHeight: 300,
    },
    modalPhotoContainer: {
        marginBottom: 12,
        position: 'relative',
    },
    modalPostPhoto: {
        height: 200,
        borderRadius: 2,
    },
    modalCowardPhotoContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
    },
    modalCowardX: {
        ...typography.headerLarge,
        fontSize: 48,
        color: colors.vintageRed,
        fontWeight: '900',
    },
    modalCaptionArea: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    modalChallengeText: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 10,
    },
    modalCaptionText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    modalCowardText: {
        fontSize: 16,
        marginBottom: 8,
    },
    modalCowardUsername: {
        ...typography.stamp,
        fontSize: 14,
        color: colors.vintageRed,
        letterSpacing: 1,
    },
    modalCowardLabel: {
        color: colors.dustyRed,
        fontSize: 14,
    },
    retroShareButton: {
        position: 'absolute',
        top: -25,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.forestGreen,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 2,
        borderColor: colors.oliveGreen,
        borderRadius: 4,
        zIndex: 10,
        transform: [{ rotate: '-2deg' }],
        ...shadows.lightShadow,
    },
    retroShareIcon: {
        marginRight: 6,
    },
    retroShareIconText: {
        fontSize: 14,
    },
    retroShareText: {
        ...typography.stamp,
        color: colors.polaroidWhite,
        fontSize: 10,
    },
    retroShareGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 6,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        minWidth: 70,
    },
    bottomAccent: {
        height: 4,
        backgroundColor: colors.lightBrown,
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 2,
        opacity: 0.6,
    },
    mapContainer: {
        marginTop: 10,
        borderRadius: 8,
        overflow: 'hidden',
        height: 150,
        position: 'relative',
        borderWidth: 2,
        borderColor: '#ddd',
    },
    modalMap: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    mapOverlay: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    locationText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    circleButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lightShadow,
    },
    filterToggle: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.lightBrown,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    filterToggleActive: {
        backgroundColor: colors.forestGreen,
        borderColor: colors.oliveGreen,
    },
    filterToggleText: {
        ...typography.stamp,
        fontSize: 10,
        color: colors.lightBrown,
        letterSpacing: 0.5,
    },
    filterToggleTextActive: {
        color: colors.polaroidWhite,
    },
    commentModalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
    },
    commentModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    commentModalContent: {
        backgroundColor: colors.polaroidWhite,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.8,
        minHeight: height * 0.5,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.lightBrown,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    commentModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightBrown,
    },
    commentModalTitle: {
        ...typography.headerMedium,
        color: colors.darkBrown,
        fontSize: 18,
    },
    commentCloseButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentCloseButtonText: {
        fontSize: 24,
        color: colors.dustyRed,
        fontWeight: 'bold',
    },
    commentPostPreview: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightBrown,
    },
    commentPostImageContainer: {
        width: 50,
        height: 50,
        marginRight: 12,
    },
    commentPostImage: {
        width: 50,
        height: 50,
        borderRadius: 4,
    },
    commentCowardPhoto: {
        width: 50,
        height: 50,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    commentCowardX: {
        fontSize: 20,
        color: colors.vintageRed,
        fontWeight: '900',
    },
    commentPostInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    commentPostUsername: {
        ...typography.stamp,
        color: colors.darkBrown,
        fontSize: 14,
        marginBottom: 4,
    },
    commentPostChallenge: {
        ...typography.bodySmall,
        color: colors.dustyRed,
        fontSize: 12,
    },
    commentsList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    commentItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(139, 115, 85, 0.1)',
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    commentAvatarText: {
        color: colors.polaroidWhite,
        fontSize: 14,
        fontWeight: 'bold',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentUsername: {
        ...typography.stamp,
        color: colors.darkBrown,
        fontSize: 12,
    },
    commentTimestamp: {
        ...typography.bodySmall,
        color: colors.dustyRed,
        fontSize: 10,
    },
    commentText: {
        ...typography.bodyMedium,
        color: colors.darkBrown,
        fontSize: 14,
        lineHeight: 18,
    },
    noCommentsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noCommentsText: {
        ...typography.headerMedium,
        color: colors.dustyRed,
        fontSize: 16,
        marginBottom: 8,
    },
    noCommentsSubText: {
        ...typography.bodySmall,
        color: colors.dustyRed,
        fontSize: 12,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.lightBrown,
        backgroundColor: colors.polaroidWhite,
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.lightBrown,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginRight: 12,
        maxHeight: 80,
        ...typography.bodyMedium,
        color: colors.darkBrown,
        backgroundColor: 'rgba(245, 245, 220, 0.3)',
    },
    commentSubmitButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: colors.lightBrown,
    },
    commentSubmitButtonActive: {
        backgroundColor: colors.forestGreen,
    },
    commentSubmitButtonText: {
        ...typography.stamp,
        color: colors.dustyRed,
        fontSize: 12,
    },
    commentSubmitButtonTextActive: {
        color: colors.polaroidWhite,
    },
    commentAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16, 
    },
});