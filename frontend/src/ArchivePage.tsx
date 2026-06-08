import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Archive, Lock, FolderHeart, History, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { getSavedPosts } from './api/users';
import { useAuth } from './context/AuthContext';
import { Post, Painting } from './types';
import { PaintingCard } from './components/PaintingCard';
import { PaintingDetail } from './components/PaintingDetail';
import { API_BASE } from '@/api/client';

export const ArchivePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);

  useEffect(() => {
    if (user) {
      loadSaved();
    }
  }, [user]);

  const loadSaved = async () => {
    try {
      setIsLoading(true);
      if (user) {
        const data = await getSavedPosts(user.id);
        setSavedPosts(data || []);
      }
    } catch (err) {
      console.error("Failed to load archive:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const paintings: Painting[] = savedPosts.map(post => ({
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
    savedByMe: true
  }));

  const filteredPaintings = paintings.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.artistName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-24 h-24 rounded-full bg-canvas-secondary flex items-center justify-center mb-8">
            <Lock className="w-10 h-10 text-canvas-ink/20" />
          </div>
          <h2 className="font-serif text-3xl italic mb-4">Vault is Locked</h2>
          <p className="text-canvas-ink/40 max-w-sm mb-8 font-medium">Please sign in to access your private archive and curated collections.</p>
          <button className="px-12 py-4 bg-canvas-ink text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all">Authenticate</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto px-10 py-16 w-full">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 block mb-2">Private Collection</span>
            <h1 className="font-serif text-5xl italic">The Archive</h1>
          </div>
          <div className="flex gap-4">
             <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-canvas-ink/20" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search collections..." 
                  className="pl-11 pr-6 py-4 bg-white border border-canvas-border rounded-full text-xs focus:outline-none focus:border-canvas-accent w-64"
                />
             </div>
             <button className="p-4 bg-canvas-ink text-white rounded-full hover:bg-canvas-accent transition-all shadow-lg">
                <FolderHeart className="w-5 h-5" />
             </button>
          </div>
        </header>

        {/* Categories of Archive */}
        <div className="flex gap-8 mb-12 border-b border-canvas-border overflow-x-auto no-scrollbar">
          <button className="pb-6 text-[10px] font-bold uppercase tracking-[0.2em] border-b-2 border-canvas-ink">Saved Artworks</button>
          <button className="pb-6 text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity">Personal Series</button>
          <button className="pb-6 text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity">Curated Exhibitions</button>
          <button className="pb-6 text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity">Deleted / Trash</button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin mb-4 inline-block">
              <div className="w-8 h-8 border-2 border-canvas-border border-t-canvas-accent rounded-full" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Consultating Records...</p>
          </div>
        ) : filteredPaintings.length > 0 ? (
          <div className="gallery-grid">
            <AnimatePresence mode="popLayout">
              {filteredPaintings.map((painting) => (
                <PaintingCard 
                  key={painting.id} 
                  painting={painting} 
                  onClick={() => setSelectedPainting(painting)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : paintings.length > 0 ? (
          <div className="py-20 text-center">
             <Search className="w-12 h-12 text-canvas-ink/10 mx-auto mb-4" />
             <p className="text-canvas-ink/40 font-medium">No artworks match your search.</p>
          </div>
        ) : (
          <div className="py-32 text-center bg-white rounded-[48px] border border-canvas-border border-dashed">
            <Archive className="w-12 h-12 text-canvas-ink/10 mx-auto mb-6" />
            <h3 className="font-serif text-2xl mb-2">Vault is Empty</h3>
            <p className="text-sm text-canvas-ink/40 max-w-xs mx-auto mb-8 font-medium">You haven't saved any artworks yet. Explore the gallery to begin your curation.</p>
            <button className="px-10 py-4 bg-canvas-secondary rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-canvas-ink hover:text-white transition-all">Go to Gallery</button>
          </div>
        )}
      </main>

      <PaintingDetail 
        painting={selectedPainting} 
        onClose={() => setSelectedPainting(null)} 
        onArtistClick={(artist) => {
          setSelectedPainting(null);
          navigate(`/profile/${artist.id}`);
        }}
        onUpdate={loadSaved}
      />
    </div>
  );
};
