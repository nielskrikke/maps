
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pin, Comment, PinSection, Character } from '../types';
import { useAuth } from '../App';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Icon } from './Icons';
import { cn } from '../lib/utils';

interface PinDetailsProps {
    pin: Pin | null;
    onClose: () => void;
    onEdit: (pin: Pin) => void;
    mapId: string | undefined;
    onOpenWiki?: (characterId: string) => void;
}

const PinDetails: React.FC<PinDetailsProps> = ({ pin, onClose, onEdit, mapId, onOpenWiki }) => {
    const { user } = useAuth();
    const { isPlayerView, maps, characters, updateLocalCharacter, setError } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPrivateComment, setIsPrivateComment] = useState(false);
    
    // For expanding inventory items to show description
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    // Character summoning state
    const [isSummoning, setIsSummoning] = useState(false);
    const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

    // Derived: Characters present at this pin
    const presentCharacters = pin ? characters.filter(c => c.current_pin_id === pin.id) : [];

    useEffect(() => {
        const fetchComments = async () => {
            if (pin) {
                const { data, error } = await supabase
                    .from('comments')
                    .select('*, users(username)')
                    .eq('pin_id', pin.id)
                    .order('created_at', { ascending: true });
                if (data) setComments(data as any);
                if (error) {
                    console.error("Error fetching comments", error);
                    setError({ message: "Error fetching comments", details: error });
                }
            } else {
                setComments([]);
            }
        };
        fetchComments();
    }, [pin]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !pin || !user) return;

        const { data, error } = await supabase
            .from('comments')
            .insert({
                pin_id: pin.id,
                user_id: user.id,
                text: newComment,
                is_private: isPrivateComment
            })
            .select('*, users(username)')
            .single();

        if (data) setComments([...comments, data as any]);
        if (error) {
            console.error("Error adding comment", error);
            setError({ message: "Error adding comment", details: error });
        }

        setNewComment('');
        setIsPrivateComment(false);
    };

    const handleMoveCharacter = async (charId: string, targetPinId: string | null) => {
        const char = characters.find(c => c.id === charId);
        if (char) {
            updateLocalCharacter({ ...char, current_pin_id: targetPinId });
            const { error } = await supabase.from('characters').update({ current_pin_id: targetPinId }).eq('id', charId);
            if(error) {
                console.error("Failed to move character", error);
                setError({ message: "Failed to move character", details: error });
            }
        }
        setIsSummoning(false);
    };

    const handleDownloadEncounter = () => {
        if (!pin?.data.encounter_file) return;
        const blob = new Blob([pin.data.encounter_file.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pin.data.encounter_file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadCharJson = (char: Character) => {
        if (!char.character_json) return;
        const blob = new Blob([JSON.stringify(char.character_json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${char.name.replace(/\s+/g, '_').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getCharacterName = (id: string) => characters.find(c => c.id === id)?.name || "Unknown";

    const renderSection = (section: PinSection, index: number) => {
        switch (section.type) {
            case 'inventory':
                 return (
                    <div key={section.id || index} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                        <h3 className="bg-white/5 font-serif text-lg text-dnd-gold px-4 py-3 border-b border-white/5 flex items-center justify-between font-bold">
                            {section.title || "Inventory"}
                            <Icon name="chest" className="w-5 h-5 opacity-50" />
                        </h3>
                        <div className="p-3 space-y-2">
                            {section.items && section.items.length > 0 ? section.items.map(item => (
                                <div key={item.id} className="rounded-xl bg-black/20 border border-white/5 overflow-hidden">
                                    <div 
                                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="bg-dnd-dark text-dnd-text/60 text-[10px] font-mono px-2 py-1 rounded border border-white/10">{item.count}x</span>
                                            <div>
                                                <p className={cn("font-bold text-sm", item.is_magic ? 'text-dnd-gold' : 'text-white')}>{item.name}</p>
                                                <div className="flex gap-2 text-[10px] text-dnd-text/40 leading-none mt-1 uppercase tracking-tighter">
                                                    {item.rarity && <span className="text-purple-400/80">{item.rarity}</span>}
                                                    {item.category && <span>{item.category}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <Icon name={expandedItem === item.id ? 'chevron-down' : 'chevron-right'} className="w-4 h-4 text-dnd-text/20" />
                                    </div>
                                    <AnimatePresence>
                                        {expandedItem === item.id && item.desc && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="px-4 pb-4 pt-0 text-xs text-dnd-text/60 border-t border-white/5 mt-1 overflow-hidden"
                                            >
                                                <div className="py-3 prose prose-invert prose-p:my-1 max-w-none">
                                                    {item.desc.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                                </div>
                                                {item.cost && <p className="text-dnd-gold font-mono mt-3 font-bold">Value: {item.cost}</p>}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )) : (
                                <p className="text-center text-sm text-dnd-text/20 py-6 italic">Empty.</p>
                            )}
                        </div>
                    </div>
                 );
            case 'image':
                return (
                    <div key={section.id || index} className="bg-white/5 rounded-2xl p-3 border border-white/5 overflow-hidden shadow-xl">
                        {section.title && <h3 className="font-serif text-lg text-white font-bold mb-3 px-1">{section.title}</h3>}
                        {section.image_url ? (
                            <img src={section.image_url} alt={section.title || 'Pin Image'} className="w-full h-auto rounded-xl shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-full h-40 flex items-center justify-center bg-black/20 rounded-xl text-dnd-text/20 italic">No image provided</div>
                        )}
                        {section.content && <p className="text-sm text-dnd-text/60 mt-3 px-1 pb-1 italic leading-relaxed">{section.content}</p>}
                    </div>
                );
            case 'statblock':
                return (
                    <div key={section.id || index} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                        <h3 className="bg-white/5 font-serif text-lg text-dnd-gold px-4 py-3 border-b border-white/5 flex items-center justify-between font-bold">
                            {section.title}
                            <Icon name="shield" className="w-4 h-4 opacity-50" />
                        </h3>
                        <div className="p-4">
                            {section.content && <p className="text-sm text-dnd-text/60 mb-4 italic leading-relaxed">{section.content}</p>}
                            <div className="grid grid-cols-2 gap-3">
                                {section.stats?.map((stat, i) => (
                                    <div key={i} className="flex flex-col bg-black/20 p-3 rounded-xl border border-white/5">
                                        <span className="text-[10px] uppercase tracking-widest text-dnd-gold font-bold">{stat.label}</span>
                                        <span className="text-white font-serif text-xl font-bold">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'list':
                return (
                    <div key={section.id || index} className="bg-white/5 rounded-2xl p-5 border border-white/5 shadow-xl">
                        <h3 className="font-serif text-lg text-white font-bold mb-4 pb-2 border-b border-white/5">{section.title}</h3>
                        {section.content && <p className="text-sm text-dnd-text/60 mb-4 leading-relaxed">{section.content}</p>}
                        <ul className="space-y-3">
                            {section.list_items?.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-dnd-text/80">
                                    <span className="text-dnd-gold mt-1">✦</span>
                                    <span className="leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            case 'secret':
                 if (isPlayerView && !isDM) return null;
                 return (
                    <div key={section.id || index} className="bg-dnd-red/5 rounded-2xl p-5 border border-dnd-red/20 relative overflow-hidden group shadow-xl">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Icon name="lock" className="w-16 h-16 text-dnd-red" />
                        </div>
                        <h3 className="font-serif text-lg text-dnd-red font-bold mb-3 flex items-center gap-2">
                            <Icon name="lock" className="w-4 h-4" />
                            {section.title}
                        </h3>
                        <p className="text-sm text-dnd-red/80 whitespace-pre-wrap leading-relaxed relative z-10">{section.content}</p>
                    </div>
                 );
            default: // 'text'
                return (
                    <div key={section.id || index} className="bg-white/5 rounded-2xl p-5 border border-white/5 shadow-xl">
                        <h3 className="font-serif text-lg text-white font-bold mb-3 border-b border-white/5 pb-2">{section.title}</h3>
                        <p className="text-sm text-dnd-text/60 whitespace-pre-wrap leading-relaxed">{section.content}</p>
                    </div>
                );
        }
    };

    if (!pin) return null;

    const isDM = user?.profile.role === 'DM';
    const linkedMap = maps.find(m => m.id === pin.linked_map_id);

    return (
        <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute top-0 right-0 h-full w-full max-w-sm bg-dnd-panel/95 backdrop-blur-md border-l border-white/5 p-5 shadow-2xl z-30 overflow-hidden"
        >
            {/* Background Accent */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-dnd-gold/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex h-full flex-col relative z-10">
                <div className="flex items-start justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <span style={{ backgroundColor: pin.pin_types?.color || '#718096' }} className="flex h-10 w-10 items-center justify-center rounded-full text-xl shadow-2xl ring-2 ring-white/10">
                            {pin.pin_types?.emoji || '❓'}
                        </span>
                        <div>
                            <h2 className="text-xl font-bold font-serif text-white tracking-tight">{pin.title}</h2>
                            <p className="text-[9px] text-dnd-gold uppercase tracking-[0.2em] font-bold mt-0.5">{pin.pin_types?.name || 'Unknown Type'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 text-dnd-text/40 hover:bg-white/5 hover:text-white transition-all">
                        <Icon name="close" className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                    {(presentCharacters.length > 0 || (isDM && !isPlayerView)) && (
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 shadow-xl">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[9px] font-bold uppercase tracking-widest text-dnd-text/40 flex items-center gap-2">
                                    <Icon name="user" className="w-2.5 h-2.5"/> Presence
                                </h3>
                                {isDM && !isPlayerView && !isSummoning && (
                                    <button onClick={() => setIsSummoning(true)} className="text-[9px] font-bold uppercase tracking-widest text-dnd-gold hover:text-white transition-colors">+ Summon</button>
                                )}
                            </div>
                            
                            <AnimatePresence>
                                {isSummoning && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-4 bg-black/20 rounded-xl border border-dnd-gold/20 p-3 overflow-hidden"
                                    >
                                        <input autoFocus type="text" placeholder="Search the archives..." className="w-full bg-transparent text-sm border-b border-white/5 pb-2 mb-3 focus:outline-none focus:border-dnd-gold/50 placeholder-dnd-text/20" />
                                        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                            {characters.filter(c => c.current_pin_id !== pin.id).map(c => (
                                                <button 
                                                    key={c.id} 
                                                    onClick={() => handleMoveCharacter(c.id, pin.id)}
                                                    className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-dnd-text/60 hover:text-white transition-all"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-dnd-dark border border-white/10 overflow-hidden shadow-sm">
                                                        {c.image_url && <img src={c.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                                                    </div>
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={() => setIsSummoning(false)} className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-dnd-text/20 mt-3 hover:text-dnd-text/60 transition-colors">Cancel</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-wrap gap-3">
                                {presentCharacters.map(char => (
                                    <div key={char.id} className="relative group">
                                        <button 
                                            onClick={() => setViewingCharacter(char)}
                                            className="w-12 h-12 rounded-full bg-dnd-dark border-2 border-white/10 hover:border-dnd-gold overflow-hidden transition-all relative z-10 shadow-xl"
                                            title={char.name}
                                        >
                                            {char.image_url ? (
                                                <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-xs font-bold text-dnd-text/40">{char.name.charAt(0)}</div>
                                            )}
                                        </button>
                                        {isDM && !isPlayerView && (
                                            <button 
                                                onClick={() => handleMoveCharacter(char.id, null)}
                                                className="absolute -top-1 -right-1 z-20 bg-dnd-red text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100"
                                                title="Remove from location"
                                            >
                                                <Icon name="close" className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {presentCharacters.length === 0 && !isSummoning && <span className="text-xs text-dnd-text/20 italic">The halls are silent.</span>}
                            </div>
                        </div>
                    )}

                    <AnimatePresence>
                        {viewingCharacter && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white/5 border border-dnd-gold/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
                            >
                                <button onClick={() => setViewingCharacter(null)} className="absolute top-4 right-4 text-dnd-text/40 hover:text-white transition-colors"><Icon name="close" className="w-5 h-5"/></button>
                                <div className="flex gap-4 mb-4">
                                    <div className="w-20 h-20 rounded-xl bg-dnd-dark overflow-hidden border border-white/10 flex-shrink-0 shadow-2xl">
                                        {viewingCharacter.image_url && <img src={viewingCharacter.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-xl text-white font-bold">{viewingCharacter.name}</h3>
                                        <p className="text-[10px] text-dnd-gold uppercase tracking-widest font-bold mt-1">
                                            {viewingCharacter.role_details?.race} {!isPlayerView && viewingCharacter.role_details?.class}
                                        </p>
                                        
                                        {!isPlayerView && (
                                            <p className="text-[10px] text-dnd-text/40 font-bold mt-1">LEVEL {viewingCharacter.role_details?.level} • {viewingCharacter.role_details?.alignment}</p>
                                        )}
                                        
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {!isPlayerView && viewingCharacter.sheet_url && (
                                                <a href={viewingCharacter.sheet_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all">
                                                    <Icon name="external" className="w-3 h-3" /> Sheet
                                                </a>
                                            )}
                                            {onOpenWiki && (
                                                <button onClick={() => onOpenWiki(viewingCharacter.id)} className="px-2 py-1 rounded-lg bg-dnd-gold/10 text-dnd-gold hover:bg-dnd-gold hover:text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all border border-dnd-gold/20">
                                                    <Icon name="book" className="w-3 h-3" /> Wiki
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-dnd-text/60 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap mb-4 leading-relaxed">
                                    {viewingCharacter.backstory || "No records of this soul exist."}
                                </div>

                                {viewingCharacter.relationships && viewingCharacter.relationships.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <p className="text-[10px] text-dnd-text/40 font-bold mb-2 uppercase tracking-widest">Connections</p>
                                        <div className="space-y-2">
                                            {viewingCharacter.relationships.map((rel, i) => (
                                                <div key={i} className="text-xs flex items-start gap-2">
                                                    <span className="text-dnd-gold font-bold mt-0.5">•</span>
                                                    <span className="text-dnd-text/60">
                                                        <span className="font-bold text-white">{getCharacterName(rel.targetId)}</span>
                                                        <span className="text-dnd-text/40"> ({rel.type})</span>
                                                        {rel.notes && <span className="text-dnd-text/40 block pl-2 italic mt-1">"{rel.notes}"</span>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isDM && !isPlayerView && (
                        <button onClick={() => onEdit(pin)} className="w-full rounded-xl bg-dnd-gold text-white font-bold py-2.5 shadow-xl shadow-dnd-gold/20 hover:brightness-110 transition-all uppercase tracking-widest text-[10px]">Edit Pin Details</button>
                    )}
                </div>

                <div className="mt-5 flex-1 space-y-5 overflow-y-auto custom-scrollbar pr-2">
                    {isDM && !isPlayerView && pin.data.encounter_file && (
                        <button 
                            onClick={handleDownloadEncounter}
                            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-3 text-xs font-bold text-white transition-all shadow-xl"
                        >
                            <Icon name="download" className="w-4 h-4 text-dnd-gold" />
                            <span>Download Encounter</span>
                        </button>
                    )}

                    {pin.data.description && <p className="text-dnd-text/80 whitespace-pre-wrap leading-relaxed font-medium">{pin.data.description}</p>}
                    
                    {linkedMap && (
                        <div className="glass-panel p-5 rounded-2xl group cursor-pointer hover:bg-white/5 transition-all">
                             <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 mb-2">Linked Map</h3>
                            <div className="flex items-center gap-3 text-dnd-gold">
                                <Icon name="map" className="w-5 h-5"/>
                                <span className="font-serif text-xl font-bold">{linkedMap.name}</span>
                            </div>
                        </div>
                    )}

                    {pin.data.sections?.map((section, index) => renderSection(section, index))}
                    
                    <div className="space-y-6 pt-8 border-t border-white/5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Chronicles & Notes</h3>
                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="text-sm bg-white/5 p-4 rounded-2xl border border-white/5 shadow-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="font-bold text-dnd-gold">{comment.users.username}</p>
                                        <span className="text-dnd-text/20 text-xs">•</span>
                                        <p className="text-[10px] text-dnd-text/40 font-bold uppercase tracking-tighter">{new Date(comment.created_at).toLocaleDateString()}</p>
                                        {comment.is_private && <span className="ml-auto text-[10px] text-dnd-red font-bold uppercase tracking-widest bg-dnd-red/10 px-2 py-1 rounded-lg border border-dnd-red/20">Private</span>}
                                    </div>
                                    <p className="text-dnd-text/60 leading-relaxed">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAddComment} className="space-y-4 mt-6">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add to the archives..."
                                className="w-full rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-white focus:border-dnd-gold/50 focus:outline-none placeholder-dnd-text/20 transition-all"
                                rows={3}
                            ></textarea>
                            <div className="flex justify-between items-center">
                                 <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 cursor-pointer select-none group">
                                    <div className={cn("w-4 h-4 rounded border border-white/10 flex items-center justify-center transition-all", isPrivateComment ? "bg-dnd-gold border-dnd-gold" : "bg-black/20 group-hover:border-dnd-gold/50")}>
                                        {isPrivateComment && <Icon name="check" className="w-3 h-3 text-white" />}
                                    </div>
                                    <input type="checkbox" checked={isPrivateComment} onChange={(e) => setIsPrivateComment(e.target.checked)} className="hidden" />
                                    Private Note
                                </label>
                                <button type="submit" className="rounded-xl bg-dnd-gold px-6 py-2.5 text-xs font-bold text-white hover:brightness-110 shadow-xl shadow-dnd-gold/20 transition-all uppercase tracking-widest">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </motion.aside>
    );
};

export default PinDetails;
