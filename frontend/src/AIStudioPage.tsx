import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, SlidersHorizontal, ChevronRight, Lock, 
  Loader2, Download, Share2, Check, RefreshCw, User,
  ChevronDown, HelpCircle, Eye, Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { useAuth } from './context/AuthContext';
import { generateAIImage } from './api/aiStudio';
import { createPost } from './api/posts';
import { updateProfile } from './api/users';

export const AIStudioPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  
  // Publishing state
  const [publish, setPublish] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');

  // Generation status state
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Results state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [publishedPostId, setPublishedPostId] = useState<number | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showPublishForm, setShowPublishForm] = useState(false);
  
  // Action status state
  const [isPublishingManual, setIsPublishingManual] = useState(false);
  const [isSettingProfile, setIsSettingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Loading steps text simulation
  const loadingMessages = [
    "Warming up PyTorch CUDA engine...",
    "Preloading Stable Diffusion weights (4.2GB)...",
    "Running DDPM Sampler denoising latents...",
    "Reconstructing pixels with VAE Decoder...",
    "Uploading masterpiece to storage..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < loadingMessages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 7000); // Progressively transition step messages every 7s
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Handle image generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setImageUrl(null);
    setPublishedPostId(null);
    setIsPublished(false);
    setShowPublishForm(false);
    setProfileSuccess(false);

    try {
      const response = await generateAIImage({
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim(),
        num_inference_steps: steps,
        guidance_scale: cfgScale,
        seed: seed || undefined,
        publish: publish,
        post_title: publish ? postTitle.trim() : undefined,
        post_description: publish ? postDescription.trim() : undefined
      });

      setImageUrl(response.image_url);
      if (response.published_post_id) {
        setPublishedPostId(response.published_post_id);
        setIsPublished(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual publish after generation
  const handleManualPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || isPublished) return;

    setIsPublishingManual(true);
    setError(null);

    try {
      const title = postTitle.trim() || `AI Masterpiece: ${prompt.slice(0, 40)}`;
      const description = postDescription.trim() || `Prompt: ${prompt}`;
      
      await createPost(title, description, undefined, imageUrl);
      setIsPublished(true);
      setShowPublishForm(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish artwork.");
    } finally {
      setIsPublishingManual(false);
    }
  };

  // Set as profile picture
  const handleSetProfilePicture = async () => {
    if (!imageUrl) return;
    setIsSettingProfile(true);
    setProfileSuccess(false);
    try {
      await updateProfile({
        profile_image_url: imageUrl
      });
      setProfileSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update profile picture.");
    } finally {
      setIsSettingProfile(false);
    }
  };

  // Download image
  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canvas-ai-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download image", err);
      // Fallback
      window.open(imageUrl, '_blank');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-24 h-24 rounded-full bg-canvas-secondary flex items-center justify-center mb-8">
            <Lock className="w-10 h-10 text-canvas-ink/20" />
          </div>
          <h2 className="font-serif text-3xl italic mb-4">AI Studio is Locked</h2>
          <p className="text-canvas-ink/40 max-w-sm mb-8 font-medium">Please sign in to access the neural generator and create custom artificial intelligence paintings.</p>
          <button 
            onClick={() => navigate('/signin')}
            className="px-12 py-4 bg-canvas-ink text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all shadow-md"
          >
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Parameters Form */}
        <aside className="w-full lg:w-96 border-r border-canvas-border flex flex-col bg-white overflow-y-auto custom-scrollbar flex-shrink-0">
          <div className="p-8 border-b border-canvas-border">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 block mb-2 font-sans">Neural Synthesis</span>
            <h1 className="font-serif text-3xl italic font-semibold">AI Studio</h1>
          </div>

          <form onSubmit={handleGenerate} className="p-8 space-y-6 flex-1">
            {/* Prompt input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Describe your artwork</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A gorgeous Renaissance style portrait of a futuristic cyborg, golden details, volumetric lighting, oil painting on canvas..."
                disabled={isGenerating}
                className="w-full h-32 p-4 bg-canvas-bg border border-canvas-border rounded-xl text-sm focus:outline-none focus:border-canvas-accent resize-none placeholder:text-canvas-ink/30 font-medium"
                required
              />
            </div>

            {/* Toggle Advanced */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-canvas-accent hover:opacity-80 transition-opacity"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? "Hide" : "Show"} Advanced Settings</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="space-y-5 p-5 bg-canvas-secondary/50 rounded-2xl border border-canvas-border/50">
                {/* Negative Prompt */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                    Negative Prompt
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g. blurry, low quality, distorted"
                    disabled={isGenerating}
                    className="w-full p-3 bg-white border border-canvas-border rounded-lg text-xs focus:outline-none focus:border-canvas-accent font-medium"
                  />
                </div>

                {/* Steps Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider opacity-60">
                    <span>Inference Steps: {steps}</span>
                    <span className="opacity-40">Default 20</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                    disabled={isGenerating}
                    className="w-full accent-canvas-accent"
                  />
                  <p className="text-[8px] opacity-40 leading-none">More steps improve details but increase generation time.</p>
                </div>

                {/* CFG Scale Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider opacity-60">
                    <span>Guidance Scale: {cfgScale}</span>
                    <span className="opacity-40">Default 7.5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={cfgScale}
                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                    disabled={isGenerating}
                    className="w-full accent-canvas-accent"
                  />
                  <p className="text-[8px] opacity-40 leading-none">Higher scale aligns generation more strictly to prompt.</p>
                </div>

                {/* Seed */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider opacity-60">Custom Seed (Optional)</label>
                  <input
                    type="number"
                    value={seed || ''}
                    onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Random seed"
                    disabled={isGenerating}
                    className="w-full p-3 bg-white border border-canvas-border rounded-lg text-xs focus:outline-none focus:border-canvas-accent font-mono"
                  />
                </div>
              </div>
            )}

            {/* Direct Publish Toggle */}
            <div className="pt-2 border-t border-canvas-border/55 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                  disabled={isGenerating}
                  className="rounded border-canvas-border text-canvas-accent focus:ring-canvas-accent h-4 w-4"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                  Publish directly to feed
                </span>
              </label>

              {publish && (
                <div className="space-y-3 p-4 bg-canvas-secondary/40 rounded-xl border border-canvas-border/40">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase opacity-60">Post Title</label>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Title of your painting"
                      required={publish}
                      className="w-full p-2.5 bg-white border border-canvas-border rounded-lg text-xs focus:outline-none focus:border-canvas-accent font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase opacity-60">Post Description</label>
                    <textarea
                      value={postDescription}
                      onChange={(e) => setPostDescription(e.target.value)}
                      placeholder="Explain your creative prompt..."
                      className="w-full h-20 p-2.5 bg-white border border-canvas-border rounded-lg text-xs focus:outline-none focus:border-canvas-accent resize-none font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-4 bg-canvas-ink text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-canvas-accent disabled:bg-canvas-ink/40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Masterpiece</span>
                </>
              )}
            </button>
          </form>
        </aside>

        {/* Right Side: Generation Canvas */}
        <main className="flex-1 bg-canvas-secondary p-8 md:p-16 flex flex-col justify-center items-center overflow-y-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {/* 1. Generating State Loader */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-canvas-border shadow-2xl text-center space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-canvas-secondary flex items-center justify-center animate-pulse">
                  <PaletteLoader />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl italic">Synthesizing Imagery</h3>
                  <p className="text-xs text-canvas-ink/40 font-mono tracking-wider font-semibold">
                    {loadingMessages[loadingStep]}
                  </p>
                </div>
                <div className="w-full bg-canvas-secondary h-2.5 rounded-full overflow-hidden border border-canvas-border/50">
                  <motion.div 
                    className="h-full bg-canvas-accent rounded-full"
                    initial={{ width: "3%" }}
                    animate={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <div className="text-[10px] font-bold text-canvas-ink/30 uppercase tracking-widest">
                  Step {loadingStep + 1} of {loadingMessages.length}
                </div>
              </motion.div>
            )}

            {/* 2. Generation Results */}
            {!isGenerating && imageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full flex flex-col items-center gap-8"
              >
                {/* Image Frame */}
                <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white max-h-[500px] aspect-square bg-canvas-bg flex items-center justify-center">
                  <img 
                    src={imageUrl} 
                    alt={prompt} 
                    className="object-contain w-full h-full rounded-3xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                    <p className="text-white text-xs font-medium italic drop-shadow-sm">"{prompt}"</p>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap justify-center gap-4 w-full">
                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-white hover:bg-canvas-secondary text-canvas-ink border border-canvas-border rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  {/* Set as profile */}
                  <button
                    onClick={handleSetProfilePicture}
                    disabled={isSettingProfile}
                    className={`px-6 py-3 border border-canvas-border rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${
                      profileSuccess 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-white hover:bg-canvas-secondary text-canvas-ink'
                    }`}
                  >
                    {isSettingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : profileSuccess ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                    <span>{profileSuccess ? 'Updated Avatar' : 'Set as Avatar'}</span>
                  </button>

                  {/* Publish manually */}
                  {!isPublished ? (
                    <button
                      onClick={() => setShowPublishForm(true)}
                      className="px-6 py-3 bg-canvas-ink text-white hover:bg-canvas-accent rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Publish to Feed</span>
                    </button>
                  ) : (
                    <div className="px-6 py-3 bg-green-50 border border-green-200 text-green-700 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>Exhibited on Feed</span>
                    </div>
                  )}

                  {/* Re-generate */}
                  <button
                    onClick={() => {
                      setImageUrl(null);
                      setPublishedPostId(null);
                      setIsPublished(false);
                      setProfileSuccess(false);
                    }}
                    className="px-6 py-3 bg-transparent border border-canvas-ink text-canvas-ink hover:bg-canvas-ink hover:text-white rounded-full text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>New Art</span>
                  </button>
                </div>

                {/* Inline Manual Publish Form */}
                {showPublishForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full bg-white p-6 rounded-2xl border border-canvas-border shadow-lg space-y-4"
                  >
                    <h3 className="font-serif text-lg font-semibold">Exhibit Art on Global Feed</h3>
                    <form onSubmit={handleManualPublish} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-60">Post Title</label>
                        <input
                          type="text"
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          placeholder="e.g. Drowning in Synthetic Light"
                          required
                          className="w-full p-2.5 bg-canvas-bg border border-canvas-border rounded-lg text-xs focus:outline-none focus:border-canvas-accent font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-60">Post Description</label>
                        <textarea
                          value={postDescription}
                          onChange={(e) => setPostDescription(e.target.value)}
                          placeholder="e.g. Created with stable diffusion model. Prompt:..."
                          className="w-full h-16 p-2.5 bg-canvas-bg border border-canvas-border rounded-lg text-xs focus:outline-none focus:border-canvas-accent resize-none font-medium"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPublishForm(false)}
                          className="px-5 py-2 bg-transparent text-canvas-ink border border-canvas-border hover:bg-canvas-secondary rounded-full text-[10px] font-bold uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPublishingManual}
                          className="px-5 py-2 bg-canvas-ink text-white hover:bg-canvas-accent rounded-full text-[10px] font-bold uppercase tracking-wider disabled:bg-canvas-ink/40 flex items-center gap-1.5"
                        >
                          {isPublishingManual && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Publish Now</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* 3. Idle / Empty State */}
            {!isGenerating && !imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md text-center space-y-6"
              >
                <div className="w-24 h-24 rounded-full bg-white border border-canvas-border shadow-sm flex items-center justify-center mx-auto text-canvas-ink/15">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-3xl italic">The Empty Canvas</h3>
                  <p className="text-sm text-canvas-ink/40 max-w-xs mx-auto font-medium">
                    Type a creative prompt in the left sidebar and watch the neural model paint details layer by layer.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// Decorative palette loader representing colors blending
const PaletteLoader: React.FC = () => {
  return (
    <div className="relative w-12 h-12">
      <motion.div
        className="absolute w-4 h-4 rounded-full bg-red-400/80 blur-[1px]"
        animate={{ x: [0, 16, 0, -16, 0], y: [0, 16, 32, 16, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-4 h-4 rounded-full bg-blue-400/80 blur-[1px] left-8"
        animate={{ x: [0, -16, 0, 16, 0], y: [0, -16, -32, -16, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute w-4 h-4 rounded-full bg-yellow-400/80 blur-[1px] top-8 left-4"
        animate={{ x: [0, 16, -16, 0], y: [0, -32, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
};
