import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, ScrollView, Image, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from './contexts/AppContext';
import { common_styles, colors, typography, shadows } from './styles'; 
import * as Haptics from 'expo-haptics';
import { PostService } from './services/postService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from './contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

export default function Profile() {
    const router = useRouter();
    const { user, loading, logOut } = useAuth();
    const [profileData, setProfileData] = useState({
        level: 1,
        streak: 0,
        totalChallenges: 0,
        socialChallenges: 0,
        adventureChallenges: 0,
        creativeChallenges: 0,
        dailyChallenges: 0,
        achievements: []
    });
    const params = useLocalSearchParams();
    const [showAllAchievements, setShowAllAchievements] = useState(false);
    const [showAchievementsModal, setShowAchievementsModal] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [username, setUsername] = useState(user?.name || user?.email.split('@')[0] || 'anonymous');
    const [profilePicture, setProfilePicture] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [showFriendsModal, setShowFriendsModal] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [activeTab, setActiveTab] = useState('friends');

    const [isLoading, setIsLoading] = useState(true);

    if (loading) {
        return (
            <View style={common_styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBrown} />
                <LinearGradient
                    colors={[colors.lightBrown, colors.mediumBrown, colors.darkBrown]}
                    style={common_styles.backgroundTexture}
                />
                <View style={common_styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.vintageOrange} />
                    <Text style={common_styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    if (!user) {
        router.replace('/authentication');
        return null;
    }

    const loadFriendsData = async () => {
        try {
          const [requests, friendsList] = await Promise.all([
            PostService.getPendingFriendRequests(user),
            PostService.getFriends(user)
          ]);
          setFriendRequests(requests);
          setFriends(friendsList);
        } catch (error) {
          console.error('Error loading friends data:', error);
        }
    };

    const searchUsers = async () => {
        if (!searchTerm.trim()) {
          setSearchResults([]);
          return;
        }
        
        try {
          const results = await PostService.searchUsers(user, searchTerm.trim());
          const resultsWithStatus = await Promise.all(
            results.map(async (result) => {
              const statusData = await PostService.getFriendshipStatus(user, result.id);
              let friendshipStatus = 'none';
              
              if (statusData) {
                if (statusData.status === 'accepted') {
                  friendshipStatus = 'friends';
                } else if (statusData.status === 'pending') {
                  if (statusData.requester_id === user.id) {
                    friendshipStatus = 'sent';
                  } else {
                    friendshipStatus = 'pending';
                  }
                }
              }
              
              return { ...result, friendshipStatus };
            })
          );
          console.log('Search results:', resultsWithStatus);
          setSearchResults(resultsWithStatus);
        } catch (error) {
          console.error('Error searching users:', error);
        }
    };
    

    const sendFriendRequest = async (targetUserId) => {
        console.log(`Sending friend request to user ID: ${targetUserId}`);
        try {
          const existingStatus = await PostService.getFriendshipStatus(user, targetUserId);
          if (existingStatus) {
            alert('Friend request already exists or you are already friends!');
            return;
          }
          
          setSearchResults(prevResults => 
            prevResults.map(result => 
              result.id === targetUserId 
                ? { ...result, friendshipStatus: 'sent' }
                : result
            )
          );
          
          await PostService.sendFriendRequest(user, targetUserId);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
          console.error('Error sending friend request:', error);
          
          setSearchResults(prevResults => 
            prevResults.map(result => 
              result.id === targetUserId 
                ? { ...result, friendshipStatus: 'none' }
                : result
            )
          );
          
          alert('Failed to send friend request');
        }
    };

    const respondToRequest = async (requestId, response) => {
        try {
          await PostService.respondToFriendRequest(requestId, response);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          loadFriendsData();
        } catch (error) {
          console.error('Error responding to friend request:', error);
          alert('Failed to respond to friend request');
        }
    };      
      
    const getFilteredAchievements = () => {
        if (selectedDifficulty === 'all') {
            return profileData.achievements;
        }
        return profileData.achievements.filter(achievement => 
            achievement.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase()
        );
    };

    const selectProfilePicture = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (permissionResult.granted === false) {
                alert("Permission to access camera roll is required!");
                return;
            }
    
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
    
            if (!result.canceled && result.assets[0]) {
                setIsUploadingImage(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                
                const imageUri = result.assets[0].uri;
                
                try {
                    const uploadedImageUrl = await PostService.uploadProfilePicture(user, imageUri);
                    setProfilePicture(uploadedImageUrl);
                    
                    await AsyncStorage.setItem(`profilePicture_${user.id}`, uploadedImageUrl);
                } catch (error) {
                    console.error('Error uploading profile picture:', error);
                    alert('Failed to upload profile picture. Please try again.');
                } finally {
                    setIsUploadingImage(false);
                }
            }
        } catch (error) {
            console.error('Error selecting profile picture:', error);
            setIsUploadingImage(false);
        }
    };    

    const loadProfileData = async () => {
        setIsLoading(true);
        try {
            const storedStreak = params?.streak || 0;
            const streak = storedStreak ? parseInt(storedStreak, 10) : 0;

            const posts = params.usersPosts;
            let stats = {
                totalChallenges: 0,
                socialChallenges: 0,
                adventureChallenges: 0,
                creativeChallenges: 0,
                dailyChallenges: 0
            };

            if (posts) {
                const parsedPosts = JSON.parse(posts);
                const completedChallenges = parsedPosts.filter(post => post.challenge);
                
                stats.totalChallenges = completedChallenges.length;
                stats.socialChallenges = completedChallenges.filter(c => c.challenge.category === 'social').length;
                stats.adventureChallenges = completedChallenges.filter(c => c.challenge.category === 'adventure').length;
                stats.creativeChallenges = completedChallenges.filter(c => c.challenge.category === 'creative').length;
                stats.dailyChallenges = completedChallenges.filter(c => c.challenge.category === 'daily').length;
            }

            const level = await PostService.getLevel(user);

            const userAchievements = await PostService.getAchievements(user);
            const allAchievements = await PostService.getAllAchievements();
            const updatedAchievements = userAchievements.map(ua => {
                const achievement = allAchievements.find(a => a.id === ua.id);
                return {
                    ...achievement,
                    unlocked: !!ua
                };
            });
            const lockedAchievements = allAchievements.filter(a => !updatedAchievements.some(ua => ua.id === a.id));
            updatedAchievements.push(...lockedAchievements.map(a => ({
                ...a,
                unlocked: false
            })));
            const savedProfilePicture = await AsyncStorage.getItem(`profilePicture_${user.id}`);
            if (savedProfilePicture) {
                setProfilePicture(savedProfilePicture);
            } else {
                try {
                    const serverProfilePicture = await PostService.getProfilePicture(user);
                    if (serverProfilePicture) {
                        setProfilePicture(serverProfilePicture);
                        await AsyncStorage.setItem(`profilePicture_${user.id}`, serverProfilePicture);
                    }
                } catch (error) {
                    console.error('Error loading profile picture from server:', error);
                }
            }
            setProfileData({
                level,
                streak,
                ...stats,
                achievements: updatedAchievements
            });

        } catch (error) {
            console.error('Error loading profile data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadProfileData();
        }, [])
    );

    const navigateToGallery = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: '/gallery',
            params: { userOnly: 'true' }
        });
    };

    const navigateBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const getNextLevelProgress = () => {
        const challengesInCurrentLevel = profileData.totalChallenges % 5;
        return (challengesInCurrentLevel / 5) * 100;
    };

    const handleNameSave = async () => {
        if (tempName.trim() && tempName !== username) {
            try {
                await PostService.updateUserName(user, tempName.trim());
                setUsername(tempName.trim());
            } catch (error) {
                console.error('Error updating name:', error);
            }
        }
        setIsEditingName(false);
    };

    const handleLogout = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logOut();
            router.replace('/authentication');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };


    const renderAchievement = (achievement) => (
        <View 
            key={achievement.id} 
            style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementLocked
            ]}
        >
            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            <Text style={[styles.achievementName, !achievement.unlocked && styles.achievementTextLocked]}>
                {achievement.name}
            </Text>
            <Text style={[styles.achievementDescription, !achievement.unlocked && styles.achievementTextLocked]}>
                {achievement.description}
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={common_styles.container}>
                <View style={common_styles.backgroundTexture} />
                <View style={common_styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.vintageOrange} />
                    <Text style={common_styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={common_styles.container} showsVerticalScrollIndicator={false}>
            <View style={common_styles.backgroundTexture} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.profileSection}>
                <View style={styles.profilePictureContainer}>
                    <TouchableOpacity 
                        style={styles.profilePictureContainer}
                        onPress={selectProfilePicture}
                        disabled={isUploadingImage}
                        activeOpacity={0.7}
                    >
                        {isUploadingImage ? (
                            <View style={styles.profilePicture}>
                                <ActivityIndicator size="large" color={colors.polaroidWhite} />
                            </View>
                        ) : profilePicture ? (
                            <Image source={{ uri: profilePicture }} style={styles.profilePictureImage} />
                        ) : (
                            <View style={styles.profilePicture}>
                                <Text style={styles.profilePictureText}>
                                    {username
                                        ? username.charAt(0).toUpperCase()
                                        : user?.email
                                            ? user.email.charAt(0).toUpperCase()
                                            : '?'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.profilePictureTape} />
                        <View style={styles.cameraOverlay}>
                            <Text style={styles.cameraIcon}>📷</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.profilePictureTape} />
                </View>
                
                {isEditingName ? (
                    <View style={styles.nameEditContainer}>
                        <TextInput
                            style={styles.nameInput}
                            value={tempName}
                            onChangeText={setTempName}
                            onBlur={handleNameSave}
                            onSubmitEditing={handleNameSave}
                            autoFocus
                            placeholder="Enter your name"
                            placeholderTextColor={colors.peach}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => {
                        setTempName(username || '');
                        setIsEditingName(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                        <Text style={styles.userName}>{username || 'Wild Explorer'} ✏️</Text>
                    </TouchableOpacity>
                )}
                
                <View style={styles.levelContainer}>
                    <Text style={styles.levelText}>Level {profileData.level}</Text>
                </View>
            </View>

            <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Stats</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.streak}</Text>
                        <Text style={styles.statLabel}>🔥 Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.totalChallenges}</Text>
                        <Text style={styles.statLabel}>🎯 Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.socialChallenges}</Text>
                        <Text style={styles.statLabel}>🤝 Social</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.adventureChallenges}</Text>
                        <Text style={styles.statLabel}>🧭 Adventure</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.creativeChallenges}</Text>
                        <Text style={styles.statLabel}>🎨 Creative</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{profileData.dailyChallenges}</Text>
                        <Text style={styles.statLabel}>📅 Daily</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity 
                style={styles.achievementsSection}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAchievementsModal(true);
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={styles.achievementsGrid}>
                    {profileData.achievements.slice(0, 5).map(renderAchievement)}
                </View>
                {profileData.achievements.length > 5 && (
                    <View style={styles.expandButton}>
                        <Text style={styles.expandButtonText}>
                            TAP TO VIEW ALL ({profileData.achievements.length})
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
                <Modal
                    visible={showAchievementsModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowAchievementsModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Achievements</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowAchievementsModal(false);
                                }}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterContainer}>
                            <Text style={styles.filterLabel}>Filter by Difficulty:</Text>
                            <View style={styles.filterButtons}>
                                {['all', 'easy', 'medium', 'hard', 'expert'].map((difficulty) => (
                                    <TouchableOpacity
                                        key={difficulty}
                                        style={[
                                            styles.filterButton,
                                            selectedDifficulty === difficulty && styles.filterButtonActive
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedDifficulty(difficulty);
                                        }}
                                    >
                                        <Text style={[
                                            styles.filterButtonText,
                                            selectedDifficulty === difficulty && styles.filterButtonTextActive
                                        ]}>
                                            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <ScrollView 
                            style={styles.modalContent}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalAchievementsGrid}
                        >
                            {getFilteredAchievements().map(renderAchievement)}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Text style={styles.resultsCount}>
                                Showing {getFilteredAchievements().length} of {profileData.achievements.length} achievements
                            </Text>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={showFriendsModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowFriendsModal(false)}
                    >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Friends</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowFriendsModal(false);
                            }}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        </View>

                        <View style={styles.tabContainer}>
                        {['friends', 'requests', 'search'].map((tab) => (
                            <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => {
                                setActiveTab(tab);
                                if (tab === 'search') searchUsers();
                            }}
                            >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab === 'friends' && `Friends (${friends.length})`}
                                {tab === 'requests' && `Requests ${friendRequests.length > 0 ? `(${friendRequests.length})` : ''}`}
                                {tab === 'search' && 'Add Friends'}
                            </Text>
                            </TouchableOpacity>
                        ))}
                        </View>

                        <ScrollView style={styles.modalContent}>
  {activeTab === 'search' && (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by email or name..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        onSubmitEditing={searchUsers}
        placeholderTextColor={colors.peach}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.searchButton} onPress={searchUsers}>
        <Text style={styles.searchButtonText}>🔍</Text>
      </TouchableOpacity>
    </View>
  )}

  {activeTab === 'friends' && (
    <View style={styles.friendsContainer}>
      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>👥</Text>
          <Text style={styles.emptyStateText}>No friends yet</Text>
          <Text style={styles.emptyStateSubtext}>Search for friends to get started!</Text>
        </View>
      ) : (
        friends.map((friend) => (
          <View key={friend.id} style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {friend.name ? friend.name.charAt(0).toUpperCase() : friend.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{friend.name || friend.email.split('@')[0]}</Text>
              <Text style={styles.userEmail}>{friend.email}</Text>
            </View>
            <View style={styles.friendBadge}>
              <Text style={styles.friendBadgeText}>Friend</Text>
            </View>
          </View>
        ))
      )}
    </View>
  )}

  {activeTab === 'requests' && (
    <View style={styles.requestsContainer}>
      {friendRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📬</Text>
          <Text style={styles.emptyStateText}>No friend requests</Text>
          <Text style={styles.emptyStateSubtext}>You're all caught up!</Text>
        </View>
      ) : (
        friendRequests.map((request) => (
          <View key={request.id} style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {request.sender.name ? request.sender.name.charAt(0).toUpperCase() : request.sender.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{request.sender.name || request.sender.email.split('@')[0]}</Text>
              <Text style={styles.userEmail}>{request.sender.email}</Text>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => respondToRequest(request.id, 'accept')}
              >
                <Text style={styles.acceptButtonText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => respondToRequest(request.id, 'decline')}
              >
                <Text style={styles.declineButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  )}

  {activeTab === 'search' && searchResults.length > 0 && (
    <View style={styles.searchResultsContainer}>
      <Text style={styles.searchResultsTitle}>Search Results</Text>
      {searchResults.map((result) => (
        <View key={result.id} style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {result.name ? result.name.charAt(0).toUpperCase() : result.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{result.name || result.email.split('@')[0]}</Text>
            <Text style={styles.userEmail}>{result.email}</Text>
          </View>
          <View style={styles.actionButton}>
            {result.friendshipStatus === 'friends' ? (
              <View style={styles.friendBadge}>
                <Text style={styles.friendBadgeText}>Friend</Text>
              </View>
            ) : result.friendshipStatus === 'pending' || result.friendshipStatus === 'sent' ? (
              <View style={styles.sentBadge}>
                <Text style={styles.sentBadgeText}>Sent</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => sendFriendRequest(result.id)}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  )}

  {activeTab === 'search' && searchTerm.trim() !== '' && searchResults.length === 0 && (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔍</Text>
      <Text style={styles.emptyStateText}>No users found</Text>
      <Text style={styles.emptyStateSubtext}>Try searching with a different email or name</Text>
    </View>
  )}
</ScrollView>
                    </View>
                    </Modal>

            <View style={styles.actionsSection}>  
                <TouchableOpacity style={styles.galleryButton} onPress={navigateToGallery}>
                    <Text style={styles.galleryButtonText}>🖼️ MY WALL</Text>
                    <View style={styles.galleryButtonDistress} />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.galleryButton, { marginTop: 15 }]} 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        loadFriendsData();
                        setShowFriendsModal(true);
                    }}
                >
                    <Text style={styles.galleryButtonText}>
                        👥 FRIENDS {friendRequests.length > 0 && `(${friendRequests.length})`}
                    </Text>
                    {friendRequests.length > 0 && (
                        <View style={styles.notificationBadge}>
                        <Text style={styles.notificationText}>{friendRequests.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutButtonBottom} onPress={handleLogout}>
                    <Text style={styles.logoutButtonBottomText}>🚪 LOG OUT</Text>
                </TouchableOpacity>
                <View style={[common_styles.tapeHorizontal, styles.bottomTape]} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        fontSize: 28,
        color: colors.tan,
        fontWeight: 'bold',
    },
    headerTitle: {
        ...typography.headerLarge,
        color: colors.tan,
        fontWeight: '900',
        letterSpacing: 3,
        fontSize: 24,
    },
    headerSpacer: {
        width: 48,
    },
    
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 30,
    },
    profilePictureContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    profilePicture: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.tan,
        ...shadows.lightShadow,
    },
    profilePictureText: {
        fontSize: 36,
        color: colors.polaroidWhite,
        fontWeight: 'bold',
    },
    profilePictureTape: {
        position: 'absolute',
        top: -5,
        right: 10,
        width: 30,
        height: 15,
        backgroundColor: colors.vintageOrange,
        transform: [{ rotate: '15deg' }],
        opacity: 0.8,
    },
    userName: {
        ...typography.headerMedium,
        color: colors.tan,
        textAlign: 'center',
        fontWeight: '700',
        marginBottom: 20,
    },
    
    levelContainer: {
        alignItems: 'center',
        width: '100%',
    },
    levelText: {
        ...typography.headerSmall,
        color: colors.vintageOrange,
        fontWeight: '800',
        marginBottom: 10,
        fontSize: 18,
    },
    progressBarContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBarBackground: {
        width: '80%',
        height: 8,
        backgroundColor: colors.darkGray,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.vintageOrange,
        borderRadius: 4,
    },
    progressText: {
        ...typography.bodySmall,
        color: colors.peach,
        fontSize: 12,
    },
    
    statsSection: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    sectionTitle: {
        ...typography.headerMedium,
        color: colors.tan,
        fontWeight: '800',
        marginBottom: 15,
        textAlign: 'center',
        letterSpacing: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: colors.lightBrown,
        padding: 15,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.tan,
        width: '30%',
        alignItems: 'center',
        marginBottom: 10,
        transform: [{ rotate: '0.5deg' }],
        ...shadows.lightShadow,
    },
    statNumber: {
        ...typography.headerLarge,
        color: colors.polaroidWhite,
        fontWeight: '900',
        fontSize: 24,
    },
    statLabel: {
        ...typography.bodySmall,
        color: colors.peach,
        textAlign: 'center',
        marginTop: 5,
        fontSize: 11,
        fontWeight: '600',
    },
    
    achievementsSection: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    achievementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    achievementCard: {
        backgroundColor: colors.forestGreen,
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.oliveGreen,
        width: '48%',
        alignItems: 'center',
        marginBottom: 12,
        transform: [{ rotate: '-0.5deg' }],
        ...shadows.lightShadow,
    },
    achievementLocked: {
        backgroundColor: colors.darkGray,
        borderColor: colors.mediumGray,
        opacity: 0.6,
    },
    achievementIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    achievementName: {
        ...typography.bodyMedium,
        color: colors.polaroidWhite,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
        fontSize: 12,
    },
    achievementDescription: {
        ...typography.bodySmall,
        color: colors.peach,
        textAlign: 'center',
        fontSize: 10,
        lineHeight: 12,
    },
    achievementTextLocked: {
        color: colors.mediumGray,
    },
    
    actionsSection: {
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
    bottomTape: {
        bottom: 20,
        right: 30,
        transform: [{ rotate: '12deg' }],
    },
    expandButton: {
        backgroundColor: colors.forestGreen,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.oliveGreen,
        alignSelf: 'center',
        marginTop: 15,
        transform: [{ rotate: '0.5deg' }],
        ...shadows.lightShadow,
    },
    expandButtonText: {
        ...typography.bodyMedium,
        color: colors.polaroidWhite,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 1,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.mediumBrown,
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: colors.tan,
        backgroundColor: colors.mediumBrown,
    },
    modalTitle: {
        ...typography.headerLarge,
        color: colors.tan,
        fontWeight: '900',
        letterSpacing: 3,
        fontSize: 24,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.tan,
        transform: [{ rotate: '-2deg' }],
        ...shadows.lightShadow,
    },
    closeButtonText: {
        fontSize: 18,
        color: colors.polaroidWhite,
        fontWeight: 'bold',
    },
    filterContainer: {
        padding: 20,
        borderBottomWidth: 2,
        borderBottomColor: colors.tan,
        backgroundColor: colors.mediumBrown,
    },
    filterLabel: {
        ...typography.headerSmall,
        color: colors.tan,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: 1,
    },
    filterButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.lightBrown,
        borderWidth: 2,
        borderColor: colors.tan,
        transform: [{ rotate: '0.5deg' }],
        ...shadows.lightShadow,
    },
    filterButtonActive: {
        backgroundColor: colors.vintageOrange,
        borderColor: colors.tan,
        transform: [{ rotate: '-0.5deg' }],
    },
    filterButtonText: {
        ...typography.bodySmall,
        color: colors.peach,
        fontWeight: '600',
    },
    filterButtonTextActive: {
        color: colors.polaroidWhite,
        fontWeight: '700',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: colors.lightBrown,
    },
    modalAchievementsGrid: {
        paddingVertical: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 2,
        borderTopColor: colors.tan,
        backgroundColor: colors.mediumBrown,
    },
    resultsCount: {
        ...typography.bodySmall,
        color: colors.peach,
        textAlign: 'center',
        fontWeight: '600',
    },
    nameEditContainer: {
        marginBottom: 20,
    },
    nameInput: {
        ...typography.headerMedium,
        color: colors.tan,
        textAlign: 'center',
        fontWeight: '700',
        borderBottomWidth: 2,
        borderBottomColor: colors.vintageOrange,
        paddingVertical: 5,
        minWidth: 200,
    },
    logoutButtonBottom: {
        backgroundColor: colors.vintageRed,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderWidth: 2,
        borderColor: colors.tan,
        marginTop: 15,
        transform: [{ rotate: '0.5deg' }],
        ...shadows.lightShadow,
    },
    logoutButtonBottomText: {
        ...typography.bodyMedium,
        color: colors.polaroidWhite,
        textAlign: 'center',
        fontWeight: '700',
        letterSpacing: 2,
    },
    profilePictureImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: colors.tan,
        ...shadows.lightShadow,
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.vintageOrange,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.tan,
        ...shadows.lightShadow,
    },
    cameraIcon: {
        fontSize: 16,
    },    
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.mediumBrown,
        borderBottomWidth: 2,
        borderBottomColor: colors.tan,
    }, 
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: colors.vintageOrange,
        backgroundColor: colors.lightBrown,
    },
    tabText: {
        ...typography.bodyMedium,
        color: colors.peach,
        fontWeight: '600',
        fontSize: 12,
    },
    activeTabText: {
        color: colors.polaroidWhite,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        backgroundColor: colors.mediumBrown,
        borderWidth: 2,
        borderColor: colors.tan,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        color: colors.tan,
        fontSize: 16,
        fontWeight: '600',
    },
    searchButton: {
        backgroundColor: colors.vintageOrange,
        borderWidth: 2,
        borderColor: colors.tan,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lightShadow,
    },
    searchButtonText: {
        fontSize: 18,
    },
    friendsContainer: {
        padding: 20,
    },
      requestsContainer: {
        padding: 20,
    },
    searchResultsContainer: {
        padding: 20,
        paddingTop: 0,
    },
    searchResultsTitle: {
        ...typography.headerSmall,
        color: colors.tan,
        fontWeight: '800',
        marginBottom: 15,
        letterSpacing: 1,
    },
    userCard: {
        backgroundColor: colors.mediumBrown,
        borderWidth: 2,
        borderColor: colors.tan,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        transform: [{ rotate: '0.3deg' }],
        ...shadows.lightShadow,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.tan,
        marginRight: 12,
    },
    userAvatarText: {
        color: colors.polaroidWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        ...typography.bodyMedium,
        color: colors.tan,
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 2,
    },
    userEmail: {
        ...typography.bodySmall,
        color: colors.peach,
        fontSize: 12,
    },
    actionButton: {
        marginLeft: 8,
    },
    addButton: {
        backgroundColor: colors.vintageOrange,
        borderWidth: 2,
        borderColor: colors.tan,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        transform: [{ rotate: '-1deg' }],
        ...shadows.lightShadow,
    },
    addButtonText: {
        color: colors.polaroidWhite,
        fontWeight: '700',
        fontSize: 14,
    },
    friendBadge: {
        backgroundColor: colors.forestGreen,
        borderWidth: 2,
        borderColor: colors.oliveGreen,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        transform: [{ rotate: '1deg' }],
    },
    friendBadgeText: {
        color: colors.polaroidWhite,
        fontWeight: '600',
        fontSize: 12,
    },
    pendingBadge: {
        backgroundColor: colors.darkGray,
        borderWidth: 2,
        borderColor: colors.mediumGray,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        transform: [{ rotate: '-0.5deg' }],
    },
    pendingBadgeText: {
        color: colors.peach,
        fontWeight: '600',
        fontSize: 12,
    },
    sentBadge: {
        backgroundColor: colors.vintageOrange,
        borderWidth: 2,
        borderColor: colors.tan,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        transform: [{ rotate: '0.5deg' }],
        opacity: 0.8,
    },
    sentBadgeText: {
        color: colors.polaroidWhite,
        fontWeight: '600',
        fontSize: 12,
    },    
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    acceptButton: {
        backgroundColor: colors.forestGreen,
        borderWidth: 2,
        borderColor: colors.oliveGreen,
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '2deg' }],
        ...shadows.lightShadow,
    },
    acceptButtonText: {
        color: colors.polaroidWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
    declineButton: {
        backgroundColor: colors.vintageRed,
        borderWidth: 2,
        borderColor: colors.tan,
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '-2deg' }],
        ...shadows.lightShadow,
    },
    declineButtonText: {
        color: colors.polaroidWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyStateText: {
        ...typography.headerMedium,
        color: colors.tan,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        ...typography.bodyMedium,
        color: colors.peach,
        textAlign: 'center',
        lineHeight: 20,
    },
    notificationBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: colors.vintageRed,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.polaroidWhite,
        ...shadows.lightShadow,
    },
    notificationText: {
        color: colors.polaroidWhite,
        fontSize: 12,
        fontWeight: 'bold',
    },
});