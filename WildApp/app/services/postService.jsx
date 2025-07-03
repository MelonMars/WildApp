import { supabase } from '../config/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export class PostService {
  static async uploadPhoto(photoUri, fileName = null) {
    try {
      console.log('Reading file from URI:', photoUri);
      
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const uniqueFileName = fileName || `post_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      console.log('Uploading file:', uniqueFileName);
      
      const { data, error } = await supabase.storage
        .from('posts')
        .upload(uniqueFileName, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(data.path);

      console.log('File uploaded successfully, public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  static async fetchPosts(lastDoc = null, pageSize = 2) {
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          username,
          challenge,
          category,
          photo,
          caption,
          likes,
          completed_at,
          timestamp,
          created_at,
          latitude,
          longitude,
          users_who_liked,
          comments,
          owner
        `)
        .order('completed_at', { ascending: false })
        .limit(pageSize);

      if (lastDoc) {
        const { data: lastDocData, error: lastDocError } = await supabase
          .from('posts')
          .select('completed_at')
          .eq('id', lastDoc)
          .single();

        if (lastDocError) {
          console.warn('Could not find last document, fetching from beginning');
        } else {
          query = query.lt('completed_at', lastDocData.completed_at);
        }
      }

      const { data: posts, error } = await query;

      if (error) {
        throw error;
      }

      const hasMore = posts.length === pageSize;
      const lastVisible = posts.length > 0 ? posts[posts.length - 1].id : null;

      return {
        posts: posts || [],
        lastDoc: lastVisible,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  static async preloadPosts(count = 6) {
    try {
      const result = await this.fetchPosts(null, count);
      return result;
    } catch (error) {
      console.error('Error preloading posts:', error);
      return { posts: [], lastDoc: null, hasMore: false };
    }
  }

  static async insertPostRow(postPayload) {
    const { data, error } = await supabase
      .from('posts')
      .insert([postPayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createPost(postData, user = null) {
    try {
      const currentTimestamp = new Date().toISOString();
      const username = (await this.getName(user?.id)) || 'anonymous';
      const payload = {
        username: username,
        challenge: postData.challenge,
        category: postData.category,
        photo: postData.photo,
        caption: postData.caption,
        completed_at: postData.completedAt || currentTimestamp,
        timestamp: postData.timestamp || currentTimestamp,
        likes: 0,
        comments: 0,  
        latitude: postData.latitude || null,
        longitude: postData.longitude || null,
        owner: user?.id || null,
      };

      const data = await this.insertPostRow(payload);

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('posts')
        .eq('id', user.id)
        .single();
      if (fetchError) throw fetchError;

      const updatedPosts = [...(userData.posts || []), data.id];
      const { error: updateError } = await supabase
        .from('users')
        .update({ posts: updatedPosts })
        .eq('id', user.id);
      if (updateError) throw updateError;

      const oldStreak = await this.getStreak(user.id);
      const lastUpdated = await this.getStreakLastUpdated(user);
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let currentStreak = oldStreak;
      let newStreak = false;

      if (lastUpdated === yesterday) {
        currentStreak = oldStreak + 1;
        newStreak = true;
      } else if (lastUpdated !== today) {
        currentStreak = 1;
        newStreak = oldStreak === 0;
      }

      await this.updateStreak(user, currentStreak);
      await this.updateStreakLastUpdated(user, today);

      const levelData = await this.getLevel(user.id);

      return {
        ...data,
        streakInfo: {
          streak: currentStreak,
          previousStreak: oldStreak,
          newStreak,
          streakIncreased: currentStreak > oldStreak,
        },
        level: levelData,
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async togglePostLike(postId, user) {
    console.log('toggling like...');
    try {
      if (!user || !user.id) {
        throw new Error('User must be authenticated to like posts');
      }
  
      if (!postId) {
        throw new Error('Post ID is required');
      }
  
      console.log('Toggling like for post:', postId, 'by user:', user.id);
      const earlyLikedPosts = await this.getUserLikedPosts(user.id);
      console.log("Early liked posts: ", earlyLikedPosts);
      const { data, error } = await supabase
        .rpc('toggle_post_like', {
          post_id: postId,
          user_id: user.id
        });
  
      if (error) {
        console.error('Error toggling post like:', error);
        throw error;
      }
  
      const result = data[0];
      const postOwner = result.owner_post

      console.log('Like toggled:', result);
      if (result.liked) {
        console.log('User liked the post');
        const likedPosts = await this.getUserLikedPosts(user.id);
        console.log("Got liked posts: ", likedPosts);
        const { error: updateError } = await supabase
          .from('users')
          .update({
            liked_posts: [...(likedPosts || []), postId]
          })
          .eq('id', user.id);
        if (updateError) {
          console.error('Error updating user liked posts:', updateError);
        }
        const {error: updateOwnerError} = await supabase
          .from('users')
          .update({
            likes_received: (await this.getUserLikes(postOwner) || 0) + 1
          })
          .eq('id', postOwner);
        if (updateOwnerError) {
          console.error('Error updating post owner likes:', updateOwnerError);
        }
      } else {
        const likedPosts = await this.getUserLikedPosts(user.id);
        const { error: updateError } = await supabase
          .from('users')
          .update({
            liked_posts: (likedPosts || []).filter(id => id !== postId)
          })
          .eq('id', user.id);
        if (updateError) {
          console.error('Error updating user liked posts:', updateError);
        }
        const {error: updateOwnerError} = await supabase
          .from('users')
          .update({
            likes_received: (await this.getUserLikes(postOwner) || 1) - 1
          })
          .eq('id', postOwner);
        if (updateOwnerError) {
          console.error('Error updating post owner likes:', updateOwnerError);
        }
      }

      return {
        success: true,
        liked: result.liked,
        newLikesCount: result.new_likes_count,
        userId: user.id,
        postId: postId,  
        usersWhoLiked: result.users_who_liked
      };
  
    } catch (error) {
      console.error('Error in togglePostLike:', error);
      throw error;
    }
  }

  static async getUserLikes(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch user likes');
      }
      const { data, error } = await supabase
        .from('users')
        .select('likes_received')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Error fetching user likes:', error);
        throw error;
      }
      return data.likes || 0;
    } catch (error) {
      console.error('Error fetching user likes:', error);
      throw error;
    }
  }
  static async getUserInfo(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch user info');
      }
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, profile_picture, posts, streak, streak_last_updated, achievements')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Error fetching user info:', error);
        throw error;
      }
      return {
        id: data.id,
        name: data.name || 'Anonymous',
        email: data.email || 'No email provided',
        profilePicture: data.profile_picture || null,
        posts: data.posts || [],
        streak: data.streak || 0,
        streakLastUpdated: data.streak_last_updated || null,
        achievements: data.achievements || []
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  static async acceptInvite(challengeId, userId) {
      try {
          const { data: invite } = await supabase
              .from('invites')
              .select('*')
              .eq('challenge_id', challengeId)
              .single();

          if (!invite) throw new Error('Invite not found');

          const pendingParticipants = (invite.pending_participants || []).filter(id => id !== userId);
          const participants = Array.from(new Set([...(invite.participants || []), userId]));

          const { data, error } = await supabase
              .from('invites')
              .update({
                  pending_participants: pendingParticipants,
                  participants: participants
              })
              .eq('id', invite.id)
              .select();

          if (error) throw error;
          return data[0];
      } catch (error) {
          console.error('Error accepting invite:', error);
          throw error;
      }
  }

  static async fetchPostsByLocation(latitude, longitude, radius = 10000) {
    try {
      const radiusDegrees = radius / 111320;
      
      const minLat = latitude - radiusDegrees;
      const maxLat = latitude + radiusDegrees;
      const minLon = longitude - (radiusDegrees / Math.cos(latitude * Math.PI / 180));
      const maxLon = longitude + (radiusDegrees / Math.cos(latitude * Math.PI / 180));

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          username,
          challenge,
          category,
          photo,
          caption,
          likes,
          comments,
          completed_at,
          timestamp,
          latitude,
          longitude,
          users_who_liked,
          comments
        `)
        .gte('latitude', minLat)
        .lte('latitude', maxLat)
        .gte('longitude', minLon)
        .lte('longitude', maxLon)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('completed_at', { ascending: false })

      if (error) {
        throw error;
      }

      const filteredPosts = [];
      for (const post of data) {
        
        const distance = this.calculateDistance(
          latitude, 
          longitude, 
          post.latitude, 
          post.longitude
        );
        
        if (distance <= radius) {
          filteredPosts.push(post);
        }
      }

      filteredPosts.forEach(post => {
        post.latitude = parseFloat(post.latitude);
        post.longitude = parseFloat(post.longitude);
      });
      return filteredPosts;

    } catch (error) {
      console.error('Error fetching posts by location:', error);
      throw error;
    }
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static async cowardPost(cowardData, user) {
    try {
      const currentTimestamp = new Date().toISOString();
      const payload = {
        username: cowardData.username || 'anonymous_coward',
        challenge: cowardData.challenge,
        category: 'COWARD',
        photo: null,
        caption: cowardData.caption || null,
        completed_at: currentTimestamp,
        timestamp: currentTimestamp,
        likes: 0,
        comments: 0,
        latitude: null,
        longitude: null,
        owner: user?.id || null,
      };

      const data = await this.insertPostRow(payload);

      await this.updateStreak(user, 0);
      await this.updateStreakLastUpdated(user, currentTimestamp.slice(0, 10));

      console.log('Coward post created and streak reset:', data);
      return data;
    } catch (error) {
      console.error('Error creating coward post:', error);
      throw error;
    }
  }

  static async fetchChallenges() {
    console.log('Fetching challenges from Supabase...'); 
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id,
          name,
          category,
          description, 
          difficulty,
          created_at,
          is_active,
          finishes,
          local,
          latitude,
          longitude
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('Challenges fetched:', data);
      if (error) {
        throw error;
      }

      const formattedData = (data || []).reduce((acc, challenge) => {
        if (!acc[challenge.category]) {
          acc[challenge.category] = [];
        }
        acc[challenge.category].push({
          name: challenge.name,
          finishes: challenge.finishes,
          id: challenge.id,
        });
        return acc;
      }, {});

      console.log('Formatted challenges:', formattedData);
      return formattedData;
    } catch (error) {
      console.error('Error fetching challenges:', error);
      return { social: [], creative: [], adventure: [] };
    }
  }

  static async getChallengeByName(challengeName) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('name', challengeName)
        .eq('is_active', true)
        .single();

      if (error) {
        console.warn('Challenge not found:', challengeName);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching challenge by name:', error);
      return null;
    }
  }

  static async getChallengeById(challengeId) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('is_active', true)
        .single();
      if (error) {
        console.warn('Challenge not found:', challengeId);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error fetching challenge by ID:', error);
      return null;
    }
  }

  static async getTodaysChallenge() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      console.log('Fetching challenge for today:', today);
      let { data, error } = await supabase 
        .from('daily_challenges')
        .select('*')
        .eq('challenge_day', today)
        .single();

      if (!data || error?.code === 'PGRST116') {
        const { data: recentData, error: recentError } = await supabase
          .from('daily_challenges')
          .select('*')
          .order('challenge_day', { ascending: false })
          .limit(1)
          .single();
        data = recentData;
        error = recentError;
      }

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching today\'s challenge:', error);
      return null;
    }
  }

  static async getStreakLastUpdated(user) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select("streak_last_updated")
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      return data.streak_last_updated || null;
    } catch (error) {
      console.error('Error fetching user streak last updated:', error);
      return null;
    }
  }

  static async updateStreakLastUpdated(user, date) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ streak_last_updated: date })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user streak last updated:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating streak last updated:', error);
      throw error;
    }
  }

  static async getStreak(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select("streak")
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user streak:', error);
        return 0;
      }

      return data.streak || 0;
    } catch (error) {
      console.error('Error fetching user streak:', error);
      return 0;
    }
  }

  static async updateStreak(user, newStreak) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ streak: newStreak })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user streak:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  static async getUsersPosts(userId) {
    try {
      if (!userId) {
        console.error('User or user.id is undefined');
        return [];
      }
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('owner', userId);

      if (error) {
        console.error('Error fetching user posts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
  }

  static async getPostsByUserId (userId) {
    try {
      if (!userId) {
        console.error('User ID is undefined');
        return [];
      }
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('owner', userId);

      if (error) {
        console.error('Error fetching posts by user ID:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching posts by User ID:', error);
      return [];
    }
  }

  static async getAchievements(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('achievements')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user achievements:', error);
        return [];
      }

      const achievementIds = data?.achievements || [];
      if (!achievementIds.length) {
        return [];
      }

      const { data: achievementData, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .in('id', achievementIds);

      if (achievementError) {
        console.error('Error fetching achievement details:', achievementError);
        return [];
      }

      return achievementData ?? [];
    } catch (err) {
      console.error('Error in getAchievements:', err);
      return [];
    }
  }
  
  static async getAllAchievements() {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*');

      if (error) {
        console.error('Error fetching all achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all achievements:', error);
      return [];
    }
  }

  static async updateUserName(user, newName) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: newName
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user name:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user name:', error);
      throw error;
    }
  }

  static async getLevels() {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level', { ascending: true });

      if (error) {
        console.error('Error fetching levels:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching levels:', error);
      return [];
    }
  }

  static async getLevel(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('level')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user level:', error);
        return null;
      }

      return data?.level || 0;
    } catch (error) {
      console.error('Error fetching level:', error);
      return null;
    }
  }

  static async getProfilePicture(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('profile_picture')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile picture:', error);
        return null;
      }

      return data?.profile_picture || null;
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      return null;
    }
  }
  
  static async uploadProfilePicture(user, photoUri) {
    try {
      if (!user || !user.id) {
        throw new Error('User must be authenticated to upload profile picture');
      }

      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const uniqueFileName = `profile_${user.id}_${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(uniqueFileName, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(data.path);

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user profile picture:', updateError);
        throw updateError;
      }

      console.log('Profile picture uploaded successfully, public URL:', publicUrl);
      return updatedUser.profile_picture;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }

  static async getName(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user name:', error);
        return null;
      }

      return data?.name || null;
    } catch (error) {
      console.error('Error fetching user name:', error);
      return null;
    }
  }

  static async addComment(postId, commentData, user) {
    console.log('Adding comment: ', commentData, 'to post:', postId, 'by user:', user?.id);
    const username = await this.getName(user.id) || 'anonymous';
    const profilePicture = await this.getProfilePicture(user) || null;
    try {
      if (!user || !user.id) {
        throw new Error('User must be authenticated to comment on posts');
      }

      if (!postId || !commentData) {
        throw new Error('Post ID and comment text are required');
      }

      const { data, error } = await supabase
        .from('posts')
        .select('comments')
        .eq('id', postId)
        .single();
      if (error) {
        console.error('Error fetching post comments:', error);
        throw error;
      }

      const comments = data.comments || [];
      const newComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        text: commentData, 
        timestamp: new Date().toISOString(),
        user_id: user.id,
        username: username || 'anonymous',
        profile_picture: profilePicture || null,
      };

      comments.push(newComment);
      const { error: updateError } = await supabase
        .from('posts')
        .update({ comments })
        .eq('id', postId);
      if (updateError) {
        console.error('Error updating post comments:', updateError);
        throw updateError;
      }
      const commentedPosts = await this.getUserCommentedPosts(user);
      console.log("Commented posts before update: ", commentedPosts);
      const updatedCommentedPosts = [...new Set([...commentedPosts || [], postId])];
      console.log("Updated comments: ", updatedCommentedPosts);
      const {error: updateUserError} = await supabase
        .from('users')
        .update({
          commented_posts: updatedCommentedPosts
        })
        .eq('id', user.id);
      if (updateUserError) {
        console.error('Error updating user commented posts:', updateUserError.message, updateUserError.details);
      }

      console.log("Got up to selecting post owner");
      const postOwner = await supabase
        .from('posts')
        .select('owner')
        .eq('id', postId)
        .single();

      if (postOwner.error) {
        console.error('Error fetching post owner:', postOwner.error);
        throw postOwner.error;
      }
      const ownerId = postOwner.data.owner;
      console.log("Post owner ID: ", ownerId);
      const { error: updateOwnerError } = await supabase
        .from('users')
        .update({
          comments_received: (await this.getUserCommentsReceived(ownerId) || 0) + 1
        })
        .eq('id', ownerId);

      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  static async getUserCommentsReceived(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch user comments received');
      }
      const { data, error } = await supabase
        .from('users')
        .select('comments_received')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Error fetching user comments received:', error);
        throw error;
      }
      console.log('Fetched user comments received:', data);
      return data.comments_received || 0;
    } catch (error) {
      console.error('Error fetching user comments received:', error);
      throw error;
    }
  }

  static async respondToFriendRequest(requestId, response) {
    const status = response === 'accept' ? 'accepted' : 'declined';
    const { data, error } = await supabase
      .from('friendships')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId);
    
    if (error) throw error;
    return data;
  } 
  
  static async searchUsers(currentUser, searchTerm) { 
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, profile_picture')
      .neq('id', currentUser.id)
      .or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .limit(20);
    
    if (error) throw error; 
    return data;
  }
  
  static async sendFriendRequest(currentUser, targetUserId) {
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: currentUser.id,
        addressee_id: targetUserId,
        status: 'pending'
      });
    
    if (error) throw error;
    return data;
  }

  static async getPendingFriendRequests(currentUser) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        created_at,
        requester:requester_id (
          id,
          name,
          email,
          profile_picture
        )
      `)
      .eq('addressee_id', currentUser.id)
      .eq('status', 'pending');
    
    if (error) throw error;
    return data;
  } 
 
  static async getFriends(currentUser) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        friend:requester_id (
          id,
          name,
          email,
          profile_picture
        ),
        friend2:addressee_id (
          id,
          name,
          email,
          profile_picture
        )
      `)
      .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    
    if (error) throw error;
    
    return data.map(friendship => {
      const friend = friendship.requester_id === currentUser.id 
        ? friendship.friend2 
        : friendship.friend;
      return { ...friendship, friend };
    });
  } 

  static async getFriendshipStatus(currentUser, targetUserId) {
    const { data, error } = await supabase
      .from('friendships')
      .select('status, requester_id')
      .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUser.id})`)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async createInvite({ challengeId, senderId, recipientId, challenge, category }) {
      try {
          const { data: existingInvite } = await supabase
              .from('invites')
              .select('id, pending_participants')
              .eq('challenge_id', challengeId)
              .single();

          if (existingInvite) {
              const pendingParticipants = existingInvite.pending_participants || [];
              if (!pendingParticipants.includes(recipientId)) {
                  pendingParticipants.push(recipientId);
                  
                  const { data, error } = await supabase
                      .from('invites')
                      .update({ pending_participants: pendingParticipants })
                      .eq('id', existingInvite.id)
                      .select('id');
                  
                  if (error) throw error;
                  return data[0]?.id;
              }
              return existingInvite.id;
          } else {
              const { data, error } = await supabase
                  .from('invites')
                  .insert({
                      challenge_id: challengeId,
                      sender: senderId,
                      pending_participants: [recipientId],
                      participants: [senderId]
                  })
                  .select('id');
              
              if (error) throw error;
              return data[0]?.id;
          }
      } catch (error) {
          console.error('Error creating invite:', error);
          throw error;
      }
  }

  static async getInviteData(inviteId) {
      try {
          const { data, error } = await supabase
              .from('invites')
              .select(`
                  *,
                  sender_profile:users!sender(id, name, profile_picture)
              `)
              .eq('id', inviteId)
              .single();
                  
          if (error) throw error;
          return data;
      } catch (error) {
          console.error('Error fetching invite data:', error);
          throw error;
      }
  }

  static async getUserInvitations(userId) {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          *,
          sender_profile:users!sender(id, name, profile_picture)
        `)
        .contains('pending_participants', [userId])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user invitations:', error);
        throw error;
      }

      console.log("Fetched invitation data:", data);
      return data || [];
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      return [];
    }
  }

  static async removeInvite(inviteId, userId) {
    try {
      const { data: invite, error: fetchError } = await supabase
        .from('invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (fetchError) {
        console.error('Error fetching invite:', fetchError);
        throw fetchError;
      }

      if (!invite) {
        throw new Error('Invite not found');
      }

      const updatedPending = (invite.pending_participants || []).filter(id => id !== userId);
      const updatedParticipants = (invite.participants || []).filter(id => id !== userId);
      const completedParticipants = invite.completed_participants || [];
      if (!completedParticipants.includes(userId)) {
        completedParticipants.push(userId);
      }

      const { data, error } = await supabase
        .from('invites')
        .update({
          pending_participants: updatedPending,
          participants: updatedParticipants,
          completed_participants: completedParticipants
        })
        .eq('id', inviteId)
        .select();

      if (error) {
        console.error('Error updating invite:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error removing invite:', error);
      throw error;
    }
  }

  static async getUserLikedPosts(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('liked_posts')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user liked posts:', error);
        return [];
      }

      if (!data || !Array.isArray(data.liked_posts)) {
        console.warn('Liked posts data is invalid or empty:', data);
        return [];
      }

      return data.liked_posts;
    } catch (error) {
      console.error('Error fetching user liked posts:', error);
      return [];
    }
  }

  static async getUserCommentedPosts(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('commented_posts')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user commented posts:', error);
        return [];
      }

      const commentedPosts = data.commented_posts || [];
      if (commentedPosts.length === 0) {
        return [];
      }

      return commentedPosts;
    } catch (error) {
      console.error('Error fetching user commented posts:', error);
      return [];
    }
  }

  static async getUserJoinDate(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user join date:', error);
        return null;
      }

      return data.created_at ? new Date(data.created_at) : null;
    } catch (error) {
      console.error('Error fetching user join date:', error);
      return null;
    }
  }
}

export class NewChallengeService {
  static async uploadPhoto(photoUri, fileName = null) {
    try {
      console.log('Reading file from URI:', photoUri);
      
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const uniqueFileName = fileName || `new_challenge_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      console.log('Uploading file:', uniqueFileName);
      
      const { data, error } = await supabase.storage
        .from('new-challenges')
        .upload(uniqueFileName, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('new-challenges')
        .getPublicUrl(data.path);

      console.log('File uploaded successfully, public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  static async submitNewChallenge(challengeData, user = null) {
    try {
      const validCategories = ['social', 'creative', 'adventure'];
      if (!validCategories.includes(challengeData.category)) {
        throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }
      const username = await PostService.getName(user.id)

      const { data, error } = await supabase
        .from('newchallengepost')
        .insert([{
          username: username || 'anonymous',
          challenge_name: challengeData.challenge,
          category: challengeData.category,
          proof_photo: challengeData.photo,
          caption: challengeData.caption,
          completed_at: challengeData.completedAt,
          submitted_at: challengeData.timestamp,
          status: 'pending',
          is_user_generated: typeof challengeData.isUserGenerated === 'boolean' ? challengeData.isUserGenerated : true,
          review_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          latitude: challengeData.latitude || null,
          longitude: challengeData.longitude || null,
          local: challengeData.local || false,
          owner: user ? user.id : null
        }])
        .select() 
        .single();

      if (error) {
        throw error;
      }

      console.log('New challenge submitted for review:', data);
      return data;
    } catch (error) {
      console.error('Error submitting new challenge:', error);
      throw error;
    }
  }

  static async getUserSubmissions(username, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('newchallengepost')
        .select(`
          id,
          challenge_name,
          category,
          caption,
          status,
          submitted_at,
          reviewed_at,
          review_notes
        `)
        .eq('username', username)
        .order('submitted_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      return [];
    }
  }

  static async getSubmissionStatus(submissionId) {
    try {
      const { data, error } = await supabase
        .from('newchallengepost')
        .select(`
          id,
          challenge_name,
          status,
          submitted_at,
          reviewed_at,
          review_notes
        `)
        .eq('id', submissionId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching submission status:', error);
      throw error;
    }
  }

  static async getPendingSubmissions(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('newchallengepost')
        .select(`
          id,
          username,
          challenge_name,
          category,
          proof_photo,
          caption,
          completed_at,
          submitted_at,
          status
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending submissions:', error);
      return [];
    }
  }

  static async reviewSubmission(submissionId, status, reviewNotes = null, reviewerUsername = null) {
    try {
      const validStatuses = ['approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status. Must be "approved" or "rejected"');
      }

      const { data, error } = await supabase
        .from('newchallengepost')
        .update({
          status: status,
          review_notes: reviewNotes,
          reviewed_by: reviewerUsername,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`Submission ${submissionId} ${status}:`, data);
      
      if (status === 'approved') {
        await this.createOfficialChallenge(data);
      }

      return data;
    } catch (error) {
      console.error('Error reviewing submission:', error);
      throw error;
    }
  }

  static async createOfficialChallenge(approvedSubmission) {
    try {
      const validCategories = ['social', 'creative', 'adventure'];
      if (!validCategories.includes(approvedSubmission.category)) {
        console.error('Invalid category for official challenge:', approvedSubmission.category);
        return null;
      }

      const { data, error } = await supabase
        .from('challenges')
        .insert([{
          name: approvedSubmission.challenge_name,
          category: approvedSubmission.category,
          description: approvedSubmission.caption || approvedSubmission.challenge_name,
          difficulty: 'medium',
          created_from_submission: approvedSubmission.id,
          created_at: new Date().toISOString(),
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.warn('Could not create official challenge:', error);
        return null;
      }

      console.log('Official challenge created from submission:', data);
      return data;
    } catch (error) {
      console.warn('Error creating official challenge:', error);
      return null;
    }
  }

  static async getSubmissionStats() {
    try {
      const { data: pendingCount, error: pendingError } = await supabase
        .from('newchallengepost')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      const { data: approvedCount, error: approvedError } = await supabase
        .from('newchallengepost')
        .select('id', { count: 'exact' })
        .eq('status', 'approved');

      const { data: rejectedCount, error: rejectedError } = await supabase
        .from('newchallengepost')
        .select('id', { count: 'exact' })
        .eq('status', 'rejected');

      if (pendingError || approvedError || rejectedError) {
        console.warn('Error fetching some stats');
      }

      return {
        pending: pendingCount?.length || 0,
        approved: approvedCount?.length || 0,
        rejected: rejectedCount?.length || 0,
        total: (pendingCount?.length || 0) + (approvedCount?.length || 0) + (rejectedCount?.length || 0)
      };
    } catch (error) {
      console.error('Error fetching submission stats:', error);
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }
  }

  static getValidCategories() {
    return ['social', 'creative', 'adventure'];
  }
}