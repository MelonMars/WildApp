import { supabase } from '../config/supabase';

export class PostService {
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
          username: postData.username || 'you',
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
}