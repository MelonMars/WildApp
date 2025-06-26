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
  Share
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from './contexts/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import MapView, { Marker } from 'react-native-maps';

import { PostService } from './services/postService';
import { common_styles, colors, typography, shadows } from './styles';

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

    const { newPost, challenge, category, photo, caption, completedAt, timestamp, isNewPost } = useLocalSearchParams();
    const { preloadedPosts, preloadedLastDoc, preloadedHasMore, preloadComplete } = useApp();

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

    const fetchMorePosts = async () => {
        if (loading || !hasMore || showMyPostsOnly) return;
        setLoading(true);
        try {
            const { posts: newPosts, lastDoc: newLastDoc, hasMore: moreAvailable } =
                await PostService.fetchPosts(lastDoc, 2);
            setPosts(prevPosts => [...prevPosts, ...newPosts]);
            setLastDoc(newLastDoc);
            setHasMore(moreAvailable);
        } catch (error) {
            console.error('Failed to fetch more posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            const { posts: freshPosts, lastDoc: newLastDoc, hasMore: moreAvailable } =
                await PostService.fetchPosts(null, 6);
            setPosts(freshPosts);
            setLastDoc(newLastDoc);
            setHasMore(moreAvailable);
        } catch (error) {
            console.error('Failed to refresh posts:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleEndReached = () => {
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

                const shareOptions = {
                    title: 'Check this out!',
                    message: shareContent,
                    url: selectedPost.photo || undefined, 
                };

                await Share.share(shareOptions);
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
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
                                <Text style={common_styles.usernameStamp}>@{selectedPost.username}</Text>
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
                        style={[styles.filterToggle, showMyPostsOnly && styles.filterToggleActive]}
                        onPress={() => {
                            setShowMyPostsOnly(!showMyPostsOnly);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[styles.filterToggleText, showMyPostsOnly && styles.filterToggleTextActive]}>
                            {showMyPostsOnly ? '📱 MY POSTS' : '🌍 ALL POSTS'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={{ width: 70 }} />
            </Animated.View>
            <View style={common_styles.headerLine} />
            <Animated.View style={[common_styles.galleryContainer, { opacity: fadeAnim }]}>
                <AnimatedFlatList
                    ref={flatListRef}
                    data={filteredPosts} // Changed from 'posts' to 'filteredPosts'
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
                />
            </Animated.View>
            <View style={styles.bottomAccent} />
            {renderModal()}
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
});