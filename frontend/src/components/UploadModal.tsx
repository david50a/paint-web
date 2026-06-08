import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { createPost } from '../api/posts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Please add a title');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await createPost(form.title, form.description, imageFile || undefined);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setImageFile(null);
    setForm({ title: '', description: '' });
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-canvas-bg/90 backdrop-blur-xl" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[32px] border border-canvas-border shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 z-10 p-2 bg-canvas-secondary rounded-full hover:bg-canvas-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-10 pt-10 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-1">New artwork</p>
              <h2 className="font-serif text-3xl font-light italic">Share Your Work</h2>
            </div>

            <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-5 mt-4">
              {/* Image Upload Area */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video rounded-2xl bg-canvas-secondary border-2 border-dashed border-canvas-border hover:border-canvas-accent transition-colors overflow-hidden group flex items-center justify-center"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-canvas-ink/30 group-hover:text-canvas-accent transition-colors">
                    <ImagePlus className="w-10 h-10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Click to upload image
                    </span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">
                  Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Name your artwork"
                  className="w-full bg-canvas-secondary border border-canvas-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-canvas-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-canvas-ink/40 block mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe your creative process..."
                  className="w-full bg-canvas-secondary border border-canvas-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-canvas-accent transition-colors resize-none"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-medium"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-canvas-ink text-canvas-bg py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Publish to Gallery
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
