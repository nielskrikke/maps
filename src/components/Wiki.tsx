
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../App';
import { Map as MapType, Pin, Character, Comment } from '../types';
import { Icon } from './Icons';
import { supabase } from '../services/supabase';
import { cn } from '../lib/utils';

interface WikiProps {
    selectedMap: MapType | null;
    selectedPin: Pin | null;
    selectedCharacter: Character | null;
    onSelectMap: (map: MapType) => void;
    onLocatePin: (pin: Pin) => void;
}

const Wiki: React.FC<WikiProps> = ({ selectedMap, selectedPin, selectedCharacter, onSelectMap, onLocatePin }) => {
    const { maps, pins, pinTypes, characters, isPlayerView } = useAppContext();
    const { user } = useAuth();
    const isDM = user?.profile.role === 'DM';
    const canSeeSecrets = isDM && !isPlayerView;

    // Comments State for Characters
    const [characterComments, setCharacterComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPrivateComment, setIsPrivateComment] = useState(false);

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
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10 max-w-5xl mx-auto pb-24"
            >
                {/* Header */}
                <div className="border-b border-white/5 pb-8">
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex items-center justify-center w-20 h-20 rounded-2xl shadow-2xl text-4xl ring-2 ring-white/10" style={{ backgroundColor: type?.color || '#555' }}>
                            {type?.emoji || '📍'}
                        </div>
                        <div>
                            <h1 className="text-5xl font-serif font-bold text-white tracking-tight">{pin.title}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="bg-white/5 px-3 py-1 rounded-lg text-[10px] text-dnd-gold border border-white/5 uppercase tracking-[0.2em] font-bold">{type?.name || 'Unknown'}</span>
                                {pinMap && <span className="text-dnd-text/40 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Icon name="map" className="w-3 h-3"/> {pinMap.name}</span>}
                            </div>
                        </div>
                        <button 
                            onClick={() => onLocatePin(pin)}
                            className="ml-auto flex items-center gap-2 bg-dnd-gold text-white px-6 py-3 rounded-2xl transition-all text-xs font-bold uppercase tracking-widest shadow-xl shadow-dnd-gold/20 hover:brightness-110 group"
                        >
                            <Icon name="compass" className="w-4 h-4 group-hover:rotate-45 transition-transform"/>
                            Locate
                        </button>
                    </div>

                    {pin.data.description && (
                         <div className="prose prose-invert max-w-none text-dnd-text/80 text-xl leading-relaxed glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl font-medium">
                            {pin.data.description}
                         </div>
                    )}
                </div>

                <CharacterPresenceList chars={charactersAtPin} title="Inhabitants" />

                {/* Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {pin.data.sections?.map((section, idx) => {
                        if (section.type === 'secret' && !canSeeSecrets) return null;
                        
                        const isFullWidth = section.type === 'text' || section.type === 'list' || section.type === 'inventory';
                        
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
                                    {section.type === 'text' && <p className="whitespace-pre-wrap text-dnd-text/60 leading-relaxed">{section.content}</p>}
                                    {section.type === 'secret' && <p className="whitespace-pre-wrap text-dnd-red/80 leading-relaxed font-mono text-sm">{section.content}</p>}
                                    
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
                                        <img src={section.image_url} alt={section.title} className="w-full h-auto rounded-xl shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
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
            </motion.div>
        );
    };

    const renderCharacterContent = (char: Character) => {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
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
                        <h1 className="text-3xl font-serif font-bold text-white mb-3 tracking-tight">{char.name}</h1>
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
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/5 shadow-xl">
                            <h3 className="font-serif text-2xl text-white font-bold mb-6 border-b border-white/5 pb-4">Biography</h3>
                            <p className="whitespace-pre-wrap text-dnd-text/60 leading-relaxed font-medium">{char.backstory || "No records of this soul exist."}</p>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/5 shadow-xl">
                            <h3 className="font-serif text-2xl text-white font-bold mb-6 border-b border-white/5 pb-4">Chronicles & Notes</h3>
                            <div className="space-y-4 mb-8">
                                {characterComments.length === 0 && <p className="text-dnd-text/20 italic text-sm py-4">The archives are empty.</p>}
                                {characterComments.map(comment => (
                                    <div key={comment.id} className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-dnd-gold text-sm">{comment.users.username}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">{new Date(comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-dnd-text/60 text-sm leading-relaxed">{comment.text}</p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleAddCharacterComment} className="space-y-4">
                                <textarea 
                                    value={newComment} 
                                    onChange={e => setNewComment(e.target.value)} 
                                    placeholder="Add to the chronicles..." 
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-dnd-gold/50 transition-all placeholder-dnd-text/20"
                                    rows={3}
                                />
                                <div className="flex justify-end">
                                    <button type="submit" className="bg-dnd-gold hover:brightness-110 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-dnd-gold/20 transition-all">Post Note</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {canSeeSecrets && char.gm_notes && (
                            <div className="bg-dnd-red/5 p-6 rounded-2xl border border-dnd-red/20 shadow-xl">
                                <h3 className="font-serif text-lg text-dnd-red font-bold mb-3 flex items-center gap-2"><Icon name="lock" className="w-4 h-4"/> GM Secrets</h3>
                                <p className="text-sm text-dnd-red/80 whitespace-pre-wrap leading-relaxed font-mono">{char.gm_notes}</p>
                            </div>
                        )}

                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 shadow-xl">
                            <h3 className="font-serif text-lg text-white font-bold mb-5 border-b border-white/5 pb-3">Connections</h3>
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
            </motion.div>
        );
    };

    // --- Main Layout ---
    return (
        <div className="flex h-full w-full bg-dnd-dark text-dnd-text overflow-hidden">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Background Pattern/Gradient */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-dnd-gold/5 to-transparent pointer-events-none" />

                <div className="p-6 md:p-10 min-h-full relative z-10">
                    <AnimatePresence mode="wait">
                        {selectedPin ? (
                            <React.Fragment key={`pin-${selectedPin.id}`}>
                                {renderPinContent(selectedPin)}
                            </React.Fragment>
                        ) : selectedCharacter ? (
                            <React.Fragment key={`char-${selectedCharacter.id}`}>
                                {renderCharacterContent(selectedCharacter)}
                            </React.Fragment>
                        ) : selectedMap ? (
                            <motion.div 
                                key={`map-${selectedMap.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-4xl mx-auto space-y-6"
                            >
                                <div className="flex items-center gap-6 border-b border-white/5 pb-6">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-white/5 shadow-2xl bg-dnd-dark">
                                        <img src={selectedMap.image_url} className="w-full h-full object-cover" alt={selectedMap.name} referrerPolicy="no-referrer" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-serif font-bold text-white tracking-tight">{selectedMap.name}</h1>
                                        <p className="text-dnd-gold mt-1 uppercase tracking-[0.3em] text-[9px] font-bold flex items-center gap-3">
                                            <span className="capitalize">{selectedMap.map_type?.replace('_', ' ') || 'Region'} Map</span>
                                            <span className="text-dnd-text/20">•</span>
                                            <span className="text-dnd-text/40">{activeMapPins.length} Locations</span>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => onSelectMap(selectedMap)}
                                        className="ml-auto flex items-center gap-2.5 bg-dnd-gold text-white px-5 py-2.5 rounded-xl shadow-2xl shadow-dnd-gold/20 transition-all font-bold uppercase tracking-widest text-[10px] hover:brightness-110"
                                    >
                                        <Icon name="map" className="w-4 h-4"/>
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
                                                className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-dnd-gold/30 p-4 rounded-xl text-left transition-all group flex flex-col gap-3 shadow-xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-2xl ring-2 ring-white/5 group-hover:ring-dnd-gold transition-all" style={{ backgroundColor: type?.color }}>
                                                        {type?.emoji}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-white truncate group-hover:text-dnd-gold transition-colors text-base">{pin.title}</h3>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-dnd-text/40 mt-0.5">{type?.name}</p>
                                                    </div>
                                                </div>
                                                {pin.data.description && (
                                                    <p className="text-xs text-dnd-text/40 line-clamp-2 leading-relaxed font-medium">{pin.data.description}</p>
                                                )}
                                                
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
                                    {activeMapPins.length === 0 && <p className="col-span-full text-dnd-text/20 italic text-center py-16 font-medium">No locations have been chronicled in this map.</p>}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                className="h-full flex flex-col items-center justify-center text-dnd-text/40 space-y-8"
                            >
                                <Icon name="book" className="w-32 h-32 text-dnd-gold/20"/>
                                <div className="text-center">
                                    <h2 className="text-4xl font-serif text-white/40 font-bold tracking-tight">The Eternal Archives</h2>
                                    <p className="mt-4 text-lg font-medium">Select a location or character from the sidebar to begin reading.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Wiki;
