
import { User } from '@supabase/supabase-js';

export type UserProfile = {
  id: string;
  username: string;
  role: 'DM' | 'Player';
};

export type Map = {
  id: string;
  name: string;
  image_url: string;
  parent_map_id: string | null;
  is_visible: boolean;
  created_by: string;
  created_at: string;
};

export type PinType = {
  id:string;
  name: string;
  emoji: string | null;
  color: string;
  created_by: string | null;
};

export type PinData = {
  description: string;
  images: string[];
  sections: { title: string; content: string }[];
};

export type Pin = {
  id: string;
  map_id: string;
  pin_type_id: string;
  x_coord: number;
  y_coord: number;
  title: string;
  data: PinData;
  linked_map_id: string | null;
  is_visible: boolean;
  created_by: string;
  created_at: string;
  pin_types: PinType | null; // For joined data
};

export type Comment = {
  id: string;
  pin_id: string;
  user_id: string;
  text: string;
  is_private: boolean;
  created_at: string;
  users: { username: string }; // For joined data
};

export type AppUser = User & { profile: UserProfile };