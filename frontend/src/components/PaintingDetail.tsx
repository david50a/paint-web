import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageCircle, Bookmark, Share2, Sparkles, Loader2, Send, User } from 'lucide-react';
import { Painting, Artist, Comment } from '../types';
import { mockArtists } from '../data';
import { analyzePaintingWithImage, PaintingAnalysis } from '../services/geminiService';
import { getComments, addComment, toggleLike, toggleSave } from '../api/interactions';
import { useAuth } from '../context/AuthContext';
import { followUser, unfollowUser, getUserProfile } from '../api/users';
import { API_BASE } from '@/api/client';

interface PaintingDetailProps {
  painting: Painting | null;
  onClose: () => void;
  onArtistClick: (artist: Artist) => void;
  onUpdate?: () => void;
}

export const PaintingDetail: React.FC<PaintingDetailProps> = ({ painting, onClose, onArtistClick, onUpdate }) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [analysis, setAnalysis] = useState<PaintingAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const [isLiked, setIsLiked] = useState(painting?.likedByMe || false);
  const [likeCount, setLikeCount] = useState(painting?.likes || 0);
  const [isSaved, setIsSaved] = useState(painting?.savedByMe || false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  const commentInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (painting) {
      setIsLiked(painting.likedByMe || false);
      setLikeCount(painting.likes);
      setIsSaved(painting.savedByMe || false);
      loadComments();
      checkFollowStatus();
    }
  }, [painting]);

  const checkFollowStatus = async () => {
    if (!painting || !currentUser) return;
    try {
      const profile = await getUserProfile(parseInt(painting.artistId));
      setIsFollowing(profile.is_followed_by_me);
    } catch (err) {
      console.error("Failed to check follow status:", err);
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!painting || !currentUser) return;
    
    try {
      setIsFollowLoading(true);
      if (isFollowing) {
        await unfollowUser(parseInt(painting.artistId));
        setIsFollowing(false);
      } else {
        await followUser(parseInt(painting.artistId));
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const loadComments = async () => {
    if (!painting) return;
    try {
      const data = await getComments(parseInt(painting.id));
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!painting || !newComment.trim() || !isAuthenticated || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await addComment(parseInt(painting.id), newComment);
      setNewComment("");
      await loadComments();
      onUpdate?.();
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLike = async () => {
    if (!painting || !isAuthenticated) return;
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    try {
      await toggleLike(parseInt(painting.id));
      onUpdate?.();
    } catch (err) {
      setIsLiked(!newIsLiked);
      setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSave = async () => {
    if (!painting || !isAuthenticated) return;
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    try {
      await toggleSave(parseInt(painting.id));
      onUpdate?.();
    } catch (err) {
      setIsSaved(!newIsSaved);
    }
  };

  const scrollToComments = () => {
    commentInputRef.current?.focus();
    commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzePaintingWithImage(painting.image, painting.title, painting.medium);
      setAnalysis(result);
    } catch (err) {
      setError("Failed to analyze painting. Please try again.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    setAnalysis(null);
    onClose();
  };

  if (!painting) return null;
  const mockArtist = mockArtists.find(a => a.id === painting.artistId);
  const artistName = painting.artistName || mockArtist?.name;
  const artistAvatar = painting.artistAvatar || mockArtist?.avatar;
  const artistHandle = mockArtist?.handle || `@${artistName?.toLowerCase().replace(/\s/g, '')}`;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-canvas-bg/95 backdrop-blur-xl" onClick={handleClose} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl max-h-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-canvas-border flex flex-col md:flex-row focus:outline-none"
        >
          <button 
            onClick={handleClose}
            className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-canvas-ink hover:text-white transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Image */}
          <div className="md:flex-[1.5] h-[40vh] md:h-auto bg-canvas-secondary flex items-center justify-center p-8 overflow-hidden">
            <motion.img 
              layoutId={`painting-${painting.id}`}
              src={painting.image} 
              alt={painting.title} 
              className="w-full h-full object-contain rounded-xl shadow-lg"
            />
          </div>

          {/* Right: Info */}
          <div className="md:flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="mb-8">
              <div 
                className="flex items-center gap-3 mb-8 group cursor-pointer"
                onClick={() => mockArtist && onArtistClick(mockArtist)}
              >
                {artistAvatar && (
                  <img src={artistAvatar} className="w-12 h-12 rounded-full object-cover ring-1 ring-canvas-border shadow-sm transition-all group-hover:ring-canvas-accent group-hover:scale-105" />
                )}
                <div>
                  <h4 className="font-serif text-lg font-bold group-hover:text-canvas-accent transition-colors">{artistName}</h4>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-canvas-ink/40">{artistHandle}</p>
                </div>
                {isAuthenticated && currentUser?.id !== parseInt(painting.artistId) && (
                  <button 
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={`ml-auto px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${
                      isFollowing 
                        ? 'bg-canvas-secondary text-canvas-ink border border-canvas-border hover:bg-red-50 hover:text-red-600 hover:border-red-100' 
                        : 'bg-canvas-ink text-white hover:bg-canvas-accent'
                    }`}
                  >
                    {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                {!isAuthenticated && (
                   <button className="ml-auto text-[10px] font-bold uppercase tracking-widest text-canvas-accent border-b border-canvas-accent leading-none pb-0.5 hover:opacity-70 transition-opacity">View Portfolio</button>
                )}
              </div>

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 block mb-2">Artwork Details</span>
              <h2 className="text-4xl font-serif font-bold mb-4 italic leading-tight">{painting.title}</h2>
              <p className="text-canvas-ink/70 leading-relaxed mb-8 font-medium italic">"{painting.description}"</p>
              
              <div className="grid grid-cols-2 gap-6 p-6 bg-canvas-secondary rounded-2xl border border-canvas-border mb-8">
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Medium</label>
                  <span className="text-sm font-semibold">{painting.medium}</span>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Technique</label>
                  <span className="text-sm font-semibold">{painting.technique}</span>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Dimensions</label>
                  <span className="text-sm font-semibold">{painting.dimensions}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Year</label>
                  <span className="text-sm font-semibold">{painting.year}</span>
                </div>
              </div>

              {/* AI Insights Section */}
              <div className="border-t border-canvas-border pt-8">
                {!analysis && !isAnalyzing ? (
                  <button 
                    onClick={handleAnalyze}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-canvas-accent/5 hover:bg-canvas-accent/10 text-canvas-accent font-bold uppercase tracking-widest text-[10px] rounded-xl border border-canvas-accent/20 transition-all group"
                  >
                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Analyze with AI Curator
                  </button>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-canvas-accent mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Curator's Insights</span>
                      {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                    </div>
                    
                    {isAnalyzing && (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-canvas-secondary rounded w-3/4" />
                        <div className="h-4 bg-canvas-secondary rounded w-1/2" />
                        <div className="h-4 bg-canvas-secondary rounded w-5/6" />
                      </div>
                    )}

                    {analysis && !isAnalyzing && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Style & Context</label>
                          <p className="text-sm text-canvas-ink/80 leading-relaxed font-medium">{analysis.style}</p>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Artistic Technique</label>
                          <p className="text-sm text-canvas-ink/80 leading-relaxed font-medium">{analysis.technique}</p>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Emotional Resonance</label>
                          <p className="text-sm text-canvas-ink/80 leading-relaxed font-medium italic">"{analysis.emotionalImpact}"</p>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-widest text-canvas-ink/30 block mb-1">Atmospheric Palette</label>
                          <p className="text-sm text-canvas-ink/80 leading-relaxed font-medium">{analysis.colorPalette}</p>
                        </div>
                      </motion.div>
                    )}

                    {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-2">{error}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 flex flex-col min-h-0 border-t border-canvas-border pt-8 mt-4 overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 block mb-6">Dialogue ({comments.length})</span>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6 mb-8">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      {comment.user?.profile_image ? (
                        <img 
                          src={comment.user.profile_image.startsWith('http') ? comment.user.profile_image : `${API_BASE}${comment.user.profile_image}`} 
                          className="w-8 h-8 rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-canvas-secondary flex items-center justify-center">
                          <User className="w-4 h-4 text-canvas-ink/30" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">{comment.user?.username || 'Unknown User'}</span>
                          <span className="text-[9px] opacity-40 uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-canvas-ink/80 leading-relaxed italic">"{comment.comment}"</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-canvas-ink/30 italic">No thoughts shared yet...</p>
                )}
              </div>

              {isAuthenticated ? (
                <form onSubmit={handlePostComment} className="relative mt-auto">
                  <input 
                    type="text"
                    ref={commentInputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add your thoughts..."
                    className="w-full py-4 pl-6 pr-12 bg-canvas-secondary rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-canvas-accent transition-all placeholder:italic"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-canvas-accent hover:scale-110 disabled:opacity-20 transition-all"
                  >
                    {isSubmittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              ) : (
                <div className="mt-auto py-4 px-6 bg-canvas-secondary rounded-2xl border border-dashed border-canvas-border text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Please login to join the dialogue</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 mt-8 pt-8 border-t border-canvas-border">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 ${isLiked ? 'text-canvas-accent' : 'text-canvas-ink'} hover:text-canvas-accent transition-colors group`}
              >
                <Heart className={`w-5 h-5 group-hover:scale-110 transition-transform ${isLiked ? 'fill-canvas-accent' : ''}`} />
                <span className="font-bold text-xs uppercase tracking-widest">{likeCount}</span>
              </button>
              <button 
                onClick={scrollToComments}
                className="flex items-center gap-2 text-canvas-ink hover:text-canvas-accent transition-colors group"
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-xs uppercase tracking-widest">{comments.length}</span>
              </button>
              <button 
                onClick={handleSave}
                className={`flex items-center gap-2 ${isSaved ? 'text-canvas-accent' : 'text-canvas-ink'} hover:text-canvas-accent transition-colors group`}
              >
                <Bookmark className={`w-5 h-5 group-hover:scale-110 transition-transform ${isSaved ? 'fill-canvas-accent' : ''}`} />
              </button>
              
              <button className="ml-auto bg-canvas-ink text-canvas-bg px-8 py-3 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-canvas-accent transition-all flex items-center gap-2">
                Inquire <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
