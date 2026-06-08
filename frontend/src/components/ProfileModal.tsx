import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, MapPin, Grid, MessageSquare, Heart, Calendar, ExternalLink } from 'lucide-react';
import { getUserProfile, followUser, unfollowUser, UserWithPosts } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '@/api/client';

interface ProfileModalProps {
  userId: number | null;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ userId, onClose }) => {
  const [profile, setProfile] = useState<UserWithPosts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const data = await getUserProfile(userId);
        setProfile(data);
        setIsFollowing(data.is_followed_by_me);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

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
      console.error('Failed to update follow status:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-canvas-bg/95 backdrop-blur-xl" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden border border-canvas-border flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-canvas-ink hover:text-white transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin mb-4">
                  <div className="w-12 h-12 border-4 border-canvas-border border-t-canvas-accent rounded-full" />
                </div>
                <p className="text-canvas-ink/60">Loading profile...</p>
              </div>
            </div>
          ) : profile ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Header: Cover + Avatar */}
              <div className="relative h-64 bg-gradient-to-b from-canvas-secondary to-canvas-bg">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20" />
                <div className="absolute -bottom-16 left-12 flex items-end gap-6">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden ring-1 ring-canvas-border">
                    {profile.profile_image ? (
                      <img 
                        src={profile.profile_image.startsWith('http') ? profile.profile_image : `${API_BASE}${profile.profile_image}`} 
                        alt={profile.username} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-canvas-secondary flex items-center justify-center">
                        <Users className="w-16 h-16 text-canvas-ink/30" />
                      </div>
                    )}
                  </div>
                  <div className="pb-4">
                    <h2 className="font-serif text-4xl font-bold tracking-tight mb-1">{profile.username}</h2>
                    <p className="text-canvas-accent font-bold uppercase tracking-widest text-xs">@{profile.username.toLowerCase()}</p>
                  </div>
                </div>
              </div>

              {/* Content Container */}
              <div className="px-12 pt-20 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Left: Bio & Stats */}
                  <div className="lg:col-span-1 border-r border-canvas-border pr-12 hidden lg:block">
                    {profile.bio && (
                      <div className="mb-8">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-4">Bio</h4>
                        <p className="text-canvas-ink/70 leading-relaxed italic font-medium">"{profile.bio}"</p>
                      </div>
                    )}

                    <div className="space-y-6 mb-8">
                      <div className="flex items-center gap-3 text-canvas-ink/60">
                        <Users className="w-4 h-4 text-canvas-accent" />
                        <span className="text-xs font-bold uppercase tracking-widest">{profile.followers_count} Followers</span>
                      </div>
                      <div className="flex items-center gap-3 text-canvas-ink/60">
                        <Users className="w-4 h-4 text-canvas-accent" />
                        <span className="text-xs font-bold uppercase tracking-widest">{profile.following_count} Following</span>
                      </div>
                      <div className="flex items-center gap-3 text-canvas-ink/60">
                        <Grid className="w-4 h-4 text-canvas-accent" />
                        <span className="text-xs font-bold uppercase tracking-widest">{profile.posts_count} Works</span>
                      </div>
                      {profile.created_at && (
                        <div className="flex items-center gap-3 text-canvas-ink/60">
                          <Calendar className="w-4 h-4 text-canvas-accent" />
                          <span className="text-xs font-bold uppercase tracking-widest">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-12">
                      {currentUser?.id !== profile.id ? (
                        <>
                          <button
                            onClick={handleFollowToggle}
                            disabled={isFollowLoading}
                            className={`w-full py-4 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all mb-4 ${
                              isFollowing
                                ? 'bg-white border border-canvas-border text-canvas-ink hover:border-canvas-accent'
                                : 'bg-canvas-ink text-canvas-bg hover:bg-canvas-accent'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isFollowLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
                          </button>
                          <button className="w-full py-4 bg-white border border-canvas-border text-canvas-ink rounded-full font-bold uppercase tracking-widest text-[10px] hover:border-canvas-accent transition-all flex items-center justify-center gap-2">
                            Message <MessageSquare className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button className="w-full py-4 bg-canvas-ink text-canvas-bg rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-canvas-accent transition-all">
                          Edit Profile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Portfolio Grid */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-serif text-2xl font-bold italic">Portfolio</h3>
                      <div className="flex gap-2">
                        <button className="p-2 bg-canvas-secondary rounded-full hover:shadow-inner transition-all">
                          <Grid className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-canvas-ink/20">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {profile.posts && profile.posts.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {profile.posts.map((post) => (
                          <div
                            key={post.id}
                            className="group relative aspect-square rounded-lg overflow-hidden bg-canvas-secondary border border-canvas-border hover:shadow-lg transition-all"
                          >
                            {post.image_url && (
                              <img
                                src={post.image_url.startsWith('http') ? post.image_url : `${API_BASE}${post.image_url}`}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex gap-4 text-white">
                                <div className="flex items-center gap-1">
                                  <Heart className="w-4 h-4" />
                                  {post.like_count}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {post.comment_count}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Grid className="w-16 h-16 text-canvas-ink/20 mx-auto mb-4" />
                        <p className="text-canvas-ink/60">No posts yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-canvas-ink/60">User not found</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
