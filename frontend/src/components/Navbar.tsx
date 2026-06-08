import React from 'react';
import { Search, Bell, User, PlusCircle, Menu, LogOut } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '@/api/client';

interface NavbarProps {
  onUploadClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onUploadClick, searchQuery, onSearchChange }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const handleProfileClick = () => {
    if (user) {
      navigate(`/profile/${user.id}`);
    }
  };

  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    }
    if (pathname !== '/' && query.trim() !== '') {
      navigate('/', { state: { initialSearch: query } });
    }
  };

  return (
    <nav className="h-20 border-b border-canvas-border flex items-center justify-between px-10 flex-shrink-0 bg-canvas-bg sticky top-0 z-50">
      <Link to="/" className="font-serif text-3xl font-bold tracking-tighter hover:text-canvas-accent transition-colors">CANVAS</Link>
      <div className="hidden md:flex space-x-12">
        <Link 
          to="/" 
          className={`text-[11px] tracking-[0.15em] uppercase font-bold transition-all pb-1 ${pathname === '/' ? 'border-b border-canvas-ink' : 'opacity-50 hover:opacity-100'}`}
        >
          Gallery
        </Link>
        <Link 
          to="/collective" 
          className={`text-[11px] tracking-[0.15em] uppercase font-bold transition-all pb-1 ${pathname === '/collective' ? 'border-b border-canvas-ink' : 'opacity-50 hover:opacity-100'}`}
        >
          Collective
        </Link>
        <Link 
          to="/studios" 
          className={`text-[11px] tracking-[0.15em] uppercase font-bold transition-all pb-1 ${pathname === '/studios' ? 'border-b border-canvas-ink' : 'opacity-50 hover:opacity-100'}`}
        >
          Studios
        </Link>
        <Link 
          to="/archive" 
          className={`text-[11px] tracking-[0.15em] uppercase font-bold transition-all pb-1 ${pathname === '/archive' ? 'border-b border-canvas-ink' : 'opacity-50 hover:opacity-100'}`}
        >
          Archive
        </Link>
        <Link 
          to="/studio" 
          className={`text-[11px] tracking-[0.15em] uppercase font-bold transition-all pb-1 ${pathname === '/studio' ? 'border-b border-canvas-ink' : 'opacity-50 hover:opacity-100'}`}
        >
          Studio
        </Link>
        <Link 
          to="/ai-studio" 
          className={`text-[11px] tracking-[0.15em] uppercase font-bold transition-all pb-1 ${pathname === '/ai-studio' ? 'border-b border-canvas-ink' : 'opacity-50 hover:opacity-100'}`}
        >
          AI Studio
        </Link>
      </div>
      <div className="flex items-center space-x-6">
        <div className="relative hidden sm:block">
          <input 
            type="text" 
            value={searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search artists..." 
            className="bg-transparent border-b border-canvas-border py-1 text-sm focus:outline-none focus:border-canvas-accent w-48 italic placeholder:text-canvas-ink/30"
          />
        </div>
        {isAuthenticated && user ? (
          <>
            <button 
              onClick={onUploadClick}
              className="bg-canvas-ink text-canvas-bg px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-colors hover:bg-canvas-accent"
            >
              Upload
            </button>
            <button 
              onClick={handleProfileClick}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-canvas-border hover:bg-canvas-secondary transition-colors"
              title={user.username}
            >
              {user.profile_image ? (
                <img src={user.profile_image.startsWith('http') ? user.profile_image : `${API_BASE}${user.profile_image}`} alt={user.username} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
              <span className="text-xs font-bold hidden sm:inline">{user.username}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-canvas-secondary rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <Link 
            to="/signin"
            className="bg-canvas-ink text-canvas-bg px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-colors hover:bg-canvas-accent inline-block"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};
