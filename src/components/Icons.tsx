import React from 'react';
import { 
  Map, Globe, Castle, Skull, MapPin, Shield, User, Loader2, Upload, Download, 
  Tag, LogOut, X, Lock, Eye, EyeOff, Trash2, Pencil, Brush, Maximize, Image, 
  ChevronDown, ChevronRight, Plus, Minus, Hand, Box, Backpack, Search, Book, 
  Scroll, Compass, ExternalLink, Settings, LayoutGrid, Check,
  LucideProps
} from 'lucide-react';
import { cn } from '../lib/utils';

export type IconName = 
  | 'map' | 'globe' | 'castle' | 'skull' | 'pin' | 'shield' | 'user' | 'spinner' 
  | 'upload' | 'download' | 'tag' | 'logout' | 'close' | 'lock' | 'eye' 
  | 'eye-off' | 'trash' | 'pencil' | 'brush' | 'center' | 'image' 
  | 'chevron-down' | 'chevron-right' | 'plus' | 'minus' | 'hand' | 'chest' 
  | 'backpack' | 'search' | 'book' | 'scroll' | 'compass' | 'external' 
  | 'settings' | 'view_apps' | 'visibility' | 'visibility_off' | 'check';

interface IconProps extends LucideProps {
  name: IconName | string;
  title?: string;
}

const iconMap: Record<string, React.ElementType> = {
  map: Map,
  globe: Globe,
  castle: Castle,
  skull: Skull,
  pin: MapPin,
  shield: Shield,
  user: User,
  spinner: Loader2,
  upload: Upload,
  download: Download,
  tag: Tag,
  logout: LogOut,
  close: X,
  lock: Lock,
  eye: Eye,
  'eye-off': EyeOff,
  trash: Trash2,
  pencil: Pencil,
  brush: Brush,
  center: Maximize,
  image: Image,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  plus: Plus,
  minus: Minus,
  hand: Hand,
  chest: Box,
  backpack: Backpack,
  search: Search,
  book: Book,
  scroll: Scroll,
  compass: Compass,
  external: ExternalLink,
  settings: Settings,
  view_apps: LayoutGrid,
  visibility: Eye,
  visibility_off: EyeOff,
  check: Check,
};

export const Icon: React.FC<IconProps> = ({ name, title, className, ...props }) => {
  const LucideIcon = iconMap[name] || MapPin;
  
  return (
    <LucideIcon 
      className={cn("h-6 w-6", className)} 
      {...props}
    >
      {title && <title>{title}</title>}
    </LucideIcon>
  );
};
