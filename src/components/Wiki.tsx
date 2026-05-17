
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../App';
import { Map as MapType, Pin, Character, Comment, WikiPage, QuestItem } from '../types';
import { Icon } from './Icons';
import { RichTextEditor } from './RichTextEditor';
import { ConfirmModal, Modal } from './Modals';
import { supabase } from '../services/supabase';
import { cn, stripHtml } from '../lib/utils';

interface WikiProps {
    selectedMap: MapType | null;
    selectedPin: Pin | null;
    selectedCharacter: Character | null;
    selectedWikiPage: WikiPage | null;
    onSelectMap: (map: MapType) => void;
    onLocatePin: (pin: Pin) => void;
    onSelectWikiPage: (page: WikiPage) => void;
    onSelectCharacter: (char: Character) => void;
    onSelectPin: (pin: Pin) => void;
    onEditWikiPage?: (page: WikiPage) => void;
    onEditCharacter?: (char: Character) => void;
    onEditPin?: (pin: Pin) => void;
    onHome?: () => void;
}

const Wiki: React.FC<WikiProps> = ({ 
    selectedMap, 
    selectedPin, 
    selectedCharacter, 
    selectedWikiPage, 
    onSelectMap, 
    onLocatePin, 
    onSelectWikiPage,
    onSelectCharacter,
    onSelectPin,
    onEditWikiPage,
    onEditCharacter,
    onEditPin,
    onHome
}) => {
    const { 
        maps, pins, pinTypes, characters, wikiPages, isPlayerView,
        expandedWikiSection, setExpandedWikiSection, removeLocalItem, setError 
    } = useAppContext();
    const { user } = useAuth();
    const isDM = user?.profile.role === 'DM';
    const canSeeSecrets = isDM && !isPlayerView;

    // Comments State for Characters
    const [characterComments, setCharacterComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPrivateComment, setIsPrivateComment] = useState(false);
    const [selectedQuest, setSelectedQuest] = useState<QuestItem | null>(null);

    // Fetch character comments when a character is selected
    useEffect(() => {
        if (selectedCharacter) {
            const fetchComments = async () => {
                const { data, error } = await supabase
                    .from('comments')
                    .select('*, users(username)')
                    .eq('character_id', selectedCharacter.id)
                    .order('created_at', { ascending: true });
                if (data) setCharacterComments(data as any);
            };
            fetchComments();
        } else {
            setCharacterComments([]);
        }
    }, [selectedCharacter?.id]);

    const handleAddCharacterComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !selectedCharacter || !user) return;

        const { data, error } = await supabase
            .from('comments')
            .insert({
                character_id: selectedCharacter.id,
                user_id: user.id,
                text: newComment,
                is_private: isPrivateComment
            })
            .select('*, users(username)')
            .single();

        if (data) setCharacterComments([...characterComments, data as any]);
        setNewComment('');
        setIsPrivateComment(false);
    };

    const handleDeleteCharacterComment = async (commentId: string) => {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
        
        if (!error) {
            setCharacterComments(prev => prev.filter(c => c.id !== commentId));
        }
    };

    // Lightbox State
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const resetZoom = () => setZoomLevel(1);

    const closeLightbox = () => {
        setLightboxImage(null);
        resetZoom();
    };

    // Get pins for the currently active map (to display in content area)
    const activeMapPins = selectedMap 
        ? pins.filter(p => p.map_id === selectedMap.id).sort((a,b) => a.title.localeCompare(b.title))
        : [];

    const getCharacterName = (id: string) => characters.find(c => c.id === id)?.name || "Unknown";

    const CharacterPresenceList: React.FC<{ chars: Character[], title: string }> = ({ chars, title }) => {
        if (chars.length === 0) return null;
        return (
            <div className="mb-10 bg-white/5 p-6 rounded-2xl border border-white/5 shadow-xl">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 mb-5 flex items-center gap-2">
                    <Icon name="user" className="w-4 h-4"/> {title}
                </h3>
                <div className="flex flex-wrap gap-4">
                    {chars.map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 min-w-[180px] hover:bg-white/5 transition-all group cursor-default">
                            <div className="w-12 h-12 rounded-full bg-dnd-dark overflow-hidden ring-2 ring-white/10 group-hover:ring-dnd-gold transition-all shadow-lg">
                                {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover" alt={c.name} referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-dnd-text/20"><Icon name="user" className="w-6 h-6"/></div>}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-white truncate max-w-[120px] group-hover:text-dnd-gold transition-colors">{c.name}</p>
                                <p className="text-[10px] text-dnd-text/40 uppercase tracking-widest font-bold mt-1">{c.role_details?.race}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- Renderers ---

    const renderPinContent = (pin: Pin) => {
        const type = pinTypes.find(t => t.id === pin.pin_type_id);
        const charactersAtPin = characters.filter(c => c.current_pin_id === pin.id && ((isDM && !isPlayerView) || c.is_visible));
        const pinMap = maps.find(m => m.id === pin.map_id);
        
        return (
            <div 
                className="space-y-10 max-w-5xl mx-auto pb-24"
            >
                {/* Header */}
                <div className="border-b border-white/5 pb-8">
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl shadow-2xl text-2xl ring-2 ring-white/10" style={{ backgroundColor: type?.color || '#555' }}>
                            {type?.emoji || '📍'}
                        </div>
                        <div>
                            <div className="flex items-center gap-4">
                                <h1 className="text-3xl font-serif font-bold text-white tracking-tight">{pin.title}</h1>
                                {isDM && !isPlayerView && onEditPin && (
                                    <button 
                                        onClick={() => onEditPin(pin)}
                                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-dnd-gold transition-all border border-white/5 shadow-lg"
                                        title="Edit Pin"
                                    >
                                        <Icon name="pencil" className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="bg-white/5 px-3 py-1 rounded-lg text-[10px] text-dnd-gold border border-white/5 uppercase tracking-[0.2em] font-bold">{type?.name || 'Unknown'}</span>
                                {pinMap && <span className="text-dnd-text/40 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Icon name="map" className="w-3 h-3"/> {pinMap.name}</span>}
                            </div>
                        </div>
                        <button 
                            onClick={() => onLocatePin(pin)}
                            className="ml-auto flex items-center gap-2 bg-dnd-gold text-white px-4 py-2 rounded-xl transition-all text-[9px] font-bold uppercase tracking-widest shadow-xl shadow-dnd-gold/20 hover:brightness-110 group"
                        >
                            <Icon name="compass" className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform"/>
                            Locate
                        </button>
                    </div>

                    {pin.data.description && (
                         <div 
                            className="rich-text-content max-w-none text-dnd-text/80 text-xl leading-relaxed glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl font-medium"
                            dangerouslySetInnerHTML={{ __html: pin.data.description }}
                         />
                    )}
                </div>

                <CharacterPresenceList chars={charactersAtPin} title="Inhabitants" />

                {/* Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {pin.data.sections?.map((section, idx) => {
                        const isVisible = section.is_visible ?? (section.type !== 'secret' && section.type !== 'encounter');
                        if (!isVisible && !canSeeSecrets) return null;
                        
                        const isFullWidth = section.type === 'image' || section.type === 'text' || section.type === 'list' || section.type === 'inventory' || section.type === 'split' || section.type === 'gallery' || section.type === 'timeline' || section.type === 'quote' || section.type === 'attribute_list';
                        
                        return (
                            <div key={idx} className={cn(
                                "bg-white/5 rounded-2xl border border-white/5 overflow-hidden shadow-xl",
                                isFullWidth ? 'md:col-span-2' : '',
                                section.type === 'secret' ? 'border-dnd-red/20 bg-dnd-red/5' : ''
                            )}>
                                <div className={cn(
                                    "px-6 py-4 border-b border-white/5 flex items-center justify-between",
                                    section.type === 'secret' ? 'bg-dnd-red/10' : 'bg-white/5'
                                )}>
                                    <h3 className={cn(
                                        "font-serif text-xl font-bold",
                                        section.type === 'secret' ? 'text-dnd-red' : 'text-white'
                                    )}>
                                        {section.type === 'secret' && <Icon name="lock" className="w-4 h-4 inline mr-2" />}
                                        {section.title}
                                    </h3>
                                    <span className="text-[10px] uppercase text-dnd-text/20 font-bold tracking-[0.2em]">{section.type}</span>
                                </div>
                                
                                <div className="p-6">
                                    {section.type === 'text' && (
                                        <div 
                                            className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none text-lg"
                                            dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                        />
                                    )}
                                    {section.type === 'secret' && (
                                        <div 
                                            className="text-dnd-red/80 leading-relaxed font-mono text-sm rich-text-content max-w-none"
                                            dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                        />
                                    )}
                                    {section.type === 'encounter' && (
                                        <div className="space-y-4">
                                            {section.content && (
                                                <div 
                                                    className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: section.content }}
                                                />
                                            )}
                                        </div>
                                    )}
                                    
                                    {section.type === 'list' && (
                                        <>
                                            {section.content && <p className="mb-5 text-dnd-text/40 italic leading-relaxed">{section.content}</p>}
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {section.list_items?.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-dnd-text/80 bg-black/20 p-4 rounded-xl border border-white/5">
                                                        <span className="text-dnd-gold mt-1">✦</span>
                                                        <span className="leading-relaxed">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                    {section.type === 'statblock' && (
                                        <>
                                            {section.content && <p className="mb-5 text-dnd-text/40 italic leading-relaxed">{section.content}</p>}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {section.stats?.map((stat, i) => (
                                                    <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center shadow-lg">
                                                        <span className="text-[10px] uppercase tracking-widest text-dnd-gold font-bold mb-2">{stat.label}</span>
                                                        <span className="font-serif text-2xl text-white font-bold">{stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {section.type === 'image' && section.image_url && (
                                        <div 
                                            className="cursor-zoom-in group relative"
                                            onClick={() => setLightboxImage(section.image_url!)}
                                        >
                                            <img src={section.image_url} alt={section.title} className="w-full h-auto rounded-xl shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                <Icon name="search" className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    )}
                                    {section.type === 'split' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                            <div 
                                                className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none text-lg"
                                                dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                            />
                                            {section.image_url && (
                                                <img src={section.image_url} alt={section.title} className="w-full h-auto rounded-xl shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
                                            )}
                                        </div>
                                    )}
                                    {section.type === 'gallery' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {section.gallery_images?.map((img, i) => (
                                                <div 
                                                    key={i} 
                                                    className="aspect-square rounded-xl overflow-hidden border border-white/5 group relative shadow-lg cursor-zoom-in"
                                                    onClick={() => setLightboxImage(img)}
                                                >
                                                    <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Icon name="search" className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {section.type === 'timeline' && (
                                        <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                                            {section.timeline_items?.map((item, i) => (
                                                <div key={i} className="relative pl-10">
                                                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-dnd-dark border-2 border-dnd-gold flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.3)] z-10">
                                                        <div className="w-2 h-2 rounded-full bg-dnd-gold" />
                                                    </div>
                                                    <div>
                                                        <span className="text-dnd-gold font-bold text-xs uppercase tracking-widest bg-dnd-gold/10 px-2 py-1 rounded border border-dnd-gold/20 leading-none inline-block mb-3">{item.date}</span>
                                                        <div 
                                                            className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none text-sm"
                                                            dangerouslySetInnerHTML={{ __html: item.content }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {section.type === 'quote' && (
                                        <div className="relative p-10 bg-black/20 rounded-2xl border-l-4 border-dnd-gold italic font-serif">
                                            <Icon name="quote" className="absolute top-4 left-4 w-12 h-12 text-dnd-gold/10 pointer-events-none" />
                                            <div 
                                                className="text-2xl text-white/80 leading-relaxed relative z-10 rich-text-content max-w-none"
                                                dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                            />
                                            {section.quote_author && (
                                                <div className="mt-6 flex items-center gap-3">
                                                    <div className="w-8 h-[1px] bg-dnd-gold/30" />
                                                    <span className="text-dnd-gold font-bold uppercase tracking-widest text-xs">{section.quote_author}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {section.type === 'attribute_list' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                            {section.stats?.map((stat, i) => (
                                                <div key={i} className="flex flex-col gap-1 border-l border-white/5 pl-4 py-1 hover:border-dnd-gold/50 transition-colors group">
                                                    <span className="text-[10px] uppercase tracking-widest text-dnd-text/40 font-bold group-hover:text-dnd-gold/60 transition-colors">{stat.label}</span>
                                                    <span className="text-white font-serif text-lg font-bold group-hover:text-dnd-gold transition-colors">{stat.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {section.type === 'inventory' && (
                                        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                                            <table className="w-full text-left text-sm">
                                                <thead className="text-dnd-text/20 uppercase text-[10px] font-bold tracking-widest border-b border-white/5">
                                                    <tr>
                                                        <th className="py-4 pl-6">Item</th>
                                                        <th className="py-4">Rarity</th>
                                                        <th className="py-4 text-right pr-6">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {section.items?.map((item, i) => (
                                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                            <td className="py-4 pl-6">
                                                                <span className={cn("font-bold", item.is_magic ? 'text-dnd-gold' : 'text-white')}>{item.name}</span>
                                                            </td>
                                                            <td className="py-4 text-purple-400/60 text-[10px] font-bold uppercase tracking-widest">{item.rarity || '-'}</td>
                                                            <td className="py-4 text-right pr-6 font-mono text-dnd-text/40 font-bold">{item.count}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCharacterContent = (char: Character) => {
        return (
            <div 
                className="space-y-10 max-w-5xl mx-auto pb-24"
            >
                <div className="flex flex-col md:flex-row gap-10 border-b border-white/5 pb-10">
                    <div className="w-56 h-56 rounded-[2.5rem] overflow-hidden ring-4 ring-white/5 shadow-2xl bg-dnd-dark flex-shrink-0 mx-auto md:mx-0">
                        {char.image_url ? (
                            <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-dnd-text/20 bg-white/5"><Icon name="user" className="w-20 h-20"/></div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left pt-2">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-3">
                            <h1 className="text-3xl font-serif font-bold text-white tracking-tight">{char.name}</h1>
                            {isDM && !isPlayerView && onEditCharacter && (
                                <button 
                                    onClick={() => onEditCharacter(char)}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-dnd-gold transition-all border border-white/5 shadow-lg"
                                    title="Edit Character"
                                >
                                    <Icon name="pencil" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[9px] font-bold uppercase tracking-[0.2em] mb-4">
                            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/5 text-dnd-text/60">{char.role_details?.race}</span>
                            
                            {!isPlayerView && (
                                <>
                                    <span className="bg-white/5 px-3 py-1 rounded-full border border-white/5 text-dnd-text/60">{char.role_details?.class}</span>
                                    <span className="bg-dnd-gold/10 px-3 py-1 rounded-full border border-dnd-gold/20 text-dnd-gold">Lvl {char.role_details?.level}</span>
                                    <span className="text-dnd-text/20">{char.role_details?.alignment}</span>
                                </>
                            )}
                        </div>
                        {char.current_pin_id && (() => {
                            const currentPin = pins.find(p => p.id === char.current_pin_id);
                            const currentMap = currentPin ? maps.find(m => m.id === currentPin.map_id) : null;
                            
                            if (!currentPin || !currentMap) return null;

                            return (
                                <button 
                                    onClick={() => onLocatePin(currentPin)}
                                    className="inline-flex items-center gap-2.5 text-dnd-gold bg-dnd-gold/5 hover:bg-dnd-gold/10 px-3 py-1.5 rounded-xl border border-dnd-gold/20 hover:border-dnd-gold/50 mb-4 transition-all cursor-pointer group shadow-lg"
                                >
                                    <Icon name="map" className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"/>
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Currently in <span className="text-white">{currentMap.name}</span></span>
                                    <Icon name="chevron-right" className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-all -ml-1" />
                                </button>
                            );
                        })()}
                        
                        {!isPlayerView && char.sheet_url && (
                            <div className="flex gap-2 justify-center md:justify-start">
                                <a href={char.sheet_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border border-white/5">
                                    <Icon name="external" className="w-3.5 h-3.5 text-dnd-gold"/> Character Sheet
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-black/15 rounded-2xl border border-white/5 overflow-hidden">
                            <h3 className="bg-black/30 px-8 py-3 border-b border-white/5 font-sans text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Biography</h3>
                            <div className="p-8">
                                <div 
                                    className="text-dnd-text/60 leading-relaxed font-medium rich-text-content max-w-none"
                                    dangerouslySetInnerHTML={{ __html: char.backstory || "No records of this soul exist." }}
                                />
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-black/15 rounded-2xl border border-white/5 overflow-hidden">
                            <h3 className="bg-black/30 px-8 py-3 border-b border-white/5 font-sans text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Notes</h3>
                            <div className="p-8">
                                <div className="space-y-4 mb-8">
                                {characterComments.length === 0 && <p className="text-dnd-text/20 italic text-sm py-4">No notes found.</p>}
                                {characterComments.map(comment => (
                                    <div key={comment.id} className="bg-black/40 p-5 rounded-2xl border border-white/5 shadow-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-dnd-gold text-sm">{comment.users.username}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">{new Date(comment.created_at).toLocaleDateString()}</span>
                                                {(isDM || comment.user_id === user?.id) && (
                                                    <button 
                                                        onClick={() => handleDeleteCharacterComment(comment.id)}
                                                        className="text-dnd-red/40 hover:text-dnd-red transition-colors"
                                                        title="Delete Note"
                                                    >
                                                        <Icon name="trash" className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div 
                                            className="text-dnd-text/60 text-sm leading-relaxed rich-text-content max-w-none"
                                            dangerouslySetInnerHTML={{ __html: comment.text }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleAddCharacterComment} className="space-y-4">
                                <RichTextEditor 
                                    content={newComment} 
                                    onChange={setNewComment} 
                                    placeholder="Add a note..." 
                                    isSmall={true}
                                    className="w-full"
                                />
                                <div className="flex justify-end">
                                    <button type="submit" className="bg-dnd-gold hover:brightness-110 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-dnd-gold/20 transition-all">Post Note</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    </div>

                    <div className="space-y-8">
                        {canSeeSecrets && char.gm_notes && (
                            <div className="bg-dnd-red/5 rounded-2xl border border-dnd-red/20 overflow-hidden">
                                <h3 className="bg-dnd-red/10 px-6 py-3 border-b border-dnd-red/10 font-sans text-[10px] text-dnd-red font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Icon name="lock" className="w-3.5 h-3.5"/> GM Secrets
                                </h3>
                                <div className="p-6">
                                    <div 
                                        className="text-sm text-dnd-red/80 leading-relaxed font-mono rich-text-content max-w-none"
                                        dangerouslySetInnerHTML={{ __html: char.gm_notes }}
                                    />
                                    {char.character_json && (
                                        <button 
                                            onClick={() => {
                                                const blob = new Blob([JSON.stringify(char.character_json, null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${char.name.replace(/\s+/g, '_').toLowerCase()}.json`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                            }}
                                            className="mt-4 flex items-center gap-2 bg-dnd-red/10 hover:bg-dnd-red/20 text-dnd-red px-4 py-2 rounded-xl border border-dnd-red/20 transition-all text-xs font-bold uppercase tracking-widest"
                                        >
                                            <Icon name="download" className="w-4 h-4" />
                                            Download JSON
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-black/15 rounded-2xl border border-white/5 overflow-hidden">
                            <h3 className="bg-black/30 px-6 py-3 border-b border-white/5 font-sans text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Connections</h3>
                            <div className="p-6">
                                {char.relationships.length > 0 ? (
                                    <ul className="space-y-4">
                                        {char.relationships.map((rel, i) => (
                                            <li key={i} className="text-sm group">
                                                <div className="font-bold text-white group-hover:text-dnd-gold transition-colors">{getCharacterName(rel.targetId)}</div>
                                                <div className="text-dnd-gold/60 text-[10px] uppercase tracking-widest font-bold mt-1">{rel.type}</div>
                                                {rel.notes && <div className="text-dnd-text/40 italic mt-2 text-xs border-l-2 border-white/5 pl-3">"{rel.notes}"</div>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-dnd-text/20 italic text-sm">No known connections.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderWikiPageContent = (page: WikiPage) => {
        const type = pinTypes.find(t => t.id === page.type_id);
        const subPages = wikiPages.filter(p => p.parent_id === page.id);
        const linkedPins = pins.filter(p => p.wiki_page_id === page.id);

        return (
            <div className="max-w-5xl mx-auto pb-24 space-y-10">
                {/* Header Section */}
                <div className={cn(
                    "relative overflow-hidden rounded-[2.5rem] border border-white/5",
                    page.header_image_url ? "min-h-[400px] flex flex-col justify-end" : "pb-8 border-b border-t-0 border-x-0 rounded-none"
                )}>
                    {page.header_image_url && (
                        <>
                            <div className="absolute inset-0 z-0">
                                <img 
                                    src={page.header_image_url} 
                                    className="w-full h-full object-cover" 
                                    alt="" 
                                    referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dnd-dark via-dnd-dark/60 to-transparent z-10" />
                                <div className="absolute inset-0 bg-black/40 z-5" />
                            </div>
                        </>
                    )}

                    <div className={cn(
                        "relative z-20",
                        page.header_image_url ? "p-10 md:p-16" : ""
                    )}>
                        <div className="flex flex-col mb-8">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-4 mb-2">
                                    <h1 className={cn(
                                        "text-4xl md:text-5xl font-serif font-bold tracking-tight",
                                        page.header_image_url ? "text-white drop-shadow-2xl" : "text-white"
                                    )}>
                                        {page.title}
                                    </h1>
                                    {isDM && !isPlayerView && onEditWikiPage && (
                                        <button 
                                            onClick={() => onEditWikiPage(page)}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-dnd-gold transition-all border border-white/5 shadow-lg backdrop-blur-md"
                                            title="Edit Wiki Page"
                                        >
                                            <Icon name="pencil" className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="bg-dnd-gold/20 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] text-dnd-gold border border-dnd-gold/20 uppercase tracking-[0.2em] font-bold">
                                        {type?.name || 'Page'}
                                    </span>
                                    
                                    {linkedPins.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {linkedPins.map(pin => {
                                                const pMap = maps.find(m => m.id === pin.map_id);
                                                const pType = pinTypes.find(t => t.id === pin.pin_type_id);
                                                return (
                                                    <button 
                                                        key={pin.id} 
                                                        onClick={() => onLocatePin(pin)}
                                                        className="flex items-center gap-2 bg-black/40 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-dnd-gold/40 transition-all group backdrop-blur-md"
                                                        title={`View on ${pMap?.name || 'Map'}`}
                                                    >
                                                        <span className="text-xs shrink-0">{pType?.emoji || '📍'}</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-dnd-gold transition-colors truncate max-w-[120px]">{pin.title}</span>
                                                        <Icon name="map" className="w-2.5 h-2.5 text-dnd-text/20 group-hover:text-dnd-gold transition-colors" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {page.content && stripHtml(page.content).trim().length > 0 && (
                            <div 
                                className={cn(
                                    "rich-text-content max-w-none text-lg md:text-xl leading-relaxed font-medium transition-all",
                                    page.header_image_url 
                                        ? "text-white/90 drop-shadow-lg" 
                                        : "text-dnd-text/80 glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl"
                                )}
                                dangerouslySetInnerHTML={{ __html: page.content }}
                            />
                        )}
                    </div>
                </div>

                {/* Sub-pages - Compact Version */}
                {subPages.length > 0 && (
                    <div className="mb-10">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 mb-3 flex items-center gap-2 px-1">
                            <Icon name="book" className="w-3.5 h-3.5"/> Nested Pages
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {subPages.map(sp => (
                                <button 
                                    key={sp.id} 
                                    onClick={() => onSelectWikiPage(sp)}
                                    className="flex items-center gap-2.5 bg-black/40 px-3 py-2 rounded-xl border border-white/5 hover:bg-white/5 hover:border-dnd-gold/30 transition-all group shadow-sm"
                                >
                                    <span className="text-lg shrink-0">{pinTypes.find(t => t.id === sp.type_id)?.emoji || '📄'}</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-xs text-white/80 group-hover:text-dnd-gold transition-colors">{sp.title}</span>
                                        <span className="text-[8px] text-dnd-text/30 uppercase tracking-widest font-black leading-none">{pinTypes.find(t => t.id === sp.type_id)?.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}


                {/* Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {page.sections?.map((section, idx) => {
                        const isVisible = section.is_visible ?? (section.type !== 'secret' && section.type !== 'encounter');
                        if (!isVisible && !canSeeSecrets) return null;
                        const isFullWidth = section.type === 'image' || section.type === 'text' || section.type === 'list' || section.type === 'inventory' || section.type === 'split' || section.type === 'gallery' || section.type === 'timeline' || section.type === 'quote' || section.type === 'attribute_list' || section.type === 'map' || section.type === 'quests';
                        
                        return (
                            <div key={idx} className={cn(
                                "bg-black/15 rounded-2xl border border-white/5 overflow-hidden",
                                isFullWidth ? 'md:col-span-2' : '',
                                section.type === 'secret' ? 'border-dnd-red/20 bg-dnd-red/5' : ''
                            )}>
                                <div className={cn(
                                    "px-6 py-3 border-b border-white/5 flex items-center justify-between",
                                    section.type === 'secret' ? 'bg-dnd-red/10' : 'bg-black/30',
                                    (section.type === 'map' || section.type === 'quests') ? 'hidden' : ''
                                )}>
                                    <h3 className={cn(
                                        "font-sans text-[10px] font-black uppercase tracking-[0.2em]",
                                        section.type === 'secret' ? 'text-dnd-red' : 'text-dnd-gold/60'
                                    )}>
                                        {section.title}
                                    </h3>
                                </div>
                                <div className="p-6">
                                    {section.type === 'text' && (
                                        <div 
                                            className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none"
                                            dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                        />
                                    )}
                                    {section.type === 'secret' && (
                                        <div 
                                            className="text-dnd-red/80 leading-relaxed font-mono text-sm rich-text-content max-w-none"
                                            dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                        />
                                    )}
                                    {section.type === 'encounter' && (
                                        <div className="space-y-4">
                                            {section.content && (
                                                <div 
                                                    className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: section.content }}
                                                />
                                            )}
                                            {section.json_data && (
                                                <button 
                                                    onClick={() => {
                                                        const blob = new Blob([section.json_data!], { type: 'application/json' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `${section.title.replace(/\s+/g, '_').toLowerCase() || 'encounter'}.json`;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        document.body.removeChild(a);
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    className="flex items-center gap-2 bg-dnd-gold/10 hover:bg-dnd-gold/20 text-dnd-gold px-4 py-2 rounded-xl border border-dnd-gold/20 transition-all text-xs font-bold uppercase tracking-widest"
                                                >
                                                    <Icon name="download" className="w-4 h-4" />
                                                    Download Encounter
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {section.type === 'list' && (
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {section.list_items?.map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-dnd-text/80 bg-black/20 p-4 rounded-xl border border-white/5">
                                                    <span className="text-dnd-gold mt-1">✦</span>
                                                    <span className="leading-relaxed">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {section.type === 'image' && section.image_url && (
                                        <div 
                                            className="cursor-zoom-in group relative"
                                            onClick={() => setLightboxImage(section.image_url!)}
                                        >
                                            <img src={section.image_url} alt={section.title} className="w-full h-auto rounded-xl shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                <Icon name="search" className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    )}
                                    {section.type === 'split' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                            <div 
                                                className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none"
                                                dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                            />
                                            {section.image_url && (
                                                <img src={section.image_url} alt={section.title} className="w-full h-auto rounded-xl shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
                                            )}
                                        </div>
                                    )}
                                    {section.type === 'map' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center w-full">
                                            <div className="md:col-span-2 space-y-6">
                                                {section.title && (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] text-dnd-gold font-bold uppercase tracking-[0.2em]">Map Reference</div>
                                                        <h3 className="text-2xl font-serif font-bold text-white tracking-tight">{section.title}</h3>
                                                    </div>
                                                )}
                                                <div 
                                                    className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                                />
                                            </div>
                                            <div className="md:col-span-1">
                                                {section.linked_map_id && (
                                                    (() => {
                                                        const linkedMap = maps.find(m => m.id === section.linked_map_id);
                                                        if (!linkedMap) return <div className="p-8 bg-black/20 rounded-xl border border-white/5 text-dnd-text/20 italic">Map not found</div>;
                                                        return (
                                                            <div 
                                                                onClick={() => onSelectMap(linkedMap)}
                                                                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all hover:scale-[1.02] hover:shadow-dnd-gold/20"
                                                            >
                                                                <img 
                                                                    src={linkedMap.image_url} 
                                                                    alt={linkedMap.name} 
                                                                    className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110" 
                                                                    referrerPolicy="no-referrer"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                                                                    <div className="text-xs text-dnd-gold font-bold uppercase tracking-[0.2em] mb-1">Linked Map</div>
                                                                    <div className="text-xl font-serif font-bold text-white tracking-tight">{linkedMap.name}</div>
                                                                    <div className="flex items-center gap-2 mt-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                                                                        <Icon name="search" className="w-3 h-3 text-dnd-gold" />
                                                                        Click to open map
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {section.type === 'gallery' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {section.gallery_images?.map((img, i) => (
                                                <div 
                                                    key={i} 
                                                    className="aspect-square rounded-xl overflow-hidden border border-white/5 group relative shadow-lg cursor-zoom-in"
                                                    onClick={() => setLightboxImage(img)}
                                                >
                                                    <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                        <Icon name="search" className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {section.type === 'timeline' && (
                                        <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                                            {section.timeline_items?.map((item, i) => (
                                                <div key={i} className="relative pl-10">
                                                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-dnd-dark border-2 border-dnd-gold flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.3)] z-10">
                                                        <div className="w-2 h-2 rounded-full bg-dnd-gold shadow-[0_0_5px_rgba(212,175,55,1)]" />
                                                    </div>
                                                    <div>
                                                        <span className="text-dnd-gold font-bold text-xs uppercase tracking-widest bg-dnd-gold/10 px-2 py-1 rounded border border-dnd-gold/20 leading-none inline-block mb-3">{item.date}</span>
                                                        <div 
                                                            className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none text-sm"
                                                            dangerouslySetInnerHTML={{ __html: item.content }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {section.type === 'quote' && (
                                        <div className="relative p-10 bg-black/20 rounded-2xl border-l-4 border-dnd-gold italic">
                                            <Icon name="quote" className="absolute top-4 left-4 w-12 h-12 text-dnd-gold/10 pointer-events-none" />
                                            <div 
                                                className="text-xl text-dnd-text/80 leading-relaxed relative z-10 rich-text-content max-w-none"
                                                dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                            />
                                            {section.quote_author && (
                                                <div className="mt-6 flex items-center gap-3">
                                                    <div className="w-8 h-[1px] bg-dnd-gold/30" />
                                                    <span className="text-dnd-gold font-bold uppercase tracking-widest text-xs">{section.quote_author}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {section.type === 'quests' && (
                                        <div className="space-y-6">
                                            {section.title && (
                                                <div className="space-y-1">
                                                    <div className="text-[10px] text-dnd-gold font-bold uppercase tracking-[0.2em]">Objective Log</div>
                                                    <h3 className="text-2xl font-serif font-bold text-white tracking-tight">{section.title}</h3>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {section.quests?.map((quest) => (
                                                    <button 
                                                        key={quest.id} 
                                                        onClick={() => setSelectedQuest(quest)}
                                                        className="flex flex-col gap-3 bg-black/30 p-4 rounded-xl border border-white/5 hover:bg-white/5 hover:border-dnd-gold/30 transition-all group text-left overflow-hidden h-full"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-3xl bg-white/5 w-12 h-12 flex items-center justify-center rounded-lg border border-white/5 shrink-0 group-hover:scale-110 transition-transform">{quest.icon || '📜'}</span>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-white group-hover:text-dnd-gold transition-colors truncate">{quest.title}</div>
                                                                <div className="text-[10px] text-dnd-text/40 uppercase tracking-widest font-bold">Quest Item</div>
                                                            </div>
                                                        </div>
                                                        {quest.image_url && (
                                                            <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-black/20">
                                                                <img src={quest.image_url} alt={quest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-dnd-text/40 line-clamp-2 leading-relaxed">
                                                            {stripHtml(quest.description)}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {section.type === 'attribute_list' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                            {section.stats?.map((stat, i) => (
                                                <div key={i} className="flex flex-col gap-1 border-l border-white/5 pl-4 py-1 hover:border-dnd-gold/50 transition-colors group">
                                                    <span className="text-[10px] uppercase tracking-widest text-dnd-text/40 font-bold group-hover:text-dnd-gold/60 transition-colors">{stat.label}</span>
                                                    <span className="text-white font-serif text-lg font-bold group-hover:text-dnd-gold transition-colors">{stat.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {section.type === 'statblock' && (
                                        <div className="space-y-6">
                                            <div 
                                                className="text-dnd-text/60 leading-relaxed rich-text-content max-w-none"
                                                dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                            />
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                                                {section.stats?.map((stat, i) => (
                                                    <div key={i} className="flex flex-col items-center justify-center p-3 bg-black/30 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
                                                        <div className="absolute inset-0 bg-dnd-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <span className="text-[10px] uppercase tracking-tighter text-dnd-gold font-bold relative z-10">{stat.label}</span>
                                                        <span className="text-white font-serif text-2xl font-bold relative z-10">{stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- Main Layout ---
    return (
        <div className="flex flex-col h-full w-full bg-dnd-dark text-dnd-text overflow-hidden">
            {/* Category Tabs (Persistent Navigation) */}
            <div className="flex items-center justify-center gap-3 py-6 border-b border-white/5 bg-dnd-dark/40 backdrop-blur-xl sticky top-0 z-50">
                <button 
                    onClick={() => {
                        onHome?.();
                        setExpandedWikiSection('wiki');
                    }}
                    className={cn(
                        "px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                        expandedWikiSection === 'wiki' 
                            ? 'bg-dnd-gold text-dnd-dark border-dnd-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                            : 'bg-white/5 text-dnd-text/40 border-transparent hover:bg-white/10 hover:text-dnd-text/60'
                    )}
                >
                    Wiki
                </button>

                <button 
                    onClick={() => {
                        onHome?.();
                        setExpandedWikiSection('characters');
                    }}
                    className={cn(
                        "px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                        expandedWikiSection === 'characters' 
                            ? 'bg-dnd-gold text-dnd-dark border-dnd-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                            : 'bg-white/5 text-dnd-text/40 border-transparent hover:bg-white/10 hover:text-dnd-text/60'
                    )}
                >
                    Characters
                </button>

                <button 
                    onClick={() => {
                        onHome?.();
                        setExpandedWikiSection('locations');
                    }}
                    className={cn(
                        "px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                        expandedWikiSection === 'locations' 
                            ? 'bg-dnd-gold text-dnd-dark border-dnd-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                            : 'bg-white/5 text-dnd-text/40 border-transparent hover:bg-white/10 hover:text-dnd-text/60'
                    )}
                >
                    Locations
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Background Pattern/Gradient */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-dnd-gold/2 to-transparent pointer-events-none" />

                <div className="p-6 md:p-10 min-h-full relative z-10">
                    {selectedPin ? (
                        <React.Fragment key={`pin-${selectedPin.id}`}>
                            {renderPinContent(selectedPin)}
                        </React.Fragment>
                    ) : selectedCharacter ? (
                        <React.Fragment key={`char-${selectedCharacter.id}`}>
                            {renderCharacterContent(selectedCharacter)}
                        </React.Fragment>
                    ) : selectedWikiPage ? (
                        <React.Fragment key={`page-${selectedWikiPage.id}`}>
                            {renderWikiPageContent(selectedWikiPage)}
                        </React.Fragment>
                    ) : selectedMap ? (
                        <div 
                            key={`map-${selectedMap.id}`}
                            className="max-w-4xl mx-auto space-y-6"
                        >
                            <div className="flex items-center gap-6 border-b border-white/5 pb-6">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden ring-4 ring-white/5 shadow-2xl bg-dnd-dark">
                                    <img src={selectedMap.image_url} className="w-full h-full object-cover" alt={selectedMap.name} referrerPolicy="no-referrer" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-serif font-bold text-white tracking-tight">{selectedMap.name}</h1>
                                    <p className="text-dnd-gold mt-1 uppercase tracking-[0.3em] text-[9px] font-bold flex items-center gap-3">
                                        <span className="capitalize">{selectedMap.map_type?.replace('_', ' ') || 'Region'} Map</span>
                                        <span className="text-dnd-text/20">•</span>
                                        <span className="text-dnd-text/40">{activeMapPins.length} Locations</span>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onSelectMap(selectedMap)}
                                    className="ml-auto flex items-center gap-2 bg-dnd-gold text-white px-4 py-2 rounded-xl shadow-2xl shadow-dnd-gold/20 transition-all font-bold uppercase tracking-widest text-[9px] hover:brightness-110"
                                >
                                    <Icon name="map" className="w-3.5 h-3.5"/>
                                    Enter Realm
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeMapPins.map(pin => {
                                    const type = pinTypes.find(t => t.id === pin.pin_type_id);
                                    const charsAtPin = characters.filter(c => c.current_pin_id === pin.id && ((isDM && !isPlayerView) || c.is_visible));

                                    return (
                                        <button 
                                            key={pin.id}
                                            onClick={() => onLocatePin(pin)}
                                            className="bg-black/15 hover:bg-black/30 border border-white/5 hover:border-dnd-gold/30 p-4 rounded-xl text-left transition-all group flex flex-col gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-2xl ring-2 ring-white/5 group-hover:ring-dnd-gold transition-all" style={{ backgroundColor: type?.color }}>
                                                    {type?.emoji}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-white line-clamp-2 group-hover:text-dnd-gold transition-colors text-base leading-tight">{pin.title}</h3>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-dnd-text/40 mt-1">{type?.name}</p>
                                                </div>
                                            </div>
                                            
                                            {charsAtPin.length > 0 && (
                                                <div className="mt-1 pt-3 border-t border-white/5 flex items-center gap-2">
                                                    <div className="flex -space-x-2.5">
                                                        {charsAtPin.slice(0, 5).map(c => (
                                                            <div key={c.id} className="w-7 h-7 rounded-full ring-2 ring-dnd-panel bg-dnd-dark overflow-hidden relative z-0 hover:z-10 transition-all shadow-lg" title={c.name}>
                                                                {c.image_url ? (
                                                                    <img src={c.image_url} className="w-full h-full object-cover" alt={c.name} referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-dnd-text/40"><Icon name="user" className="w-3 h-3"/></div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {charsAtPin.length > 5 && (
                                                            <div className="w-7 h-7 rounded-full ring-2 ring-dnd-panel bg-white/5 flex items-center justify-center text-[9px] text-dnd-gold font-bold z-0 shadow-lg">
                                                                +{charsAtPin.length - 5}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-dnd-text/40 font-bold uppercase tracking-widest">
                                                        {charsAtPin.length} Present
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {activeMapPins.length === 0 && <p className="col-span-full text-dnd-text/20 italic text-center py-16 font-medium">No locations have been recorded in this map.</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {expandedWikiSection === 'wiki' && (
                                        <>
                                            {wikiPages.filter(p => !p.parent_id).map(page => {
                                                const type = pinTypes.find(t => t.id === page.type_id);
                                                return (
                                                    <button 
                                                        key={page.id}
                                                        onClick={() => onSelectWikiPage(page)}
                                                        className="bg-black/15 hover:bg-black/30 border border-white/5 hover:border-dnd-gold/30 p-6 rounded-2xl text-left transition-all group flex flex-col gap-4 backdrop-blur-sm"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-2xl ring-2 ring-white/5 group-hover:ring-dnd-gold transition-all" style={{ backgroundColor: type?.color || '#555' }}>
                                                                {type?.emoji || '📄'}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="font-bold text-white line-clamp-2 group-hover:text-dnd-gold transition-colors text-lg leading-tight">{page.title}</h3>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 mt-1">{type?.name || 'Page'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-dnd-gold/60">
                                                            <span>{wikiPages.filter(p => p.parent_id === page.id).length} Sub-pages</span>
                                                            <Icon name="chevron-right" className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            {wikiPages.filter(p => !p.parent_id).length === 0 && (
                                                <div className="col-span-full py-10 text-center text-dnd-text/20 italic font-medium">No wiki pages found.</div>
                                            )}
                                        </>
                                    )}

                                    {expandedWikiSection === 'characters' && (
                                        <>
                                            {characters.map(char => (
                                                <button 
                                                    key={char.id}
                                                    onClick={() => {
                                                        const p = pins.find(pin => pin.id === char.current_pin_id);
                                                        onSelectCharacter(char);
                                                    }}
                                                    className="bg-black/15 hover:bg-black/30 border border-white/5 hover:border-dnd-gold/30 p-4 rounded-2xl text-left transition-all group flex items-center gap-4 backdrop-blur-sm"
                                                >
                                                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-dnd-gold/30 transition-all flex-shrink-0">
                                                        {char.image_url ? (
                                                            <img src={char.image_url} className="w-full h-full object-cover" alt={char.name} referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-white/5 text-dnd-text/20"><Icon name="user" className="w-6 h-6"/></div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-white group-hover:text-dnd-gold transition-colors truncate">{char.name}</h3>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 mt-1">{char.role_details?.race} {char.role_details?.class}</p>
                                                    </div>
                                                </button>
                                            ))}
                                            {characters.length === 0 && (
                                                <div className="col-span-full py-10 text-center text-dnd-text/20 italic font-medium">No characters found.</div>
                                            )}
                                        </>
                                    )}

                                    {expandedWikiSection === 'locations' && (
                                        <>
                                            {maps.filter(m => !m.parent_map_id).map(map => (
                                                <button 
                                                    key={map.id}
                                                    onClick={() => onSelectMap(map)}
                                                    className="bg-black/15 hover:bg-black/30 border border-white/5 hover:border-dnd-gold/30 p-6 rounded-2xl text-left transition-all group flex flex-col gap-4 backdrop-blur-sm"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white/5 group-hover:ring-dnd-gold transition-all">
                                                            <img src={map.image_url} className="w-full h-full object-cover" alt={map.name} referrerPolicy="no-referrer" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-white group-hover:text-dnd-gold transition-colors text-lg leading-tight">{map.name}</h3>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 mt-1">{map.map_type || 'Region'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-dnd-gold/60">
                                                        <span>{pins.filter(p => p.map_id === map.id).length} Locations</span>
                                                        <Icon name="chevron-right" className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </button>
                                            ))}
                                            {maps.filter(m => !m.parent_map_id).length === 0 && (
                                                <div className="col-span-full py-10 text-center text-dnd-text/20 italic font-medium">No maps found.</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lightbox */}
                {lightboxImage && (
                    <div 
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
                        onClick={closeLightbox}
                    >
                        <div className="absolute top-6 right-6 flex items-center gap-4 z-[110]">
                            <div className="flex bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-1 shadow-2xl" onClick={e => e.stopPropagation()}>
                                <button 
                                    onClick={handleZoomOut}
                                    className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                                    title="Zoom Out"
                                >
                                    <Icon name="minus" className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={resetZoom}
                                    className="px-3 text-[10px] font-bold uppercase tracking-widest text-dnd-gold hover:text-white transition-colors"
                                >
                                    {Math.round(zoomLevel * 100)}%
                                </button>
                                <button 
                                    onClick={handleZoomIn}
                                    className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                                    title="Zoom In"
                                >
                                    <Icon name="plus" className="w-5 h-5" />
                                </button>
                            </div>
                            <button 
                                onClick={closeLightbox}
                                className="bg-black/40 backdrop-blur-md text-white/60 hover:text-white p-2.5 rounded-xl border border-white/10 transition-all hover:scale-110"
                            >
                                <Icon name="close" className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div 
                            className="max-w-[90vw] max-h-[90vh] overflow-auto custom-scrollbar flex items-center justify-center p-10"
                            onClick={e => e.stopPropagation()}
                        >
                            <img 
                                src={lightboxImage} 
                                alt="Full View" 
                                className="transition-transform duration-300 ease-out origin-center cursor-default select-none shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                                style={{ 
                                    transform: `scale(${zoomLevel})`,
                                    transition: zoomLevel === 1 ? 'transform 0.3s ease-out' : 'none'
                                 }}
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    </div>
                )}

            {/* Quest Detail Modal */}
            <Modal
                isOpen={!!selectedQuest}
                onClose={() => setSelectedQuest(null)}
                title=""
                maxWidthClass="max-w-2xl"
            >
                {selectedQuest && (
                    <div className="space-y-6 pb-4">
                        <div className="flex items-center gap-5">
                            <span className="text-4xl bg-white/5 w-16 h-16 flex items-center justify-center rounded-2xl border border-white/5 shadow-inner">{selectedQuest.icon || '📜'}</span>
                            <div>
                                <div className="text-[10px] text-dnd-gold font-bold uppercase tracking-[0.2em] mb-0.5">Quest Details</div>
                                <h2 className="text-2xl font-serif font-bold text-white tracking-tight">{selectedQuest.title}</h2>
                            </div>
                        </div>
                        
                        {selectedQuest.image_url && (
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video bg-black/40">
                                <img src={selectedQuest.image_url} alt={selectedQuest.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="text-[10px] text-dnd-text/40 font-bold uppercase tracking-widest">Description</div>
                            <div 
                                className="bg-white/5 p-6 rounded-2xl border border-white/5 text-dnd-text/80 leading-relaxed rich-text-content"
                                dangerouslySetInnerHTML={{ __html: selectedQuest.description }}
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={() => setSelectedQuest(null)}
                                className="px-6 py-3 bg-dnd-gold text-dnd-dark font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Wiki;
