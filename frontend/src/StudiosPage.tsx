import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Layout, Maximize, Play, ExternalLink } from 'lucide-react';
import { Navbar } from './components/Navbar';

const STUDIOS = [
  {
    id: 1,
    name: "Watercolor Sanctuary",
    type: "Virtual Environment",
    activity: "12 Artists Live",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800",
    description: "A serene space optimized for high-resolution watercolor simulation and color blending studies."
  },
  {
    id: 2,
    name: "Oil & Canvas Loft",
    type: "Collaborative Space",
    activity: "4 Active Projects",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800",
    description: "Industrial loft aesthetic designed for large-scale digital oil painting and texture modeling."
  },
  {
    id: 3,
    name: "Sculpture Courtyard",
    type: "3D Workspace",
    activity: "8 Members Online",
    image: "https://images.unsplash.com/photo-1544413647-b53f243071e3?auto=format&fit=crop&q=80&w=800",
    description: "Open-air architectural space for 3D modeling, spatial art, and augmented reality installations."
  },
  {
    id: 4,
    name: "Neural Synthesis Atelier",
    type: "AI Art Lab",
    activity: "Ready for Prompts",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800",
    description: "Harness stable diffusion and neural style engines. Generate custom paintings from text prompts.",
    link: "/ai-studio"
  }
];

export const StudiosPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStudios, setActiveStudios] = React.useState<number[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const enterStudio = (id: number) => {
    setActiveStudios(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredStudios = STUDIOS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="flex-1 max-w-7xl mx-auto px-10 py-16 w-full">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 block mb-2">Workspace</span>
            <h1 className="font-serif text-5xl italic mb-6">Virtual Studios</h1>
            <p className="text-canvas-ink/60 leading-relaxed">
              Step into immersive digital environments tailored for your specific medium. Studios provide the specialized tools and communal energy of a physical atelier.
            </p>
          </div>
          <button 
            onClick={() => navigate('/studio')}
            className="px-10 py-4 bg-canvas-ink text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all flex items-center gap-2"
          >
            Open Personal Studio <Maximize className="w-4 h-4" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {filteredStudios.length > 0 ? (
            filteredStudios.map((studio) => (
              <motion.div 
                key={studio.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row gap-8 bg-white p-8 rounded-[40px] border border-canvas-border hover:shadow-2xl transition-all group"
              >
                <div className="w-full md:w-64 aspect-square rounded-3xl overflow-hidden shadow-inner">
                  <img src={studio.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={studio.name} />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="mb-auto">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-serif text-2xl mb-1">{studio.name}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-canvas-accent">{studio.type}</p>
                      </div>
                      <span className={`px-3 py-1 ${activeStudios.includes(studio.id) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} text-[8px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1`}>
                        <div className={`w-1 h-1 ${activeStudios.includes(studio.id) ? 'bg-red-600' : 'bg-green-600'} rounded-full animate-pulse`} /> {activeStudios.includes(studio.id) ? 'You are Live' : studio.activity}
                      </span>
                    </div>
                    <p className="text-sm text-canvas-ink/50 leading-relaxed mb-6">{studio.description}</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        const studioData = STUDIOS.find(s => s.id === studio.id);
                        if (studioData && 'link' in studioData && studioData.link) {
                          navigate(studioData.link as string);
                        } else {
                          enterStudio(studio.id);
                        }
                      }}
                      className={`flex-1 py-3 ${activeStudios.includes(studio.id) ? 'bg-canvas-ink text-white' : 'bg-canvas-secondary hover:bg-canvas-ink hover:text-white'} rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                    >
                      {activeStudios.includes(studio.id) ? 'Exit Studio' : 'Enter'} <Play className={`w-3 h-3 ${activeStudios.includes(studio.id) ? 'rotate-90' : ''} fill-current transition-transform`} />
                    </button>
                    <button className="p-3 border border-canvas-border rounded-xl hover:border-canvas-accent transition-colors">
                      <ExternalLink className="w-4 h-4 text-canvas-ink/40" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
               <Layout className="w-12 h-12 text-canvas-ink/10 mx-auto mb-4" />
               <p className="text-canvas-ink/40 font-medium">No studios match your search.</p>
            </div>
          )}
          
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-canvas-border rounded-[40px] p-12 text-center group cursor-pointer hover:border-canvas-accent transition-colors">
            <div className="w-20 h-20 rounded-full bg-canvas-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <Layout className="w-8 h-8 text-canvas-ink/20" />
            </div>
            <h3 className="font-serif text-2xl mb-2 opacity-40">Architect New Studio</h3>
            <p className="text-sm text-canvas-ink/30 max-w-xs mx-auto">Custom build an environment with your preferred lighting, tools, and social parameters.</p>
          </div>
        </div>
      </main>
    </div>
  );
};
