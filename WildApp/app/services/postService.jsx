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
          comments,
          completed_at,
          timestamp,
          created_at,
          latitude,
          longitude,
          users_who_liked,
          comments
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

  static async createPost(postData, user = null) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          username: postData.username || 'anonymous',
          challenge: postData.challenge,
          category: postData.category,
          photo: postData.photo,
          caption: postData.caption,
          completed_at: postData.completedAt,
          timestamp: postData.timestamp,
          likes: 0,
          comments: 0,
          latitude: postData.latitude || null,
          longitude: postData.longitude || null,
          owner: user.id || null,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('posts')
        .eq('uid', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching user data:', fetchError);
        throw fetchError;
      }

      const postId = data.id;
      const updatedPosts = [...(userData.posts || []), postId];
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ posts: updatedPosts })
        .eq('uid', user.id);

      if (updateError) {
        console.error('Error updating user posts:', updateError);
        throw updateError;
      }

      var oldStreak = await this.getStreak(user);
      const lastUpdated = await this.getStreakLastUpdated(user);

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      let newStreak = false;
      let currentStreak = oldStreak;

      if (lastUpdated === yesterday) {
        currentStreak = oldStreak + 1;
        newStreak = true; 
      } else if (lastUpdated !== today) {
        currentStreak = 1;
        newStreak = oldStreak === 0;
      }

      await this.updateStreak(user, currentStreak);
      await this.updateStreakLastUpdated(user, today);

      const levelData = await this.getLevel(user);

      return {
        ...data,
        streakInfo: {
          streak: currentStreak,
          previousStreak: oldStreak,
          newStreak: newStreak,
          streakIncreased: currentStreak > oldStreak
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

  static async cowardPost(cowardData) {
    try {
      const currentTimestamp = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          username: cowardData.username || 'anonymous_coward',
          challenge: cowardData.challenge,
          category: 'COWARD',
          photo: null,
          caption: cowardData.caption || null,
          completed_at: currentTimestamp,
          timestamp: currentTimestamp,
          likes: 0,
          comments: 0
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Coward post created successfully:', data);
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
        .eq('uid', user.id)
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
        .eq('uid', user.id)
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

  static async getStreak(user) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select("streak")
        .eq('uid', user.id)
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
        .eq('uid', user.id)
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

  static async getUsersPosts(user) {
    try {
      if (!user || !user.id) {
        console.error('User or user.id is undefined');
        return [];
      }
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('owner', user.id);

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

  static async getPostsByUsername (username) {
    try {
      if (!username) {
        console.error('Username is undefined');
        return [];
      }
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('username', username);

      if (error) {
        console.error('Error fetching posts by username:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching posts by username:', error);
      return [];
    }
  }

  static async getAchievements(user) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('achievements')
        .eq('uid', user.id)
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
        .eq('uid', user.id)
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

  static async getLevel(user) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('level')
        .eq('uid', user.id)
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

  static async getProfilePicture(user) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('profile_picture')
        .eq('uid', user.id)
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
        .eq('uid', user.id)
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

  static async addComment(postId, commentData, user) {
    console.log('Adding comment: ', commentData, 'to post:', postId, 'by user:', user?.id);
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
        username: user.name || 'anonymous'
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
      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
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

      const { data, error } = await supabase
        .from('newchallengepost')
        .insert([{
          username: challengeData.username || 'anonymous',
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