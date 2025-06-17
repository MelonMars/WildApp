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
  Image,
  FlatList,
} from 'react-native';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from './contexts/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function GalleryPage() {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [posts, setPosts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newPostAnim] = useState(new Animated.Value(0));
    const [isNewPostAnimating, setIsNewPostAnimating] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);

    const scrollY = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const autoScrollTimeoutRef = useRef(null);
    const router = useRouter();

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

    useEffect(() => {
        if (posts.length > 0 && !isAutoScrolling) {
            startAutoScroll();
        }
        return () => {
            if (autoScrollTimeoutRef.current) {
                clearTimeout(autoScrollTimeoutRef.current);
            }
        };
    }, [posts.length]);

    const startAutoScroll = () => {
        if (autoScrollTimeoutRef.current) {
            clearTimeout(autoScrollTimeoutRef.current);
        }
        autoScrollTimeoutRef.current = setTimeout(() => {
            if (flatListRef.current && posts.length > 2) {
                setIsAutoScrolling(true);
                try {
                    const scrollToIndex = Math.min(2, posts.length - 1);
                    flatListRef.current.scrollToIndex({
                        index: scrollToIndex,
                        animated: true,
                        viewPosition: 0.5
                    });
                } catch (error) {
                    console.log('Auto-scroll error:', error);
                }
                if (hasMore && !loading) {
                    fetchMorePosts();
                }
                setTimeout(() => {
                    setIsAutoScrolling(false);
                    startAutoScroll();
                }, 3000);
            }
        }, 4000);
    };

    const fetchMorePosts = async () => {
        if (loading || !hasMore) return;
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
        if (!isAutoScrolling) {
            fetchMorePosts();
        }
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
                username: 'you',
                likes: 0,
                comments: 0,
                ...parsedPost
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
        const now = new Date();
        const postDate = new Date(dateString);
        const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${Math.floor(diffInHours / 24)}d ago`;
    };

    const getCategoryColor = (category) => {
        const colors = {
            social: '#ff6b35',
            fitness: '#4CAF50',
            adventure: '#2196F3',
            creative: '#9C27B0',
            mindful: '#FF9800',
            COWARD: '#ff0000',
        };
        return colors[category] || '#666';
    };

    const renderCowardPost = (item, animatedTransforms, isNewPost) => {
        return (
            <View style={styles.photoContainer}>
                <View style={styles.cowardPhotoContainer}>
                    <Text style={styles.cowardX}>✗</Text>
                </View>
                <View style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor('COWARD') }
                ]}>
                    <Text style={styles.categoryText}>COWARD</Text>
                </View>
            </View>
        );
    };

    const renderNormalPost = (item) => {
        return (
            <View style={styles.photoContainer}>
                <Image
                    source={{ uri: item.photo }}
                    style={styles.postPhoto}
                    resizeMode="cover"
                />
                <View style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor(item.category) }
                ]}>
                    <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
                </View>
            </View>
        );
    };

    const renderCowardCaption = (item) => {
        return (
            <View style={styles.postCaptionArea}>
                <Text style={styles.cowardText}>
                    <Text style={styles.cowardUsername}>{item.username.toUpperCase()}</Text>
                    <Text style={styles.cowardLabel}> is a </Text>
                    <Text style={styles.cowardUsername}>COWARD</Text>
                </Text>
                <View style={styles.postFooter}>
                    <Text style={styles.timeText}>{formatTimeAgo(item.completedAt)}</Text>
                </View>
            </View>
        );
    };

    const renderNormalCaption = (item) => {
        return (
            <View style={styles.postCaptionArea}>
                <Text style={styles.challengeText} numberOfLines={2}>
                    {item.challenge}
                </Text>
                <Text style={styles.captionText} numberOfLines={2}>
                    "{item.caption}"
                </Text>
                <View style={styles.postFooter}>
                    <Text style={styles.usernameText}>@{item.username}</Text>
                    <Text style={styles.timeText}>{formatTimeAgo(item.completedAt)}</Text>
                </View>
                <View style={styles.engagementRow}>
                    <Text style={styles.likesText}>❤️ {item.likes}</Text>
                    <Text style={styles.commentsText}>💬 {item.comments}</Text>
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
                        styles.polaroidPost,
                        isNewPost ? {
                            borderWidth: 2,
                            borderColor: getCategoryColor(item.category),
                        } : {},
                        isCowardPost ? styles.cowardPost : {}
                    ]}
                    activeOpacity={0.9}
                >
                    {isCowardPost ?
                        renderCowardPost(item, animatedTransforms, isNewPost) :
                        renderNormalPost(item)
                    }
                    {isCowardPost ?
                        renderCowardCaption(item) :
                        renderNormalCaption(item)
                    }
                    <View style={[styles.cornerTear, { top: -2, left: -1 }]} />
                    <View style={[styles.cornerTear, { bottom: 10, right: -2 }]} />
                    <View style={[
                        styles.tapeEffect,
                        {
                            top: -5,
                            left: 20 + (index % 3) * 15,
                            transform: [{ rotate: `${(index % 5 - 2) * 3}deg` }]
                        }
                    ]} />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color="#ff6b35" />
                <Text style={styles.loadingText}>Loading more posts...</Text>
            </View>
        );
    };

    if (!preloadComplete) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff6b35" />
                <Text style={styles.loadingText}>Loading gallery...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
            <LinearGradient
                colors={['#2a2a2a', '#1a1a1a', '#0f0f0f']}
                style={styles.background}
            />
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.navigate('/')}
                >
                    <Text style={styles.backButtonText}>← HOME</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>THE WALL</Text>
                <Text style={styles.headerSubtitle}>PROOF OF COURAGE</Text>
                <View style={styles.headerLine} />
            </Animated.View>
            <Animated.View style={[styles.galleryContainer, { opacity: fadeAnim }]}>
                <AnimatedFlatList
                    ref={flatListRef}
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.galleryContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    onScrollBeginDrag={() => {
                        if (autoScrollTimeoutRef.current) {
                            clearTimeout(autoScrollTimeoutRef.current);
                        }
                    }}
                    onScrollEndDrag={() => {
                        if (!isAutoScrolling) {
                            startAutoScroll();
                        }
                    }}
                />
            </Animated.View>
            <View style={styles.bottomAccent} />
        </View>
    );
}

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
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 55,
        left: 20,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ff6b35',
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 4,
        marginTop: 10,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
        letterSpacing: 2,
        marginTop: 5,
    },
    headerLine: {
        width: 80,
        height: 3,
        backgroundColor: '#ff6b35',
        marginTop: 15,
        transform: [{ rotate: '-1deg' }],
    },
    galleryContainer: {
        flex: 1,
    },
    galleryContent: {
        padding: 10,
        paddingBottom: 30,
    },
    row: {
        justifyContent: 'space-around',
    },
    postContainer: {
        marginBottom: 20,
    },
    polaroidPost: {
        width: (width - 40) / 2,
        backgroundColor: '#f8f8f8',
        padding: 8,
        borderRadius: 2,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 0,
        elevation: 6,
        position: 'relative',
    },
    photoContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#ddd',
        marginBottom: 8,
        position: 'relative',
    },
    postPhoto: {
        width: '100%',
        height: '100%',
    },
    categoryBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        paddingHorizontal: 6,
        paddingVertical: 2,
        transform: [{ rotate: '2deg' }],
    },
    categoryText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    postCaptionArea: {
        minHeight: 80,
    },
    challengeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
        fontStyle: 'italic',
    },
    captionText: {
        fontSize: 9,
        color: '#666',
        marginBottom: 6,
        fontStyle: 'italic',
        lineHeight: 12,
    },
    postFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    usernameText: {
        fontSize: 8,
        fontWeight: '600',
        color: '#ff6b35',
    },
    timeText: {
        fontSize: 7,
        color: '#999',
    },
    engagementRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    likesText: {
        fontSize: 8,
        color: '#333',
    },
    commentsText: {
        fontSize: 8,
        color: '#333',
    },
    cornerTear: {
        position: 'absolute',
        width: 6,
        height: 6,
        backgroundColor: '#333',
        transform: [{ rotate: '45deg' }],
    },
    tapeEffect: {
        position: 'absolute',
        width: 25,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 1,
    },
    bottomAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 15,
        backgroundColor: '#ff6b35',
        opacity: 0.2,
        transform: [{ skewY: '1deg' }],
    },
    cowardPost: {
        borderColor: '#ff0000',
        borderWidth: 1,
    },
    cowardPhotoContainer: {
        width: '100%',
        height: 120,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    cowardX: {
        fontSize: 60,
        color: '#ff0000',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cowardText: {
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 8,
        fontWeight: 'bold',
    },
    cowardUsername: {
        color: '#ff0000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cowardLabel: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'normal',
    },
    loadingFooter: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#ccc',
        fontSize: 12,
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
});
