export interface Artist {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  location: string;
}
export interface Painting {
  id: string;
  artistId: string;
  artistName?: string;
  artistAvatar?: string;
  title: string;
  description: string;
  image: string;
  medium: string;
  technique: string;
  dimensions: string;
  year: number;
  likes: number;
  comments: number;
  tags: string[];
  createdAt: string;
  likedByMe?: boolean;
  savedByMe?: boolean;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

export interface PostOwner {
  id: number;
  username: string;
  profile_image: string | null;
}

export interface Post {
  id: number;
  title: string;
  content: string | null;
  image_url: string | null;
  caption: string | null;
  created_at: string | null;
  owner: PostOwner;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
}

export interface Comment {
  id: number;
  user_id: number;
  post_id: number;
  comment: string;
  created_at: string;
  user?: {
    username: string;
    profile_image: string | null;
  };
}
