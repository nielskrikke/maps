
import React, { useState, useEffect } from 'react';
import { Pin, Comment, PinSection, Character } from '../types';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { supabase } from '../services/supabase';
import { Icon } from './Icons';

interface PinDetailsProps {
    pin: Pin | null;
    onClose: () => void;
    onEdit: (pin: Pin) => void;
    mapId: string | undefined;
    onOpenWiki?: (characterId: string) => void;
}

const PinDetails: React.FC<PinDetailsProps> = ({ pin, onClose, onEdit, mapId, onOpenWiki }) => {
    const { user } = useAuth();
    const { isPlayerView, maps, characters, refreshData } = useAppContext();
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
                if (error) console.error("Error fetching comments", error);
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
        if (error) console.error("Error adding comment", error);

        setNewComment('');
        setIsPrivateComment(false);
    };

    const handleMoveCharacter = async (charId: string, targetPinId: string | null) => {
        const { error } = await supabase.from('characters').update({ current_pin_id: targetPinId }).eq('id', charId);
        if(!error) {
            await refreshData(true);
            setIsSummoning(false);
        }
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
        // Render based on type
        switch (section.type) {
            case 'inventory':
                 return (
                    <div key={section.id || index} className="bg-stone-800/40 rounded-xl overflow-hidden border border-amber-900/30 shadow-md">
                        <h3 className="bg-amber-900/20 font-medieval text-lg text-amber-500 px-4 py-2 border-b border-amber-900/30 flex items-center justify-between">
                            {section.title || "Inventory"}
                            <Icon name="chest" className="w-5 h-5 opacity-70" />
                        </h3>
                        <div className="p-2 space-y-1">
                            {section.items && section.items.length > 0 ? section.items.map(item => (
                                <div key={item.id} className="rounded-lg bg-stone-900/40 border border-stone-800/50 overflow-hidden">
                                    <div 
                                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-stone-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="bg-stone-800 text-stone-400 text-xs font-mono px-2 py-0.5 rounded border border-stone-700">{item.count}x</span>
                                            <div>
                                                <p className={`font-medium text-sm ${item.is_magic ? 'text-amber-400' : 'text-stone-300'}`}>{item.name}</p>
                                                <div className="flex gap-2 text-[10px] text-stone-500 leading-none mt-0.5">
                                                    {item.rarity && <span className="text-purple-400/80">{item.rarity}</span>}
                                                    {item.category && <span>{item.category}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <Icon name={expandedItem === item.id ? 'chevron-down' : 'chevron-right'} className="w-4 h-4 text-stone-600" />
                                    </div>
                                    {expandedItem === item.id && item.desc && (
                                        <div className="px-3 pb-3 pt-0 text-xs text-stone-400 border-t border-stone-800/50 mt-1">
                                            <div className="py-2 prose prose-invert prose-p:my-1 max-w-none">
                                                {item.desc.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                            </div>
                                            {item.cost && <p className="text-amber-600 font-mono mt-2">Value: {item.cost}</p>}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <p className="text-center text-sm text-stone-600 py-4 italic">Empty.</p>
                            )}
                        </div>
                    </div>
                 );
            case 'image':
                return (
                    <div key={section.id || index} className="bg-stone-800/30 rounded-xl p-2 border border-stone-700/30 overflow-hidden">
                        {section.title && <h3 className="font-medieval text-lg text-stone-200 mb-2 px-2">{section.title}</h3>}
                        {section.image_url ? (
                            <img src={section.image_url} alt={section.title || 'Pin Image'} className="w-full h-auto rounded-lg shadow-md border border-stone-900/50" />
                        ) : (
                            <div className="w-full h-40 flex items-center justify-center bg-stone-900/50 rounded-lg text-stone-600 italic">No image provided</div>
                        )}
                        {section.content && <p className="text-sm text-stone-400 mt-2 px-2 pb-2 italic">{section.content}</p>}
                    </div>
                );
            case 'statblock':
                return (
                    <div key={section.id || index} className="bg-stone-800/40 rounded-xl overflow-hidden border border-amber-900/30 shadow-md">
                        <h3 className="bg-amber-900/20 font-medieval text-lg text-amber-500 px-4 py-2 border-b border-amber-900/30 flex items-center justify-between">
                            {section.title}
                            <Icon name="shield" className="w-4 h-4 opacity-70" />
                        </h3>
                        <div className="p-4">
                            {section.content && <p className="text-sm text-stone-400 mb-3 italic">{section.content}</p>}
                            <div className="grid grid-cols-2 gap-2">
                                {section.stats?.map((stat, i) => (
                                    <div key={i} className="flex flex-col bg-stone-900/50 p-2 rounded border border-stone-800">
                                        <span className="text-xs uppercase tracking-wider text-amber-600/80 font-bold">{stat.label}</span>
                                        <span className="text-stone-200 font-medieval text-lg">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'list':
                return (
                    <div key={section.id || index} className="bg-stone-800/30 rounded-xl p-4 border border-stone-700/30">
                        <h3 className="font-medieval text-lg text-stone-200 mb-2 pb-1 border-b border-stone-700/50">{section.title}</h3>
                        {section.content && <p className="text-sm text-stone-400 mb-3">{section.content}</p>}
                        <ul className="space-y-2">
                            {section.list_items?.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-stone-300">
                                    <span className="text-amber-500 mt-1">✦</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            case 'secret':
                 if (isPlayerView && !isDM) return null; // Double safety, though usually parent hides it
                 return (
                    <div key={section.id || index} className="bg-red-950/20 rounded-xl p-4 border border-red-900/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Icon name="lock" className="w-12 h-12 text-red-800" />
                        </div>
                        <h3 className="font-medieval text-lg text-red-400 mb-2 flex items-center gap-2">
                            <Icon name="lock" className="w-4 h-4" />
                            {section.title}
                        </h3>
                        <p className="text-sm text-red-200/80 whitespace-pre-wrap leading-relaxed relative z-10">{section.content}</p>
                    </div>
                 );
            default: // 'text'
                return (
                    <div key={section.id || index} className="bg-stone-800/30 rounded-xl p-4 border border-stone-700/30">
                        <h3 className="font-medieval text-lg text-stone-200 mb-2 border-b border-stone-700/50 pb-1">{section.title}</h3>
                        <p className="text-sm text-stone-400 whitespace-pre-wrap leading-relaxed">{section.content}</p>
                    </div>
                );
        }
    };

    if (!pin) return null;

    const isDM = user?.profile.role === 'DM';
    const linkedMap = maps.find(m => m.id === pin.linked_map_id);

    return (
        <aside className={`absolute top-0 right-0 h-full w-full max-w-md transform bg-stone-900/95 backdrop-blur-2xl border-l border-stone-700/50 p-6 shadow-2xl transition-transform duration-300 ease-in-out z-30 ${pin ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex h-full flex-col">
                <div className="flex items-start justify-between border-b border-stone-800 pb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span style={{ backgroundColor: pin.pin_types?.color || '#718096' }} className="flex h-10 w-10 items-center justify-center rounded-full text-xl shadow-lg ring-2 ring-stone-800">
                                {pin.pin_types?.emoji || '❓'}
                            </span>
                            <div>
                                <h2 className="text-2xl font-bold font-medieval text-stone-100">{pin.title}</h2>
                                <p className="text-xs text-stone-500 uppercase tracking-widest">{pin.pin_types?.name || 'Unknown Type'}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors">
                        <Icon name="close" className="h-6 w-6" />
                    </button>
                </div>

                {/* Character & Edit Controls */}
                <div className="mt-4 flex flex-col gap-4">
                    {/* Character Presence Section */}
                    {(presentCharacters.length > 0 || (isDM && !isPlayerView)) && (
                        <div className="bg-stone-800/30 rounded-xl p-3 border border-stone-700/30">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold uppercase text-stone-400 flex items-center gap-2">
                                    <Icon name="user" className="w-3 h-3"/> Characters Present
                                </h3>
                                {isDM && !isPlayerView && !isSummoning && (
                                    <button onClick={() => setIsSummoning(true)} className="text-xs text-amber-500 hover:text-amber-400">+ Summon</button>
                                )}
                            </div>
                            
                            {isSummoning && (
                                <div className="mb-3 bg-stone-900 rounded-lg border border-amber-500/30 p-2 animate-modal-in">
                                    <input autoFocus type="text" placeholder="Search characters..." className="w-full bg-transparent text-sm border-b border-stone-700 pb-1 mb-2 focus:outline-none focus:border-amber-500" />
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                        {characters.filter(c => c.current_pin_id !== pin.id).map(c => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => handleMoveCharacter(c.id, pin.id)}
                                                className="w-full text-left flex items-center gap-2 px-2 py-1 hover:bg-stone-800 rounded text-sm text-stone-300"
                                            >
                                                <div className="w-4 h-4 rounded-full bg-stone-700 overflow-hidden">{c.image_url && <img src={c.image_url} className="w-full h-full object-cover"/>}</div>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setIsSummoning(false)} className="w-full text-center text-xs text-stone-500 mt-2 hover:text-stone-300">Cancel</button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {presentCharacters.map(char => (
                                    <div key={char.id} className="relative group">
                                        <button 
                                            onClick={() => setViewingCharacter(char)}
                                            className="w-10 h-10 rounded-full bg-stone-700 border-2 border-stone-600 hover:border-amber-500 overflow-hidden transition-all relative z-10"
                                            title={char.name}
                                        >
                                            {char.image_url ? (
                                                <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-xs font-bold">{char.name.charAt(0)}</div>
                                            )}
                                        </button>
                                        {isDM && !isPlayerView && (
                                            <button 
                                                onClick={() => handleMoveCharacter(char.id, null)}
                                                className="absolute -top-1 -right-1 z-20 bg-stone-900 text-stone-500 hover:text-red-500 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove from location"
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {presentCharacters.length === 0 && !isSummoning && <span className="text-xs text-stone-600 italic">No one is here.</span>}
                            </div>
                        </div>
                    )}

                    {/* View Character Mini-Modal (Overlay inside Sidebar) */}
                    {viewingCharacter && (
                        <div className="bg-stone-800 border border-amber-900/30 rounded-xl p-4 animate-modal-in relative">
                            <button onClick={() => setViewingCharacter(null)} className="absolute top-2 right-2 text-stone-500 hover:text-stone-300"><Icon name="close" className="w-4 h-4"/></button>
                            <div className="flex gap-3 mb-3">
                                <div className="w-16 h-16 rounded-lg bg-stone-900 overflow-hidden border border-stone-600 flex-shrink-0">
                                    {viewingCharacter.image_url && <img src={viewingCharacter.image_url} className="w-full h-full object-cover"/>}
                                </div>
                                <div>
                                    <h3 className="font-medieval text-lg text-amber-500">{viewingCharacter.name}</h3>
                                    <p className="text-xs text-stone-400">{viewingCharacter.role_details?.race} {!isPlayerView && viewingCharacter.role_details?.class}</p>
                                    
                                    {!isPlayerView && (
                                        <p className="text-xs text-stone-500">Level {viewingCharacter.role_details?.level} • {viewingCharacter.role_details?.alignment}</p>
                                    )}
                                    
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {!isPlayerView && viewingCharacter.sheet_url && (
                                            <a href={viewingCharacter.sheet_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-stone-700 hover:text-white text-stone-300 text-xs flex items-center gap-1">
                                                <Icon name="external" className="w-3 h-3" /> Sheet
                                            </a>
                                        )}
                                        {!isPlayerView && viewingCharacter.character_json && isDM && (
                                            <button onClick={() => handleDownloadCharJson(viewingCharacter)} className="p-1 rounded bg-stone-700 hover:text-white text-stone-300 text-xs flex items-center gap-1">
                                                <Icon name="download" className="w-3 h-3" /> JSON
                                            </button>
                                        )}
                                        {onOpenWiki && (
                                            <button onClick={() => onOpenWiki(viewingCharacter.id)} className="p-1 rounded bg-amber-900/40 text-amber-500 hover:text-amber-400 hover:bg-amber-900/60 text-xs flex items-center gap-1 border border-amber-900/50">
                                                <Icon name="book" className="w-3 h-3" /> Open in Wiki
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-sm text-stone-300 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap mb-2">
                                {viewingCharacter.backstory || "No backstory."}
                            </div>

                            {/* Relationships Section in Mini Sheet */}
                            {viewingCharacter.relationships && viewingCharacter.relationships.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-stone-700/50">
                                    <p className="text-xs text-stone-500 font-bold mb-1 uppercase">Connections</p>
                                    <div className="space-y-1">
                                        {viewingCharacter.relationships.map((rel, i) => (
                                            <div key={i} className="text-xs flex items-start gap-1">
                                                <span className="text-amber-500 font-bold">•</span>
                                                <span className="text-stone-300">
                                                    <span className="font-medium text-stone-200">{getCharacterName(rel.targetId)}</span>
                                                    <span className="text-stone-500"> ({rel.type})</span>
                                                    {rel.notes && <span className="text-stone-500 block pl-2 italic">"{rel.notes}"</span>}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isDM && !isPlayerView && viewingCharacter.gm_notes && (
                                <div className="mt-2 pt-2 border-t border-red-900/30">
                                    <p className="text-xs text-red-400 font-bold mb-1">GM Notes:</p>
                                    <p className="text-xs text-red-300/80">{viewingCharacter.gm_notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {isDM && !isPlayerView && (
                        <button onClick={() => onEdit(pin)} className="w-full rounded-xl bg-amber-600/20 text-amber-500 border border-amber-600/30 px-3 py-2 text-sm hover:bg-amber-600 hover:text-white transition-all">Edit Pin Details</button>
                    )}
                </div>

                <div className="mt-6 flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    {isDM && !isPlayerView && pin.data.encounter_file && (
                        <button 
                            onClick={handleDownloadEncounter}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-800/60 hover:bg-stone-700 border border-stone-700/50 px-4 py-3 text-sm font-medium text-stone-300 hover:text-amber-500 transition-all shadow-md"
                        >
                            <Icon name="download" className="w-5 h-5" />
                            <span>Download Encounter ({pin.data.encounter_file.name})</span>
                        </button>
                    )}

                    {pin.data.description && <p className="text-stone-300 whitespace-pre-wrap leading-relaxed">{pin.data.description}</p>}
                    
                    {linkedMap && (
                        <div className="bg-stone-800/40 p-3 rounded-xl border border-stone-700/50 group cursor-pointer hover:bg-stone-800/60 transition-colors">
                             <h3 className="text-xs font-bold uppercase text-stone-500 mb-1">Linked Map</h3>
                            <div className="flex items-center gap-2 text-amber-500">
                                <Icon name="map" className="w-4 h-4"/>
                                <span className="font-medieval text-lg">{linkedMap.name}</span>
                            </div>
                        </div>
                    )}

                    {pin.data.sections?.map((section, index) => renderSection(section, index))}
                    
                    <div className="space-y-4 pt-4 border-t border-stone-800">
                        <h3 className="text-sm font-bold uppercase text-stone-500">Comments</h3>
                        <div className="space-y-3">
                            {comments.map(comment => (
                                <div key={comment.id} className="text-sm bg-stone-800/40 p-3 rounded-xl border border-stone-700/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-amber-500/80">{comment.users.username}</p>
                                        <span className="text-stone-600 text-xs">•</span>
                                        <p className="text-xs text-stone-600">{new Date(comment.created_at).toLocaleDateString()}</p>
                                        {comment.is_private && <span className="ml-auto text-xs text-amber-600 bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-800/30">Private</span>}
                                    </div>
                                    <p className="text-stone-300">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAddComment} className="space-y-3 mt-4">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 p-3 text-sm text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-stone-600"
                                rows={2}
                            ></textarea>
                            <div className="flex justify-between items-center">
                                 <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer select-none">
                                    <input type="checkbox" checked={isPrivateComment} onChange={(e) => setIsPrivateComment(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500 bg-stone-800 border-stone-600" />
                                    Private Note
                                </label>
                                <button type="submit" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 shadow-lg hover:shadow-amber-900/20 transition-all">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default PinDetails;
