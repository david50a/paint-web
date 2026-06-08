/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Layers, Wind, Droplets, Sparkles, SlidersHorizontal, ChevronRight, UserPlus } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PaintingCard } from './components/PaintingCard';
import { PaintingDetail } from './components/PaintingDetail';
import { mockPaintings, mockArtists } from './data';
import { Painting, Artist, Post } from './types';
import { ArtistProfile } from './components/ArtistProfile';
import { UserProfile } from './components/UserProfile';
import { SignInPage } from './SignInPage';
import { SignUpPage } from './SignUpPage';
import { CollectivePage } from './CollectivePage';
import { StudiosPage } from './StudiosPage';
import { ArchivePage } from './ArchivePage';
import { AIStudioPage } from './AIStudioPage';
import { UploadModal } from './components/UploadModal';
import { getPosts, getFollowingPosts } from './api/posts';
import { useAuth } from './context/AuthContext';
import { API_BASE } from '@/api/client';

function Home() {
  const { isAuthenticated } = useAuth();
  const { state } = useLocation();
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [searchQuery, setSearchQuery] = useState(state?.initialSearch || '');
  const [feedMode, setFeedMode] = useState<'global' | 'following'>('global');

  useEffect(() => {
    if (state?.initialSearch) {
      setSearchQuery(state.initialSearch);
    }
  }, [state]);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    loadPosts();
  }, [feedMode]);

  const loadPosts = async () => {
    try {
      const fetchedPosts = feedMode === 'global' ? await getPosts() : await getFollowingPosts();
      setPosts(fetchedPosts || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
    }
  };

  const backendPaintings: Painting[] = (posts || []).map(post => ({
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
  }));

  const allPaintings = feedMode === 'global' ? [...backendPaintings, ...mockPaintings] : backendPaintings;

  const filteredPaintings = allPaintings.filter(p => {
    const matchesSearch = searchQuery.trim() === '' 
      ? true 
      : p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.artistName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        p.medium.toLowerCase().includes(searchQuery.toLowerCase());
        
    return matchesSearch;
  });

  return (
    <div className="h-screen flex flex-col bg-canvas-bg selection:bg-canvas-accent selection:text-white overflow-hidden">
      <Navbar 
        onUploadClick={() => setIsUploadOpen(true)} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Connections */}
        <aside className="w-72 border-r border-canvas-border flex flex-col p-8 flex-shrink-0 hidden lg:flex">
          <h2 className="font-serif text-xl italic mb-6">Active Collectives</h2>
          <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
            {mockArtists.map((artist) => (
              <div 
                key={artist.id} 
                className="flex items-center space-x-4 group cursor-pointer"
                onClick={() => setSelectedArtist(artist)}
              >
                <div className="w-12 h-12 rounded-full ring-1 ring-offset-2 ring-transparent group-hover:ring-canvas-accent overflow-hidden transition-all shadow-sm">
                  <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold group-hover:text-canvas-accent transition-colors">{artist.name}</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-40">{artist.location}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-auto">
            <div className="p-6 bg-canvas-secondary rounded-2xl border border-canvas-border">
              <p className="font-serif italic text-sm mb-2">Weekly Challenge</p>
              <h3 className="font-bold text-lg leading-tight mb-3">Sublime Horizons in Crimson</h3>
              <button className="text-[10px] font-bold uppercase tracking-widest border-b border-canvas-ink">Join Exhibition</button>
            </div>
          </div>
        </aside>

        {/* Main Content: Feed */}
        <main className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-canvas-bg">
          {/* Header Section - Massive margin to prevent any overlap */}
          <div className="block mb-24">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-12">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-4">Featured Curation</p>
                <h1 className="font-serif text-5xl md:text-6xl lg:text-8xl font-light leading-none">
                  Seasonal<br />Palette
                </h1>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {isAuthenticated && (
                  <div className="flex bg-white p-1.5 rounded-full border border-canvas-border shadow-sm">
                    <button 
                      onClick={() => setFeedMode('global')}
                      className={`px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${feedMode === 'global' ? 'bg-canvas-ink text-white' : 'hover:bg-canvas-secondary'}`}
                    >
                      Global
                    </button>
                    <button 
                      onClick={() => setFeedMode('following')}
                      className={`px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${feedMode === 'following' ? 'bg-canvas-ink text-white' : 'hover:bg-canvas-secondary'}`}
                    >
                      Following
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid Section */}
          <div className="gallery-grid min-h-[500px]">
            <AnimatePresence mode="popLayout">
              {filteredPaintings.length > 0 ? (
                filteredPaintings.map((painting) => (
                  <PaintingCard 
                    key={painting.id} 
                    painting={painting} 
                    onClick={() => setSelectedPainting(painting)}
                  />
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-canvas-secondary flex items-center justify-center mb-6">
                    <UserPlus className="w-8 h-8 text-canvas-ink/20" />
                  </div>
                  <h3 className="font-serif text-2xl italic mb-2">Feed is Quiet</h3>
                  <p className="text-canvas-ink/40 max-w-xs mx-auto mb-8 font-medium">You aren't following anyone who has posted yet, or your search matched nothing.</p>
                  {feedMode === 'following' && searchQuery === '' && (
                    <button 
                      onClick={() => setFeedMode('global')}
                      className="px-10 py-4 bg-canvas-ink text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all"
                    >
                      Go to Global Feed
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-20 flex justify-center pb-20">
            <button className="px-12 py-4 bg-transparent border border-canvas-ink text-canvas-ink font-bold uppercase tracking-widest text-xs hover:bg-canvas-accent hover:text-white hover:border-canvas-accent transition-all rounded-full">
              Load More Masterpieces
            </button>
          </div>
        </main>
      </div>

      <PaintingDetail 
        painting={selectedPainting} 
        onClose={() => setSelectedPainting(null)} 
        onArtistClick={(artist) => {
          setSelectedPainting(null);
          setSelectedArtist(artist);
        }}
        onUpdate={loadPosts}
      />

      <ArtistProfile 
        artist={selectedArtist} 
        onClose={() => setSelectedArtist(null)} 
        onPaintingClick={(p) => {
          setSelectedArtist(null);
          setSelectedPainting(p);
        }}
      />

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={loadPosts}
      />
    </div>
  );
}

import { PersonalStudioPage } from './PersonalStudioPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile/:userId" element={<UserProfile />} />
      <Route path="/collective" element={<CollectivePage />} />
      <Route path="/studios" element={<StudiosPage />} />
      <Route path="/studio" element={<PersonalStudioPage />} />
      <Route path="/archive" element={<ArchivePage />} />
      <Route path="/ai-studio" element={<AIStudioPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
    </Routes>
  );
}
