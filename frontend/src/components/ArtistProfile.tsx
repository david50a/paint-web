import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, MapPin, Grid, MessageSquare, Heart, ExternalLink } from 'lucide-react';
import { Artist, Painting } from '../types';
import { mockPaintings } from '../data';

interface ArtistProfileProps {
  artist: Artist | null;
  onClose: () => void;
  onPaintingClick: (painting: Painting) => void;
}

export const ArtistProfile: React.FC<ArtistProfileProps> = ({ artist, onClose, onPaintingClick }) => {
  if (!artist) return null;

  const artistPaintings = mockPaintings.filter(p => p.artistId === artist.id);

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
          className="relative w-full max-w-6xl h-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-canvas-border flex flex-col"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-canvas-ink hover:text-white transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Header: Cover + Avatar */}
            <div className="relative h-64 bg-canvas-secondary">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20" />
              <div className="absolute -bottom-16 left-12 flex items-end gap-6">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden ring-1 ring-canvas-border">
                  <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                </div>
                <div className="pb-4">
                  <h2 className="font-serif text-4xl font-bold tracking-tight mb-1">{artist.name}</h2>
                  <p className="text-canvas-accent font-bold uppercase tracking-widest text-xs">{artist.handle}</p>
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="px-12 pt-20 pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left: Bio & Stats */}
                <div className="lg:col-span-1 border-r border-canvas-border pr-12 hidden lg:block">
                  <div className="mb-8">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-4">Artist Statement</h4>
                    <p className="text-canvas-ink/70 leading-relaxed italic font-medium">"{artist.bio}"</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-canvas-ink/60">
                      <MapPin className="w-4 h-4 text-canvas-accent" />
                      <span className="text-xs font-bold uppercase tracking-widest">{artist.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-canvas-ink/60">
                      <Users className="w-4 h-4 text-canvas-accent" />
                      <span className="text-xs font-bold uppercase tracking-widest">{artist.followers.toLocaleString()} Followers</span>
                    </div>
                    <div className="flex items-center gap-3 text-canvas-ink/60">
                      <Grid className="w-4 h-4 text-canvas-accent" />
                      <span className="text-xs font-bold uppercase tracking-widest">{artistPaintings.length} Works in Catalog</span>
                    </div>
                  </div>

                  <div className="mt-12">
                    <button className="w-full py-4 bg-canvas-ink text-canvas-bg rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-canvas-accent transition-all mb-4">
                      Follow Collective
                    </button>
                    <button className="w-full py-4 bg-white border border-canvas-border text-canvas-ink rounded-full font-bold uppercase tracking-widest text-[10px] hover:border-canvas-accent transition-all flex items-center justify-center gap-2">
                       Message <MessageSquare className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Right: Portfolio Grid */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-serif text-2xl font-bold italic">Portfolio Catalog</h3>
                    <div className="flex gap-2">
                      <button className="p-2 bg-canvas-secondary rounded-full hover:shadow-inner transition-all"><Grid className="w-4 h-4" /></button>
                      <button className="p-2 text-canvas-ink/20"><ExternalLink className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {artistPaintings.map((painting) => (
                      <motion.div 
                        key={painting.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="group relative aspect-square bg-canvas-secondary rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-canvas-border"
                        onClick={() => onPaintingClick(painting)}
                      >
                        <img src={painting.image} alt={painting.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-canvas-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-white p-4 text-center">
                          <h5 className="font-serif text-sm font-bold mb-1 leading-tight">{painting.title}</h5>
                          <div className="flex gap-3 mt-2">
                            <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest"><Heart className="w-2.5 h-2.5 fill-white" /> {painting.likes}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
