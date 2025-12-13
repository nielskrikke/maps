
import { User } from '@supabase/supabase-js';

export type UserProfile = {
  id: string;
  username: string;
  role: 'DM' | 'Player';
  image_url?: string;
};

export type MapTypeEnum = 'world' | 'region' | 'city' | 'dungeon' | 'battlemap';

export type Map = {
  id: string;
  name: string;
  image_url: string;
  parent_map_id: string | null;
  is_visible: boolean;
  created_by: string;
  created_at: string;
  // New configuration fields
  grid_size?: number; // Size of grid cells in pixels (relative to image)
  pin_scale?: number; // Size of pins in pixels (relative to image)
  is_grid_visible?: boolean; // Whether to show grid overlay
  map_type?: MapTypeEnum; // New field for map classification
};

export type PinType = {
  id:string;
  name: string;
  emoji: string | null;
  color: string;
  created_by: string | null;
};

export type PinSectionType = 'text' | 'secret' | 'list' | 'statblock' | 'image' | 'inventory';

export type InventoryItem = {
    id: string; // unique ID within the inventory
    name: string;
    count: number;
    desc?: string;
    rarity?: string;
    is_magic?: boolean;
    cost?: string;
    category?: string;
};

export type PinSection = {
  id: string; // Unique ID for React rendering
  type: PinSectionType;
  title: string;
  content: string; // Main text content or description
  list_items?: string[]; // For 'list' type
  stats?: { label: string; value: string }[]; // For 'statblock' type
  image_url?: string; // For 'image' type
  items?: InventoryItem[]; // For 'inventory' type
};

export type PinData = {
  description: string;
  images: string[];
  sections: PinSection[];
  encounter_file?: {
    name: string;
    content: string;
  } | null;
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

export type CharacterRelationship = {
  targetId: string;
  type: string; // e.g., "Sibling", "Rival", "Ally"
  notes?: string;
};

export type Character = {
  id: string;
  name: string;
  role_details: {
    race: string;
    class: string;
    level: number;
    alignment: string;
  };
  backstory: string;
  gm_notes: string;
  image_url: string | null;
  is_npc: boolean;
  is_visible: boolean; // New visibility toggle
  current_pin_id: string | null;
  relationships: CharacterRelationship[];
  sheet_url?: string;     // External link
  character_json?: any;   // Stored JSON object
  created_by: string;
};

export type Comment = {
  id: string;
  pin_id: string | null;      // Now nullable
  character_id: string | null; // New field
  user_id: string;
  text: string;
  is_private: boolean;
  created_at: string;
  users: { username: string }; // For joined data
};

export type AppUser = User & { profile: UserProfile };
