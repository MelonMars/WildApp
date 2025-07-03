-- LIKE OR UNLIKE POSTS
create or replace function toggle_post_like(post_id integer, user_id uuid)
returns TABLE(liked boolean, new_likes_count integer, users_who_liked uuid[])
language plpgsql
as $$
DECLARE
  current_likes   integer;
  user_already_liked boolean;
  updated_users   uuid[];
BEGIN
  SELECT 
    likes,
    user_id = ANY(posts.users_who_liked)
  INTO current_likes, user_already_liked
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
      SELECT false, new_likes_count, updated_users;

  ELSE
    UPDATE posts
    SET
      users_who_liked = array_append(COALESCE(posts.users_who_liked, ARRAY[]::uuid[]), user_id),
      likes = posts.likes + 1,
      updated_at = now()
    WHERE id = post_id
    RETURNING posts.users_who_liked, posts.likes INTO updated_users, new_likes_count;

    RETURN QUERY
      SELECT true, new_likes_count, updated_users;
  END IF;
END;
$$;

-- AWARD ACHIEVEMENTS FROM POSTS
create or replace function award_achievements()
returns trigger
language plpgsql
as $$
declare     
    user_post_count integer;     
    category_post_count integer;     
    current_streak integer;
    liked_posts_count integer;
    commented_posts_count integer;
    challenges_created_count integer;
    achievement_record record;     
    user_achievements uuid[]; 
begin     
    select achievements into user_achievements      
    from users      
    where id = new.owner;          
    
    if user_achievements is null then         
        user_achievements := array[]::uuid[];     
    end if;          
    
    select streak into current_streak      
    from users      
    where id = new.owner;          
    
    select count(*) into user_post_count      
    from posts      
    where owner = new.owner;          
    
    select count(*) into category_post_count      
    from posts      
    where owner = new.owner and category = new.category;
    
    select coalesce(array_length(liked_posts, 1), 0) into liked_posts_count
    from users
    where id = new.owner;
    
    select coalesce(array_length(commented_posts, 1), 0) into commented_posts_count
    from users
    where id = new.owner;
    
    select coalesce(challenges_created, 0) into challenges_created_count
    from users
    where id = new.owner;
    
    for achievement_record in          
        select id, kind, target, category          
        from achievements_rows      
    loop         
        if achievement_record.id = any(user_achievements) then             
            continue;         
        end if;                  
        
        case achievement_record.kind             
            when 'streak' then                 
                if current_streak >= achievement_record.target then                     
                    update users                      
                    set achievements = array_append(achievements, achievement_record.id)                     
                    where id = new.owner;                                          
                    raise notice 'Achievement awarded: % to user %', achievement_record.id, new.owner;                 
                end if;                              
                
            when 'post_count' then                 
                if achievement_record.category is not null then                     
                    if new.category = achievement_record.category and                         
                       category_post_count >= achievement_record.target then                         
                        update users                          
                        set achievements = array_append(achievements, achievement_record.id)                         
                        where id = new.owner;                                                  
                        raise notice 'Category achievement awarded: % to user %', achievement_record.id, new.owner;                     
                    end if;                 
                else                     
                    if user_post_count >= achievement_record.target then                         
                        update users                          
                        set achievements = array_append(achievements, achievement_record.id)                         
                        where id = new.owner;                                                  
                        raise notice 'Post count achievement awarded: % to user %', achievement_record.id, new.owner;                     
                    end if;                 
                end if;
                
            when 'liked_posts' then
                if liked_posts_count >= achievement_record.target then
                    update users
                    set achievements = array_append(achievements, achievement_record.id)
                    where id = new.owner;
                    
                    raise notice 'Liked posts achievement awarded: % to user %', achievement_record.id, new.owner;
                end if;
                
            when 'commented_posts' then
                if commented_posts_count >= achievement_record.target then
                    update users
                    set achievements = array_append(achievements, achievement_record.id)
                    where id = new.owner;
                    
                    raise notice 'Commented posts achievement awarded: % to user %', achievement_record.id, new.owner;
                end if;
                
            when 'challenges_created' then
                if challenges_created_count >= achievement_record.target then
                    update users
                    set achievements = array_append(achievements, achievement_record.id)
                    where id = new.owner;
                    
                    raise notice 'Challenges created achievement awarded: % to user %', achievement_record.id, new.owner;
                end if;
                
            else
                raise notice 'Unknown achievement kind: % for achievement %', achievement_record.kind, achievement_record.id;
        end case;     
    end loop;          
    
    return new; 
end;
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
    achievement_record RECORD;
    user_achievements UUID[];
BEGIN
    SELECT achievements INTO user_achievements 
    FROM users 
    WHERE id = NEW.id;
    
    IF user_achievements IS NULL THEN
        user_achievements := ARRAY[]::UUID[];
    END IF;
    
    SELECT COALESCE(array_length(NEW.liked_posts, 1), 0) INTO liked_posts_count;
    SELECT COALESCE(array_length(NEW.commented_posts, 1), 0) INTO commented_posts_count;
    SELECT COALESCE(NEW.challenges_created, 0) INTO challenges_created_count;
    
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