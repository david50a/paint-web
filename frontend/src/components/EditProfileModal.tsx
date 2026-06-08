import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Loader2, Camera } from 'lucide-react';
import { updateProfile, UserProfile } from '../api/users';
import { API_BASE } from '@/api/client';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSuccess: (updatedProfile: UserProfile) => void;
}



export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profile, onSuccess }) => {
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    profile.profile_image ? (profile.profile_image.startsWith('http') ? profile.profile_image : `${API_BASE}${profile.profile_image}`) : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const updated = await updateProfile({
        username,
        bio,
        profile_image: imageFile || undefined
      });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-canvas-ink/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-canvas-border flex justify-between items-center">
              <h2 className="font-serif text-2xl italic">Edit Profile</h2>
              <button onClick={onClose} className="p-2 hover:bg-canvas-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex flex-col items-center">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-canvas-border group-hover:ring-canvas-accent transition-all bg-canvas-secondary">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-canvas-ink/20" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-canvas-ink/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-canvas-ink/40">Change Photo</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">Username</label>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-6 py-3 bg-canvas-secondary rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-canvas-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-6 py-3 bg-canvas-secondary rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-canvas-accent transition-all resize-none"
                    placeholder="Tell your story..."
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest text-center">{error}</p>}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-canvas-ink text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-canvas-accent transition-all flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
