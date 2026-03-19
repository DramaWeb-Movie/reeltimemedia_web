// Core types for the ReelTime Media application

/** Single part: pay per movie. Series: pay monthly subscription. */
export type ContentType = 'movie' | 'series';

export interface Drama {
  id: string;
  title: string;
  /** Khmer title when available */
  titleKh?: string;
  description: string;
  posterUrl: string;
  bannerUrl?: string;
  releaseYear: number;
  rating: number;
  genres: string[];
  episodes: Episode[];
  cast: CastMember[];
  status: 'ongoing' | 'completed';
  totalEpisodes: number;
  /** movie = pay per title, series = monthly subscription */
  contentType: ContentType;
  /** One-time purchase price (movies only), USD */
  price?: number;
  /** Rent price (movies only), USD */
  rentPrice?: number;
  /** Monthly subscription price (series only), USD */
  monthlyPrice?: number;
  /** Number of episodes that are free to watch (auth required, no subscription needed) */
  freeEpisodesCount?: number;
  /** YouTube or other trailer video URL */
  trailerUrl?: string;
}

export interface Episode {
  id: string;
  dramaId: string;
  episodeNumber: number;
  title: string;
  description?: string;
  /** Duration in seconds */
  duration: number;
  releaseDate: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface CastMember {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  favorites: string[]; // drama IDs
  watchHistory: WatchHistory[];
}

export interface WatchHistory {
  dramaId: string;
  episodeId: string;
  watchedAt: string;
  progress: number; // percentage watched
}

export interface Review {
  id: string;
  dramaId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}
