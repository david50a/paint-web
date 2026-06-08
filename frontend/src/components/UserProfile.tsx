import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Users, MapPin, Grid, MessageSquare, Heart, Bookmark, Calendar, Edit3 } from 'lucide-react';
import { getUserProfile, followUser, unfollowUser, UserWithPosts, getSavedPosts, UserProfile as UserProfileType } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { EditProfileModal } from './EditProfileModal';
import { PaintingDetail } from './PaintingDetail';
import { ArtistProfile } from './ArtistProfile';
import { PaintingCard } from './PaintingCard';
import { Painting, Artist, Post } from '../types';
import { API_BASE } from '@/api/client';

export const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserWithPosts | null>(null);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'saved'>('portfolio');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const data = await getUserProfile(parseInt(userId));
      setProfile(data);
      setIsFollowing(data.is_followed_by_me);
      
      // Fetch saved posts if viewing own profile
      if (currentUser && data.id === currentUser.id) {
        const saved = await getSavedPosts(data.id);
        setSavedPosts(saved || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId, currentUser]);

  const handleUpdateSuccess = (updatedProfile: UserProfileType) => {
    if (profile) {
      setProfile({
        ...profile,
        ...updatedProfile
      });
    }
  };

  const handleFollowToggle = async () => {
    if (!profile || !currentUser) return;
    
    try {
      setIsFollowLoading(true);
      if (isFollowing) {
        await unfollowUser(profile.id);
        setProfile({
          ...profile,
          followers_count: profile.followers_count - 1,
          is_followed_by_me: false
        });
        setIsFollowing(false);
      } else {
        await followUser(profile.id);
        setProfile({
          ...profile,
          followers_count: profile.followers_count + 1,
          is_followed_by_me: true
        });
        setIsFollowing(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas-bg">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-canvas-border border-t-canvas-accent rounded-full" />
          </div>
          <p className="text-canvas-ink/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-canvas-bg">
        <h1 className="text-2xl font-bold mb-4">User not found</h1>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-canvas-ink text-white rounded-full hover:bg-canvas-accent transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="min-h-screen bg-canvas-bg">
      {/* Header */}
      <div className="border-b border-canvas-border bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-canvas-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold">{profile.username}</h1>
            <p className="text-xs text-canvas-ink/60">{profile.posts_count} posts</p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white border-b border-canvas-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Avatar */}
            <div className="flex flex-col items-center md:col-span-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-40 h-40 rounded-full ring-4 ring-canvas-accent ring-offset-2 overflow-hidden mb-6 shadow-lg"
              >
                {profile.profile_image ? (
                  <img
                    src={profile.profile_image.startsWith('http') ? profile.profile_image : `${API_BASE}${profile.profile_image}`}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-canvas-secondary flex items-center justify-center">
                    <Users className="w-20 h-20 text-canvas-ink/30" />
                  </div>
                )}
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 text-center mb-8">
                <div>
                  <p className="text-2xl font-bold">{profile.posts_count}</p>
                  <p className="text-xs uppercase tracking-wider text-canvas-ink/60">Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.followers_count}</p>
                  <p className="text-xs uppercase tracking-wider text-canvas-ink/60">Followers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.following_count}</p>
                  <p className="text-xs uppercase tracking-wider text-canvas-ink/60">Following</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3">
                {isOwnProfile ? (
                  <>
                    <button 
                      onClick={() => setIsEditModalOpen(true)}
                      className="w-full py-3 bg-canvas-ink text-white rounded-full font-bold uppercase tracking-wider text-sm hover:bg-canvas-accent transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                    <button className="w-full py-3 bg-white border border-canvas-border text-canvas-ink rounded-full font-bold uppercase tracking-wider text-sm hover:bg-canvas-secondary transition-colors">
                      Share Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className={`w-full py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-colors ${
                        isFollowing
                          ? 'bg-white border border-canvas-border text-canvas-ink hover:bg-canvas-secondary'
                          : 'bg-canvas-ink text-white hover:bg-canvas-accent'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isFollowLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button className="w-full py-3 bg-white border border-canvas-border text-canvas-ink rounded-full font-bold uppercase tracking-wider text-sm hover:bg-canvas-secondary transition-colors flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bio & Info */}
            <div className="md:col-span-2">
              <div>
                <h1 className="font-serif text-4xl font-bold mb-2">{profile.username}</h1>
                <p className="text-canvas-ink/60 text-sm mb-6">@{profile.username.toLowerCase()}</p>

                {profile.bio && (
                  <p className="text-canvas-ink mb-8 leading-relaxed italic text-lg">"{profile.bio}"</p>
                )}

                {profile.created_at && (
                  <div className="flex items-center gap-2 text-canvas-ink/60 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              {isOwnProfile && (
                <div className="flex gap-12 mt-12 border-b border-canvas-border">
                  <button 
                    onClick={() => setActiveTab('portfolio')}
                    className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'portfolio' ? 'border-canvas-ink opacity-100' : 'border-transparent opacity-30 hover:opacity-100'}`}
                  >
                    Portfolio
                  </button>
                  <button 
                    onClick={() => setActiveTab('saved')}
                    className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'saved' ? 'border-canvas-ink opacity-100' : 'border-transparent opacity-30 hover:opacity-100'}`}
                  >
                    Saved Collection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="font-serif text-3xl font-bold italic mb-8">
          {activeTab === 'portfolio' ? 'Portfolio' : 'Saved Collection'}
        </h2>

        {(activeTab === 'portfolio' ? profile.posts : savedPosts).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'portfolio' ? profile.posts : savedPosts).map((post) => {
              const painting: Painting = {
                id: (post.id || 0).toString(),
                artistId: (post.owner?.id || 0).toString(),
                artistName: post.owner?.username || 'Unknown Artist',
                artistAvatar: post.owner?.profile_image ? (post.owner.profile_image.startsWith('http') ? post.owner.profile_image : `${API_BASE}${post.owner.profile_image}`) : undefined,
                title: post.title || 'Untitled',
                description: post.content || '',
                image: post.image_url ? (post.image_url.startsWith('http') ? post.image_url : `${API_BASE}${post.image_url}`) : '',
                medium: 'Digital Art',
                technique: 'Mixed Media',
                dimensions: 'N/A',
                year: new Date().getFullYear(),
                likes: post.like_count || 0,
                comments: post.comment_count || 0,
                tags: [],
                createdAt: post.created_at || new Date().toISOString(),
                likedByMe: post.liked_by_me || false,
                savedByMe: post.saved_by_me || false
              };
              return (
                <PaintingCard 
                  key={post.id} 
                  painting={painting} 
                  onClick={() => setSelectedPainting(painting)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Grid className="w-16 h-16 text-canvas-ink/20 mx-auto mb-4" />
            <p className="text-canvas-ink/60">No posts yet</p>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-6 right-6 bg-red-500 text-white px-6 py-3 rounded-lg max-w-sm">
          {error}
        </div>
      )}

      {profile && (
        <EditProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          profile={profile}
          onSuccess={handleUpdateSuccess}
        />
      )}

      <ArtistProfile 
        artist={selectedArtist} 
        onClose={() => setSelectedArtist(null)} 
        onPaintingClick={(p) => {
          setSelectedArtist(null);
          setSelectedPainting(p);
        }}
      />

      <PaintingDetail 
        painting={selectedPainting} 
        onClose={() => setSelectedPainting(null)} 
        onArtistClick={(artist) => {
          setSelectedPainting(null);
          setSelectedArtist(artist);
        }}
        onUpdate={loadProfile}
      />
    </div>
  );
};
