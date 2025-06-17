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
}