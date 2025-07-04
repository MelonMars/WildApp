-- LIKE OR UNLIKE POSTS
create or replace function toggle_post_like(post_id integer, user_id uuid)
returns TABLE(liked boolean, new_likes_count integer, users_who_liked uuid[], owner_post uuid)
language plpgsql
as $$
DECLARE
  current_likes        integer;
  user_already_liked   boolean;
  updated_users        uuid[];
  post_owner      uuid;
BEGIN
  SELECT 
    likes,
    user_id = ANY(posts.users_who_liked),
    owner
  INTO current_likes, user_already_liked, post_owner
  FROM posts
  WHERE id = post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post with id % not found', post_id;
  END IF;

  IF user_already_liked THEN
    UPDATE posts
    SET
      users_who_liked = array_remove(posts.users_who_liked, user_id),
      likes = GREATEST(likes - 1, 0),
      updated_at = now()
    WHERE id = post_id
    RETURNING posts.users_who_liked, posts.likes INTO updated_users, new_likes_count;

    RETURN QUERY 
      SELECT false, new_likes_count, updated_users, post_owner;

  ELSE
    UPDATE posts
    SET
      users_who_liked = array_append(COALESCE(posts.users_who_liked, ARRAY[]::uuid[]), user_id),
      likes = posts.likes + 1,
      updated_at = now()
    WHERE id = post_id
    RETURNING posts.users_who_liked, posts.likes INTO updated_users, new_likes_count;

    RETURN QUERY
      SELECT true, new_likes_count, updated_users, post_owner;
  END IF;
END;
$$;

-- AWARD ACHIEVEMENTS FROM POSTS
CREATE OR REPLACE FUNCTION award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE     
    user_post_count INTEGER;     
    category_post_count INTEGER;     
    current_streak INTEGER;
    liked_posts_count INTEGER;
    commented_posts_count INTEGER;
    challenges_created_count INTEGER;
    achievement_record RECORD;     
    user_achievements UUID[]; 
BEGIN     
    SELECT achievements INTO user_achievements      
    FROM users      
    WHERE id = NEW.owner;          
    
    IF user_achievements IS NULL THEN         
        user_achievements := ARRAY[]::UUID[];     
    END IF;          
    
    SELECT streak INTO current_streak      
    FROM users      
    WHERE id = NEW.owner;          
    
    SELECT COUNT(*) INTO user_post_count      
    FROM posts      
    WHERE owner = NEW.owner;          
    
    SELECT COUNT(*) INTO category_post_count      
    FROM posts      
    WHERE owner = NEW.owner AND category = NEW.category;
    
    SELECT COALESCE(
        CASE 
            WHEN liked_posts IS NULL THEN 0
            ELSE array_length(liked_posts, 1)
        END, 0) INTO liked_posts_count
    FROM users
    WHERE id = NEW.owner;
    
    SELECT COALESCE(
        CASE 
            WHEN commented_posts IS NULL THEN 0
            ELSE array_length(commented_posts, 1)
        END, 0) INTO commented_posts_count
    FROM users
    WHERE id = NEW.owner;
    
    SELECT COALESCE(challenges_created, 0) INTO challenges_created_count
    FROM users
    WHERE id = NEW.owner;
    
    FOR achievement_record IN          
        SELECT id, kind, target, category           
        FROM achievements      
    LOOP         
        IF achievement_record.id = ANY(user_achievements) THEN             
            CONTINUE;         
        END IF;                  
        
        CASE achievement_record.kind             
            WHEN 'streak' THEN                 
                IF current_streak >= achievement_record.target THEN                     
                    UPDATE users                      
                    SET achievements = array_append(achievements, achievement_record.id)                     
                    WHERE id = NEW.owner;                                          
                    RAISE NOTICE 'Achievement awarded: % to user %', achievement_record.id, NEW.owner;                 
                END IF;                              
                
            WHEN 'post_count' THEN                 
                IF achievement_record.category IS NOT NULL THEN                     
                    IF NEW.category = achievement_record.category AND                         
                       category_post_count >= achievement_record.target THEN                         
                        UPDATE users                          
                        SET achievements = array_append(achievements, achievement_record.id)                         
                        WHERE id = NEW.owner;                                                  
                        RAISE NOTICE 'Category achievement awarded: % to user %', achievement_record.id, NEW.owner;                     
                    END IF;                 
                ELSE                     
                    IF user_post_count >= achievement_record.target THEN                         
                        UPDATE users                          
                        SET achievements = array_append(achievements, achievement_record.id)                         
                        WHERE id = NEW.owner;                                                  
                        RAISE NOTICE 'Post count achievement awarded: % to user %', achievement_record.id, NEW.owner;                     
                    END IF;                 
                END IF;
                
            WHEN 'liked_posts' THEN
                IF liked_posts_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.owner;
                    
                    RAISE NOTICE 'Liked posts achievement awarded: % to user %', achievement_record.id, NEW.owner;
                END IF;
                
            WHEN 'commented_posts' THEN
                IF commented_posts_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.owner;
                    
                    RAISE NOTICE 'Commented posts achievement awarded: % to user %', achievement_record.id, NEW.owner;
                END IF;
                
            WHEN 'challenges_created' THEN
                IF challenges_created_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.owner;
                    
                    RAISE NOTICE 'Challenges created achievement awarded: % to user %', achievement_record.id, NEW.owner;
                END IF;
                
            ELSE
                RAISE NOTICE 'Unknown achievement kind: % for achievement %', achievement_record.kind, achievement_record.id;
                
        END CASE;     
    END LOOP;          
    
    RETURN NEW; 
END;
$$;

CREATE OR REPLACE FUNCTION award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE     
    user_post_count INTEGER;     
    category_post_count INTEGER;     
    current_streak INTEGER;
    liked_posts_count INTEGER;
    commented_posts_count INTEGER;
    challenges_created_count INTEGER;
    achievement_record RECORD;     
    user_achievements UUID[]; 
BEGIN     
    SELECT achievements INTO user_achievements      
    FROM users      
    WHERE id = NEW.owner;          
    
    IF user_achievements IS NULL THEN         
        user_achievements := ARRAY[]::UUID[];     
    END IF;          
    
    SELECT streak INTO current_streak      
    FROM users      
    WHERE id = NEW.owner;          
    
    SELECT COUNT(*) INTO user_post_count      
    FROM posts      
    WHERE owner = NEW.owner;          
    
    SELECT COUNT(*) INTO category_post_count      
    FROM posts      
    WHERE owner = NEW.owner AND category = NEW.category;
    
    SELECT COALESCE(array_length(liked_posts, 1), 0) INTO liked_posts_count
    FROM users
    WHERE id = NEW.owner;
    
    SELECT COALESCE(array_length(commented_posts, 1), 0) INTO commented_posts_count
    FROM users
    WHERE id = NEW.owner;
    
    SELECT COALESCE(challenges_created, 0) INTO challenges_created_count
    FROM users
    WHERE id = NEW.owner;
    
    FOR achievement_record IN          
        SELECT id, kind, target, category          
        FROM achievements      
    LOOP         
        IF achievement_record.id = ANY(user_achievements) THEN             
            CONTINUE;         
        END IF;                  
        
        CASE achievement_record.kind             
            WHEN 'streak' THEN                 
                IF current_streak >= achievement_record.target THEN                     
                    UPDATE users                      
                    SET achievements = array_append(achievements, achievement_record.id)                     
                    WHERE id = NEW.owner;                                          
                    RAISE NOTICE 'Achievement awarded: % to user %', achievement_record.id, NEW.owner;                 
                END IF;                              
                
            WHEN 'post_count' THEN                 
                IF achievement_record.category IS NOT NULL THEN                     
                    IF NEW.category = achievement_record.category AND                         
                       category_post_count >= achievement_record.target THEN                         
                        UPDATE users                          
                        SET achievements = array_append(achievements, achievement_record.id)                         
                        WHERE id = NEW.owner;                                                  
                        RAISE NOTICE 'Category achievement awarded: % to user %', achievement_record.id, NEW.owner;                     
                    END IF;                 
                ELSE                     
                    IF user_post_count >= achievement_record.target THEN                         
                        UPDATE users                          
                        SET achievements = array_append(achievements, achievement_record.id)                         
                        WHERE id = NEW.owner;                                                  
                        RAISE NOTICE 'Post count achievement awarded: % to user %', achievement_record.id, NEW.owner;                     
                    END IF;                 
                END IF;
                
            WHEN 'liked_posts' THEN
                IF liked_posts_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.owner;
                    
                    RAISE NOTICE 'Liked posts achievement awarded: % to user %', achievement_record.id, NEW.owner;
                END IF;
                
            WHEN 'commented_posts' THEN
                IF commented_posts_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.owner;
                    
                    RAISE NOTICE 'Commented posts achievement awarded: % to user %', achievement_record.id, NEW.owner;
                END IF;
                
            WHEN 'challenges_created' THEN
                IF challenges_created_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.owner;
                    
                    RAISE NOTICE 'Challenges created achievement awarded: % to user %', achievement_record.id, NEW.owner;
                END IF;
                
            ELSE
                RAISE NOTICE 'Unknown achievement kind: % for achievement %', achievement_record.kind, achievement_record.id;
                
        END CASE;     
    END LOOP;          
    
    RETURN NEW; 
END;
$$;

-- CHECK USER ACHIEVEMENTS NOT FROM POSTS
CREATE OR REPLACE FUNCTION check_all_achievements_for_user(user_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    user_post_count INTEGER;
    category_post_count INTEGER;
    current_streak INTEGER;
    achievement_record RECORD;
    user_achievements UUID[];
    category_name TEXT;
BEGIN
    SELECT achievements INTO user_achievements 
    FROM users 
    WHERE id = user_uid;
    
    IF user_achievements IS NULL THEN
        user_achievements := ARRAY[]::UUID[];
    END IF;
    
    SELECT streak INTO current_streak 
    FROM users 
    WHERE id = user_uid;
    
    SELECT COUNT(*) INTO user_post_count 
    FROM posts 
    WHERE owner = user_uid;
    
    FOR achievement_record IN 
        SELECT id, kind, target, category 
        FROM achievements 
    LOOP
        IF achievement_record.id = ANY(user_achievements) THEN
            CONTINUE;
        END IF;
        
        CASE achievement_record.kind
            WHEN 'streak' THEN
                IF current_streak >= achievement_record.target THEN
                    UPDATE users 
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = user_uid;
                    
                    RAISE NOTICE 'Achievement awarded: %', achievement_record.id;
                END IF;
                
            WHEN 'post_count' THEN
                IF achievement_record.category IS NOT NULL THEN
                    SELECT COUNT(*) INTO category_post_count 
                    FROM posts 
                    WHERE owner = user_uid AND category = achievement_record.category;
                    
                    IF category_post_count >= achievement_record.target THEN
                        UPDATE users 
                        SET achievements = array_append(achievements, achievement_record.id)
                        WHERE id = user_uid;
                        
                        RAISE NOTICE 'Category achievement awarded: %', achievement_record.id;
                    END IF;
                ELSE
                    IF user_post_count >= achievement_record.target THEN
                        UPDATE users 
                        SET achievements = array_append(achievements, achievement_record.id)
                        WHERE id = user_uid;
                        
                        RAISE NOTICE 'Post count achievement awarded: %', achievement_record.id;
                    END IF;
                END IF;
        END CASE;
    END LOOP;
END;
$$;

-- CHECK AND UPDATE USER LEVEL
create or replace function check_and_update_user_level()
returns trigger
language plpgsql
as $$
DECLARE
    user_post_count INTEGER;
    current_level INTEGER;
    next_level_record RECORD;
BEGIN
    SELECT COUNT(*) INTO user_post_count
    FROM posts
    WHERE owner = NEW.owner;

    SELECT level INTO current_level
    FROM users
    WHERE id = NEW.owner;

    SELECT *
    INTO next_level_record
    FROM levels
    WHERE level_number = current_level + 1
    ORDER BY level_number
    LIMIT 1;

    IF FOUND AND user_post_count >= next_level_record.post_threshold THEN
        UPDATE users
        SET level = next_level_record.level_number
        WHERE id = NEW.owner;

        RAISE NOTICE 'User % promoted to level %', NEW.owner, next_level_record.level_number;
    END IF;

    RETURN NEW;
END;
$$;

-- CHECK USER ACHIEVEMENTS
CREATE OR REPLACE FUNCTION check_user_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    liked_posts_count INTEGER;
    commented_posts_count INTEGER;
    challenges_created_count INTEGER;
    days_since_creation INTEGER;
    achievement_record RECORD;
    user_achievements UUID[];
BEGIN
    SELECT achievements INTO user_achievements 
    FROM users 
    WHERE id = NEW.id;
    
    IF user_achievements IS NULL THEN
        user_achievements := ARRAY[]::UUID[];
    END IF;
    
    SELECT COALESCE(
        CASE 
            WHEN NEW.liked_posts IS NULL THEN 0
            ELSE array_length(NEW.liked_posts, 1)
        END, 0) INTO liked_posts_count;
    
    SELECT COALESCE(
        CASE 
            WHEN NEW.commented_posts IS NULL THEN 0
            ELSE array_length(NEW.commented_posts, 1)
        END, 0) INTO commented_posts_count;
    
    SELECT COALESCE(NEW.challenges_created, 0) INTO challenges_created_count;
    
    SELECT CURRENT_DATE - NEW.created_at INTO days_since_creation;
    
    FOR achievement_record IN
        SELECT id, kind, target, category
        FROM achievements
    LOOP
        IF achievement_record.id = ANY(user_achievements) THEN
            CONTINUE;
        END IF;
        
        CASE achievement_record.kind
            WHEN 'liked_posts' THEN
                IF liked_posts_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.id;
                    
                    RAISE NOTICE 'Liked posts achievement awarded: % to user %', achievement_record.id, NEW.id;
                END IF;
            WHEN 'commented_posts' THEN
                IF commented_posts_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.id;
                    
                    RAISE NOTICE 'Commented posts achievement awarded: % to user %', achievement_record.id, NEW.id;
                END IF;
            WHEN 'challenges_created' THEN
                IF challenges_created_count >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.id;
                    
                    RAISE NOTICE 'Challenges created achievement awarded: % to user %', achievement_record.id, NEW.id;
                END IF;
            WHEN 'milestone' THEN
                IF days_since_creation >= achievement_record.target THEN
                    UPDATE users
                    SET achievements = array_append(achievements, achievement_record.id)
                    WHERE id = NEW.id;
                    
                    RAISE NOTICE 'Milestone achievement awarded: % to user %', achievement_record.id, NEW.id;
                END IF;
            ELSE
                RAISE NOTICE 'Unknown achievement kind: %', achievement_record.kind;
        END CASE;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- CREATE A NEW USER
create or replace function handle_new_user()
returns trigger
language plpgsql
as $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

-- INCREMENT USER FINISHES
create or replace function increment_finishes()
returns trigger
language plpgsql
as $$

begin
  raise notice 'Trigger got challenge=%, completed_at=%', new.challenge, new.completed_at;

  update public.challenges
     set finishes = finishes + 1
   where name = new.challenge;
  raise notice 'challenges matched % row(s)', found;

  update public.daily_challenges
     set finishes = finishes + 1
   where name = new.challenge
     and challenge_day = (new.completed_at at time zone 'UTC')::date;
  raise notice 'daily_challenges matched % row(s)', found;

  return new;
end;
$$;

-- CHECK LIKES ACHIEVEMENTS
CREATE OR REPLACE FUNCTION check_likes_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    achievement_record RECORD;
    user_achievements UUID[];
    post_owner UUID;
    total_likes INTEGER; 
BEGIN
    SELECT owner INTO post_owner FROM posts WHERE id = NEW.id;
    
    SELECT achievements INTO user_achievements 
    FROM users 
    WHERE id = post_owner;
    
    IF user_achievements IS NULL THEN
        user_achievements := ARRAY[]::UUID[];
    END IF;
    
    SELECT COALESCE(SUM(likes), 0) INTO total_likes
    FROM posts
    WHERE owner = post_owner;
    
    FOR achievement_record IN
        SELECT id, target
        FROM achievements
        WHERE kind = 'total_likes'
    LOOP
        IF achievement_record.id = ANY(user_achievements) THEN
            CONTINUE;
        END IF;
        
        IF total_likes >= achievement_record.target THEN
            UPDATE users
            SET achievements = array_append(achievements, achievement_record.id)
            WHERE id = post_owner;
            
            RAISE NOTICE 'Total likes achievement awarded: % to user %', achievement_record.id, post_owner;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- CHECK COMMENTS ACHIEVEMENTS
CREATE OR REPLACE FUNCTION check_comments_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    achievement_record RECORD;
    user_achievements UUID[];
    post_owner UUID;
    total_comments INTEGER;
BEGIN
    SELECT owner INTO post_owner FROM posts WHERE id = NEW.id;
    
    SELECT achievements INTO user_achievements 
    FROM users 
    WHERE id = post_owner;
    
    IF user_achievements IS NULL THEN
        user_achievements := ARRAY[]::UUID[];
    END IF;
    
    SELECT COALESCE(SUM(
        CASE 
            WHEN comments IS NULL THEN 0
            WHEN jsonb_typeof(comments) = 'array' THEN jsonb_array_length(comments)
            ELSE 0
        END
    ), 0) INTO total_comments
    FROM posts
    WHERE owner = post_owner;
    
    FOR achievement_record IN
        SELECT id, target
        FROM achievements
        WHERE kind = 'total_comments'
    LOOP
        IF achievement_record.id = ANY(user_achievements) THEN
            CONTINUE;
        END IF;
        
        IF total_comments >= achievement_record.target THEN
            UPDATE users
            SET achievements = array_append(achievements, achievement_record.id)
            WHERE id = post_owner;
            
            RAISE NOTICE 'Total comments achievement awarded: % to user %', achievement_record.id, post_owner;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    affected_user_id UUID;
    user_name TEXT;
    achievements_count INTEGER;
    total_posts INTEGER;
    social_posts INTEGER;
    creative_posts INTEGER;
    adventure_posts INTEGER;
    current_streak INTEGER;
    leaderboard_record RECORD;
BEGIN
    IF TG_TABLE_NAME = 'posts' THEN
        affected_user_id := COALESCE(NEW.owner, OLD.owner);
    ELSIF TG_TABLE_NAME = 'users' THEN
        affected_user_id := COALESCE(NEW.id, OLD.id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    SELECT 
        name,
        COALESCE(array_length(achievements, 1), 0),
        streak
    INTO user_name, achievements_count, current_streak
    FROM users 
    WHERE id = affected_user_id;
    
    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE category = 'social') as social,
        COUNT(*) FILTER (WHERE category = 'creative') as creative,
        COUNT(*) FILTER (WHERE category = 'adventure') as adventure
    INTO total_posts, social_posts, creative_posts, adventure_posts
    FROM posts 
    WHERE owner = affected_user_id;
    
    DELETE FROM leaderboards
    WHERE leaderboard_type = 'achievements' 
      AND category IS NULL 
      AND user_id = affected_user_id;
    
    INSERT INTO leaderboards (leaderboard_type, category, user_id, username, score, rank_position)
    VALUES ('achievements', NULL, affected_user_id, user_name, achievements_count, 1);
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_overall' 
      AND category IS NULL 
      AND user_id = affected_user_id;
    
    INSERT INTO leaderboards (leaderboard_type, category, user_id, username, score, rank_position)
    VALUES ('challenges_overall', NULL, affected_user_id, user_name, total_posts, 1);
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_social' 
      AND category = 'social' 
      AND user_id = affected_user_id;
    
    INSERT INTO leaderboards (leaderboard_type, category, user_id, username, score, rank_position)
    VALUES ('challenges_social', 'social', affected_user_id, user_name, social_posts, 1);
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_creative' 
      AND category = 'creative' 
      AND user_id = affected_user_id;
    
    INSERT INTO leaderboards (leaderboard_type, category, user_id, username, score, rank_position)
    VALUES ('challenges_creative', 'creative', affected_user_id, user_name, creative_posts, 1);
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_adventure' 
      AND category = 'adventure' 
      AND user_id = affected_user_id;
    
    INSERT INTO leaderboards (leaderboard_type, category, user_id, username, score, rank_position)
    VALUES ('challenges_adventure', 'adventure', affected_user_id, user_name, adventure_posts, 1);
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'streaks' 
      AND category IS NULL 
      AND user_id = affected_user_id;
    
    INSERT INTO leaderboards (leaderboard_type, category, user_id, username, score, rank_position)
    VALUES ('streaks', NULL, affected_user_id, user_name, current_streak, 1);
    
    WITH ranked_achievements AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC) as new_rank
        FROM leaderboards 
        WHERE leaderboard_type = 'achievements' AND category IS NULL
        ORDER BY score DESC, updated_at ASC
        LIMIT 10
    )
    UPDATE leaderboards 
    SET rank_position = ranked_achievements.new_rank
    FROM ranked_achievements
    WHERE leaderboards.id = ranked_achievements.id;
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'achievements' 
      AND category IS NULL 
      AND rank_position > 10;
    
    WITH ranked_challenges AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC) as new_rank
        FROM leaderboards 
        WHERE leaderboard_type = 'challenges_overall' AND category IS NULL
        ORDER BY score DESC, updated_at ASC
        LIMIT 10
    )
    UPDATE leaderboards 
    SET rank_position = ranked_challenges.new_rank
    FROM ranked_challenges
    WHERE leaderboards.id = ranked_challenges.id;
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_overall' 
      AND category IS NULL 
      AND rank_position > 10;
    
    WITH ranked_social AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC) as new_rank
        FROM leaderboards 
        WHERE leaderboard_type = 'challenges_social' AND category = 'social'
        ORDER BY score DESC, updated_at ASC
        LIMIT 10
    )
    UPDATE leaderboards 
    SET rank_position = ranked_social.new_rank
    FROM ranked_social
    WHERE leaderboards.id = ranked_social.id;
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_social' 
      AND category = 'social' 
      AND rank_position > 10;
    
    WITH ranked_creative AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC) as new_rank
        FROM leaderboards 
        WHERE leaderboard_type = 'challenges_creative' AND category = 'creative'
        ORDER BY score DESC, updated_at ASC
        LIMIT 10
    )
    UPDATE leaderboards 
    SET rank_position = ranked_creative.new_rank
    FROM ranked_creative
    WHERE leaderboards.id = ranked_creative.id;
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_creative' 
      AND category = 'creative' 
      AND rank_position > 10;
    
    WITH ranked_adventure AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC) as new_rank
        FROM leaderboards 
        WHERE leaderboard_type = 'challenges_adventure' AND category = 'adventure'
        ORDER BY score DESC, updated_at ASC
        LIMIT 10
    )
    UPDATE leaderboards 
    SET rank_position = ranked_adventure.new_rank
    FROM ranked_adventure
    WHERE leaderboards.id = ranked_adventure.id;
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'challenges_adventure' 
      AND category = 'adventure' 
      AND rank_position > 10;
    
    WITH ranked_streaks AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC) as new_rank
        FROM leaderboards 
        WHERE leaderboard_type = 'streaks' AND category IS NULL
        ORDER BY score DESC, updated_at ASC
        LIMIT 10
    )
    UPDATE leaderboards 
    SET rank_position = ranked_streaks.new_rank
    FROM ranked_streaks
    WHERE leaderboards.id = ranked_streaks.id;
    
    DELETE FROM leaderboards 
    WHERE leaderboard_type = 'streaks' 
      AND category IS NULL 
      AND rank_position > 10;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trigger_update_leaderboard_posts
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_rankings();

CREATE OR REPLACE TRIGGER trigger_update_leaderboard_users
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_rankings();