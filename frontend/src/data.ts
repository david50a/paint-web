import { Artist, Painting } from './types';

export const mockArtists: Artist[] = [
  {
    id: 'a1',
    name: 'Elena Vance',
    handle: '@evance_art',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    bio: 'Contemporary oil painter focusing on the light and shadow of urban landscapes.',
    followers: 12400,
    following: 342,
    location: 'London, UK'
  },
  {
    id: 'a2',
    name: 'Julian Thorne',
    handle: '@jthorn',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    bio: 'Abstract expressionist. Exploring the intersection of color and emotion.',
    followers: 8900,
    following: 156,
    location: 'Berlin, Germany'
  },
  {
    id: 'a3',
    name: 'Saira Malik',
    handle: '@sairamalik_painting',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    bio: 'Watercolor artist dedicated to botanical precision and fantasy concepts.',
    followers: 15600,
    following: 890,
    location: 'Lahore, Pakistan'
  }
];

export const mockPaintings: Painting[] = [
  {
    id: 'p1',
    artistId: 'a1',
    title: 'Silver Hour in Soho',
    description: 'The moment just before sunset when the city turns to mercury.',
    image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200&auto=format&fit=crop',
    medium: 'Oil on Canvas',
    technique: 'Alla Prima',
    dimensions: '24" x 36"',
    year: 2024,
    likes: 1242,
    comments: 48,
    tags: ['Urban', 'Oil', 'London'],
    createdAt: '2024-03-15'
  },
  {
    id: 'p2',
    artistId: 'a2',
    title: 'Entropy Flow',
    description: 'A study of chaotic motion captured in heavy impasto strokes.',
    image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=1200&auto=format&fit=crop',
    medium: 'Acrylic and Mixed Media',
    technique: 'Impasto',
    dimensions: '48" x 48"',
    year: 2024,
    likes: 850,
    comments: 12,
    tags: ['Abstract', 'Color', 'Expressionism'],
    createdAt: '2024-03-20'
  },
  {
    id: 'p3',
    artistId: 'a2',
    title: 'Midnight Resonance',
    description: 'The feeling of sound in total silence.',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop',
    medium: 'Acrylic on Linen',
    technique: 'Glazing',
    dimensions: '30" x 30"',
    year: 2023,
    likes: 2105,
    comments: 76,
    tags: ['Dark', 'Abstract', 'Mood'],
    createdAt: '2023-11-12'
  },
  {
    id: 'p4',
    artistId: 'a3',
    title: 'The Orchid Thief',
    description: 'A botanical study with a touch of theatrical lighting.',
    image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200&auto=format&fit=crop',
    medium: 'Watercolor',
    technique: 'Wet-on-wet',
    dimensions: '12" x 16"',
    year: 2024,
    likes: 3400,
    comments: 112,
    tags: ['Botanical', 'Watercolor', 'Nature'],
    createdAt: '2024-04-01'
  },
  {
    id: 'p5',
    artistId: 'a1',
    title: 'Rain on Regent Street',
    description: 'Reflections and blurred lights in the rain.',
    image: 'https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=1200&auto=format&fit=crop',
    medium: 'Oil on Canvas',
    technique: 'Glazing',
    dimensions: '20" x 24"',
    year: 2024,
    likes: 1890,
    comments: 54,
    tags: ['Rain', 'Cityscape', 'Impressionism'],
    createdAt: '2024-02-10'
  },
  {
    id: 'p6',
    artistId: 'a3',
    title: 'Desert Dreamscape',
    description: 'An ethereal landscape where time feels suspended.',
    image: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=1200&auto=format&fit=crop',
    medium: 'Watercolor and Ink',
    technique: 'Dry Brush',
    dimensions: '18" x 24"',
    year: 2024,
    likes: 2200,
    comments: 89,
    tags: ['Landscape', 'Surreal', 'Desert'],
    createdAt: '2024-04-18'
  }
];
