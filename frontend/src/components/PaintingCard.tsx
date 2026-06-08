import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Bookmark, Share2, MapPin } from 'lucide-react';
import { Painting, Artist } from '../types';
import { mockArtists } from '../data';
import { toggleLike, toggleSave } from '../api/interactions';
import { useAuth } from '../context/AuthContext';

interface PaintingCardProps {
  painting: Painting;
  onClick: () => void;
  onUpdate?: () => void;
}

export const PaintingCard: React.FC<PaintingCardProps> = ({ painting, onClick, onUpdate }) => {
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(painting.likedByMe);
  const [likeCount, setLikeCount] = useState(painting.likes);
  const [isSaved, setIsSaved] = useState(painting.savedByMe);

  const mockArtist = mockArtists.find(a => a.id === painting.artistId);
  const artistName = painting.artistName || mockArtist?.name;
  const artistAvatar = painting.artistAvatar || mockArtist?.avatar;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    
    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    
    try {
      await toggleLike(parseInt(painting.id));
    } catch (err) {
      // Revert on failure
      setIsLiked(!newIsLiked);
      setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    
    // Optimistic update
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    
    try {
      await toggleSave(parseInt(painting.id));
    } catch (err) {
      // Revert on failure
      setIsSaved(!newIsSaved);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group cursor-pointer bg-white rounded-[32px] overflow-hidden border border-canvas-border hover:border-canvas-accent hover:shadow-md transition-all p-4"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-canvas-secondary">
        <motion.img 
          src={painting.image} 
          alt={painting.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-canvas-ink/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
          <div className="flex gap-4">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 ${isLiked ? 'text-canvas-accent' : 'text-white'} text-sm font-medium transition-colors`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-canvas-accent' : 'fill-none'}`} /> {likeCount}
            </button>
            <button 
              onClick={onClick}
              className="flex items-center gap-1.5 text-white text-sm font-medium hover:text-canvas-accent transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-none" /> {painting.comments}
            </button>
            <button 
              onClick={handleSave}
              className={`flex items-center gap-1.5 ${isSaved ? 'text-canvas-accent' : 'text-white'} text-sm font-medium transition-colors ml-auto`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-canvas-accent' : 'fill-none'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col">
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">{painting.medium}</span>
        <h3 className="font-serif text-xl mb-1 leading-tight">{painting.title}</h3>
        {artistName && (
          <div className="flex items-center gap-2 mt-2">
            {artistAvatar && (
              <img src={artistAvatar} alt={artistName} className="w-5 h-5 rounded-full object-cover ring-1 ring-canvas-border" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-canvas-ink/60">
              {artistName}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
