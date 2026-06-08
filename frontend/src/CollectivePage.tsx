import React from 'react';
import { motion } from 'motion/react';
import { Users, ShieldCheck, Globe, Zap } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { mockArtists } from './data';

const COLLECTIVES = [
  {
    id: 1,
    name: "The Impressionist Circle",
    description: "A group dedicated to capturing the fleeting moments of light and color.",
    members: 124,
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=800",
    tags: ["Light", "Color", "Nature"]
  },
  {
    id: 2,
    name: "Digital Vanguard",
    description: "Pushing the boundaries of what is possible with digital mediums and AI.",
    members: 89,
    image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800",
    tags: ["Tech", "Future", "Digital"]
  },
  {
    id: 3,
    name: "Oil Masters Guild",
    description: "Preserving traditional techniques while exploring contemporary themes.",
    members: 56,
    image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=800",
    tags: ["Classic", "Oil", "Portrait"]
  }
];

export const CollectivePage: React.FC = () => {
  const [joinedCollectives, setJoinedCollectives] = React.useState<number[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const toggleJoin = (id: number) => {
    setJoinedCollectives(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredCollectives = COLLECTIVES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="flex-1 max-w-7xl mx-auto px-10 py-16 w-full">
        <header className="mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 block mb-2">Global Network</span>
          <h1 className="font-serif text-5xl italic mb-6">Artistic Collectives</h1>
          <p className="max-w-2xl text-canvas-ink/60 leading-relaxed">
            Join established circles of practice or create your own. Collectives are curated spaces where artists share resources, critiques, and exhibition opportunities.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {filteredCollectives.length > 0 ? (
            filteredCollectives.map((collective) => (
              <motion.div 
                key={collective.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/5] rounded-[32px] overflow-hidden mb-6 shadow-xl">
                  <img src={collective.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={collective.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-canvas-ink/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8 text-center">
                     <button 
                      onClick={(e) => { e.stopPropagation(); toggleJoin(collective.id); }}
                      className={`w-full py-4 ${joinedCollectives.includes(collective.id) ? 'bg-canvas-accent text-white' : 'bg-white text-canvas-ink'} rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl`}
                     >
                      {joinedCollectives.includes(collective.id) ? 'Member' : 'Apply for Membership'}
                     </button>
                  </div>
                </div>
                <div className="px-2">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-serif text-2xl italic">{collective.name}</h3>
                    <div className="flex items-center gap-1.5 opacity-40">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{collective.members + (joinedCollectives.includes(collective.id) ? 1 : 0)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-canvas-ink/50 leading-relaxed mb-4">{collective.description}</p>
                  <div className="flex gap-2 text-center">
                    {collective.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 bg-canvas-secondary rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
               <ShieldCheck className="w-12 h-12 text-canvas-ink/10 mx-auto mb-4" />
               <p className="text-canvas-ink/40 font-medium">No collectives match your search.</p>
            </div>
          )}
        </div>

        <section className="mt-24 p-12 bg-canvas-secondary rounded-[48px] border border-canvas-border flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="font-serif text-3xl italic mb-4">Start your own Collective</h2>
            <p className="text-canvas-ink/60 text-sm leading-relaxed mb-8">Gather your peers, define your artistic manifesto, and build a dedicated space for your movement. Professional tools for critiques, joint exhibitions, and collective funding included.</p>
            <button className="px-10 py-4 bg-canvas-ink text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-canvas-accent transition-all">Initialize Circle</button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="p-6 bg-white rounded-3xl border border-canvas-border flex flex-col items-center text-center">
              <ShieldCheck className="w-6 h-6 mb-3 text-canvas-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Verified Tags</span>
            </div>
            <div className="p-6 bg-white rounded-3xl border border-canvas-border flex flex-col items-center text-center">
              <Globe className="w-6 h-6 mb-3 text-canvas-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Global Reach</span>
            </div>
            <div className="p-6 bg-white rounded-3xl border border-canvas-border flex flex-col items-center text-center">
              <Zap className="w-6 h-6 mb-3 text-canvas-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fast Track</span>
            </div>
            <div className="p-6 bg-white rounded-3xl border border-canvas-border flex flex-col items-center text-center">
              <Users className="w-6 h-6 mb-3 text-canvas-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Growth Tools</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
