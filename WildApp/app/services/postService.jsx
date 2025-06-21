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
          created_at
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

  static async createPost(postData) {
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
          comments: 0
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
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
          is_active
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedData = (data || []).reduce((acc, challenge) => {
        if (!acc[challenge.category]) {
          acc[challenge.category] = [];
        }
        acc[challenge.category].push(challenge.name);
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

  static async submitNewChallenge(challengeData) {
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
          reviewed_at: null
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