import React, { createContext, useContext, useState, useEffect } from 'react';
import { PostService } from '../services/postService';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [preloadedPosts, setPreloadedPosts] = useState([]);
    const [preloadedLastDoc, setPreloadedLastDoc] = useState(null);
    const [preloadedHasMore, setPreloadedHasMore] = useState(false);
    const [isPreloading, setIsPreloading] = useState(false);
    const [preloadComplete, setPreloadComplete] = useState(false);

    useEffect(() => {
        preloadGalleryData();
    }, []);

    const preloadGalleryData = async () => {
        setIsPreloading(true);
        try {
            const { posts, lastDoc, hasMore } = await PostService.preloadPosts(6);
            setPreloadedPosts(posts);
            setPreloadedLastDoc(lastDoc);
            setPreloadedHasMore(hasMore);
            setPreloadComplete(true);
            console.log(`Preloaded ${posts.length} posts`);
        } catch (error) {
            console.error('Failed to preload gallery data:', error);
            setPreloadComplete(true);
        } finally {
            setIsPreloading(false);
        }
    };

    const value = {
        preloadedPosts,
        preloadedLastDoc,
        preloadedHasMore,
        isPreloading,
        preloadComplete,
        setPreloadedPosts,
        refreshPreloadedData: preloadGalleryData
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
