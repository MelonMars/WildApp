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
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from './contexts/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';

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
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [modalAnim] = useState(new Animated.Value(0));

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

    const openModal = (post) => {
        setSelectedPost(post);
        Animated.spring(modalAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const closeModal = () => {
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
                username: 'you',
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
        console.log("Formatting time for date:", dateString);
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
                <Text style={styles.challengeText} numberOfLines={2}>
                    {item.challenge}
                </Text>
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

    const renderModal = () => {
        if (!selectedPost) return null;
        
        const isCowardPost = selectedPost.category === 'COWARD';
        const modalScale = modalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View 
                style={[
                    styles.modalOverlay,
                    {
                        opacity: modalAnim,
                        transform: [{ scale: modalScale }]
                    }
                ]}
            >
                <TouchableOpacity 
                    style={styles.modalBackground}
                    onPress={closeModal}
                    activeOpacity={1}
                />
                <Animated.View style={styles.modalContent}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={closeModal}
                    >
                        <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.modalPolaroid, isCowardPost ? styles.cowardPost : {}]}>
                        {isCowardPost ? (
                            <View style={styles.modalPhotoContainer}>
                                <View style={styles.modalCowardPhotoContainer}>
                                    <Text style={styles.modalCowardX}>✗</Text>
                                </View>
                                <View style={[
                                    styles.modalCategoryBadge,
                                    { backgroundColor: getCategoryColor('COWARD') }
                                ]}>
                                    <Text style={styles.modalCategoryText}>COWARD</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.modalPhotoContainer}>
                                <Image
                                    source={{ uri: selectedPost.photo }}
                                    style={styles.modalPostPhoto}
                                    resizeMode="cover"
                                />
                                <View style={[
                                    styles.modalCategoryBadge,
                                    { backgroundColor: getCategoryColor(selectedPost.category) }
                                ]}>
                                    <Text style={styles.modalCategoryText}>{selectedPost.category.toUpperCase()}</Text>
                                </View>
                            </View>
                        )}
                        
                        <View style={styles.modalCaptionArea}>
                            <Text style={styles.modalChallengeText}>
                                {selectedPost.challenge}
                            </Text>
                            {isCowardPost ? (
                                <Text style={styles.modalCowardText}>
                                    <Text style={styles.modalCowardUsername}>{selectedPost.username.toUpperCase()}</Text>
                                    <Text style={styles.modalCowardLabel}> is a </Text>
                                    <Text style={styles.modalCowardUsername}>COWARD</Text>
                                </Text>
                            ) : (
                                <Text style={styles.modalCaptionText}>
                                    "{selectedPost.caption}"
                                </Text>
                            )}
                            <View style={styles.modalPostFooter}>
                                <Text style={styles.modalUsernameText}>@{selectedPost.username}</Text>
                                <Text style={styles.modalTimeText}>{formatTimeAgo(selectedPost.completedAt)}</Text>
                            </View>
                        </View>
                        
                        <View style={[styles.modalCornerTear, { top: -2, left: -1 }]} />
                        <View style={[styles.modalCornerTear, { bottom: 10, right: -2 }]} />
                        <View style={[styles.modalTapeEffect, { top: -8, left: 30 }]} />
                        <View style={[styles.modalTapeEffect, { bottom: -8, right: 40 }]} />
                    </View>
                </Animated.View>
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
                colors={['#8B4513', '#654321', '#3D2914']}
                style={styles.background}
            />
            <Animated.View style={[styles.header, { opacity: fadeAnim, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <TouchableOpacity
                    style={[styles.backButton, { marginBottom: 0, marginTop: 0 }]}
                    onPress={() => router.navigate('/')}
                >
                    <Text style={styles.backButtonText}>← HOME</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>THE WALL</Text>
                    <Text style={styles.headerSubtitle}>PROOF OF COURAGE</Text>
                </View>
                <View style={{ width: 70 }} />
            </Animated.View>
            <View style={styles.headerLine} />
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
            {renderModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#3D2914',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#3D2914',
    },
    loadingText: {
        color: '#D2B48C',
        fontSize: 16,
        marginTop: 10,
        fontFamily: 'Courier New',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(61, 41, 20, 0.9)',
        borderBottomWidth: 3,
        borderBottomColor: '#8B4513',
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: 15,
        backgroundColor: '#8B4513',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 0,
        borderWidth: 2,
        borderColor: '#D2B48C',
    },
    backButtonText: {
        color: '#D2B48C',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#D2B48C',
        textAlign: 'center',
        marginBottom: 5,
        fontFamily: 'Courier New',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#CD853F',
        textAlign: 'center',
        letterSpacing: 2,
        fontFamily: 'Courier New',
    },
    headerLine: {
        height: 3,
        backgroundColor: '#8B4513',
        marginTop: 15,
        marginHorizontal: 40,
    },
    galleryContainer: {
        flex: 1,
        paddingTop: 20,
    },
    galleryContent: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    postContainer: {
        flex: 0.48,
        marginBottom: 15,
    },
    polaroidPost: {
        backgroundColor: '#F5F5DC',
        padding: 12,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#DDD',
        position: 'relative',
    },
    cowardPost: {
        backgroundColor: '#FFE4E1',
        borderColor: '#FF6B6B',
    },
    photoContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    postPhoto: {
        width: '100%',
        height: 120,
        backgroundColor: '#EEE',
        borderWidth: 1,
        borderColor: '#CCC',
    },
    cowardPhotoContainer: {
        width: '100%',
        height: 120,
        backgroundColor: '#FFB6C1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FF6B6B',
    },
    cowardX: {
        fontSize: 48,
        color: '#FF0000',
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    categoryBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#000',
    },
    categoryText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    postCaptionArea: {
        paddingHorizontal: 2,
    },
    challengeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: 4,
        fontFamily: 'Courier New',
    },
    captionText: {
        fontSize: 11,
        color: '#654321',
        fontStyle: 'italic',
        marginBottom: 6,
        fontFamily: 'Courier New',
    },
    cowardText: {
        fontSize: 11,
        marginBottom: 6,
        fontFamily: 'Courier New',
    },
    cowardUsername: {
        color: '#FF0000',
        fontWeight: 'bold',
    },
    cowardLabel: {
        color: '#654321',
    },
    postFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    usernameText: {
        fontSize: 10,
        color: '#8B4513',
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    timeText: {
        fontSize: 9,
        color: '#A0522D',
        fontFamily: 'Courier New',
    },
    cornerTear: {
        position: 'absolute',
        width: 12,
        height: 12,
        backgroundColor: '#3D2914',
        transform: [{ rotate: '45deg' }],
    },
    tapeEffect: {
        position: 'absolute',
        width: 30,
        height: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        opacity: 0.7,
    },
    loadingFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    bottomAccent: {
        height: 5,
        backgroundColor: '#8B4513',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContent: {
        width: '85%',
        maxWidth: 400,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: -15,
        right: -15,
        width: 40,
        height: 40,
        backgroundColor: '#8B4513',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 2,
        borderColor: '#D2B48C',
    },
    closeButtonText: {
        color: '#D2B48C',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    modalPolaroid: {
        backgroundColor: '#F5F5DC',
        padding: 20,
        paddingBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15,
        borderWidth: 2,
        borderColor: '#DDD',
        position: 'relative',
        transform: [{ rotate: '1deg' }],
    },
    modalPhotoContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    modalPostPhoto: {
        width: '100%',
        height: 250,
        backgroundColor: '#EEE',
        borderWidth: 2,
        borderColor: '#CCC',
    },
    modalCowardPhotoContainer: {
        width: '100%',
        height: 250,
        backgroundColor: '#FFB6C1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FF6B6B',
    },
    modalCowardX: {
        fontSize: 80,
        color: '#FF0000',
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    modalCategoryBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 0,
        borderWidth: 2,
        borderColor: '#000',
    },
    modalCategoryText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    modalCaptionArea: {
        paddingHorizontal: 5,
    },
    modalChallengeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: 10,
        textAlign: 'center',
        fontFamily: 'Courier New',
    },
    modalCaptionText: {
        fontSize: 14,
        color: '#654321',
        fontStyle: 'italic',
        marginBottom: 15,
        textAlign: 'center',
        fontFamily: 'Courier New',
    },
    modalCowardText: {
        fontSize: 14,
        marginBottom: 15,
        textAlign: 'center',
        fontFamily: 'Courier New',
    },
    modalCowardUsername: {
        color: '#FF0000',
        fontWeight: 'bold',
    },
    modalCowardLabel: {
        color: '#654321',
    },
    modalPostFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
    },
    modalUsernameText: {
        fontSize: 12,
        color: '#8B4513',
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
    modalTimeText: {
        fontSize: 11,
        color: '#A0522D',
        fontFamily: 'Courier New',
    },
    modalCornerTear: {
        position: 'absolute',
        width: 15,
        height: 15,
        backgroundColor: '#3D2914',
        transform: [{ rotate: '45deg' }],
    },
    modalTapeEffect: {
        position: 'absolute',
        width: 40,
        height: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        opacity: 0.7,
        transform: [{ rotate: '-8deg' }],
    },
});