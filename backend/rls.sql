-- This is to prevent people from abusing the database and or exposing stuff they shouldn't

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newchallengepost ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- USER POLICIES
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own account" ON public.users
    FOR DELETE USING (auth.uid() = id);

-- POSTS POLICIES
CREATE POLICY "Anyone can view posts" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Users can create own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = owner);

CREATE POLICY "Users can delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = owner);

-- CHALLENGES POLICIES
CREATE POLICY "Anyone can view challenges" ON public.challenges
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create challenges" ON public.challenges
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- DAILY CHALLENGES POLICIES
CREATE POLICY "Anyone can view daily challenges" ON public.daily_challenges
    FOR SELECT USING (true);

-- ACHIEVEMENTS POLICIES
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (true);

-- FRIENDSHIPS POLICIES
CREATE POLICY "Users can view own friendships" ON public.friendships
    FOR SELECT USING (
        auth.uid() = requester_id OR 
        auth.uid() = addressee_id
    );

CREATE POLICY "Users can create friend requests" ON public.friendships
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id AND
        auth.uid() != addressee_id
    );

CREATE POLICY "Addressee can update friendship status" ON public.friendships
    FOR UPDATE USING (
        auth.uid() = addressee_id AND
        status = 'pending'
    );

CREATE POLICY "Users can delete own friendships" ON public.friendships
    FOR DELETE USING (
        auth.uid() = requester_id OR 
        auth.uid() = addressee_id
    );

-- INVITES POLICIES
CREATE POLICY "Users can view relevant invites" ON public.invites
    FOR SELECT USING (
        auth.uid() = sender OR
        auth.uid() = ANY(pending_participants) OR
        auth.uid() = ANY(participants)
    );

CREATE POLICY "Users can create invites" ON public.invites
    FOR INSERT WITH CHECK (auth.uid() = sender);

CREATE POLICY "Senders can update own invites" ON public.invites
    FOR UPDATE USING (auth.uid() = sender);

CREATE POLICY "Senders can delete own invites" ON public.invites
    FOR DELETE USING (auth.uid() = sender);

-- LEVELS POLICIES
CREATE POLICY "Anyone can view levels" ON public.levels
    FOR SELECT USING (true);

-- NEW CHALLENGE POSTS POLICIES
CREATE POLICY "Users can view own challenge posts" ON public.newchallengepost
    FOR SELECT USING (auth.uid() = owner );

CREATE POLICY "Users can create challenge posts" ON public.newchallengepost
    FOR INSERT WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can update own pending posts" ON public.newchallengepost
    FOR UPDATE USING (
        auth.uid() = owner AND status = 'pending'
    );

CREATE POLICY "Users can delete own challenge posts" ON public.newchallengepost
    FOR DELETE USING (auth.uid() = owner);

-- LEADERBOARDS POLICIES
CREATE POLICY "Anyone can view leaderboards" ON public.leaderboards
    FOR SELECT USING (true);