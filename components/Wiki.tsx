
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from './Dashboard';
import { useAuth } from '../App';
import { Map as MapType, Pin, Character, Comment } from '../types';
import { Icon } from './Icons';
import { supabase } from '../services/supabase';

interface WikiProps {
    target?: { type: 'character' | 'map', id: string } | null;
    onSelectMap: (map: MapType) => void;
    onLocatePin: (pin: Pin) => void;
}

const Wiki: React.FC<WikiProps> = ({ target, onSelectMap, onLocatePin }) => {
    const { maps, pins, pinTypes, characters, isPlayerView } = useAppContext();
    const { user } = useAuth();
    const isDM = user?.profile.role === 'DM';
    const canSeeSecrets = isDM && !isPlayerView;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    // Handle incoming target prop (deep linking)
    useEffect(() => {
        if (target) {
            if (target.type === 'character') {
                setSelectedCharacterId(target.id);
                setSelectedMapId(null);
                setSelectedPinId(null);
            } else if (target.type === 'map') {
                setSelectedMapId(target.id);
                setSelectedCharacterId(null);
                setSelectedPinId(null);
            }
        }
    }, [target]);

    // Comments State for Characters
    const [characterComments, setCharacterComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPrivateComment, setIsPrivateComment] = useState(false);

    // Fetch character comments when a character is selected
    useEffect(() => {
        if (selectedCharacterId) {
            const fetchComments = async () => {
                const { data, error } = await supabase
                    .from('comments')
                    .select('*, users(username)')
                    .eq('character_id', selectedCharacterId)
                    .order('created_at', { ascending: true });
                if (data) setCharacterComments(data as any);
            };
            fetchComments();
        } else {
            setCharacterComments([]);
        }
    }, [selectedCharacterId]);

    const handleAddCharacterComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !selectedCharacterId || !user) return;

        const { data, error } = await supabase
            .from('comments')
            .insert({
                character_id: selectedCharacterId,
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

    const handleNavigateToCharacter = (charId: string) => {
        setSelectedCharacterId(charId);
        setSelectedMapId(null);
        setSelectedPinId(null);
    };

    // Filter Logic for Maps
    const filteredMaps = useMemo(() => {
        const lowerQ = searchQuery.toLowerCase();
        
        // Ensure hidden maps are filtered out in player view
        const availableMaps = (isDM && !isPlayerView) ? maps : maps.filter(m => m.is_visible);

        return availableMaps.map(map => {
            // Pins are already filtered by context in Dashboard.tsx based on isPlayerView
            const mapPins = pins.filter(p => p.map_id === map.id);
            let matchesMap = !searchQuery || map.name.toLowerCase().includes(lowerQ);
            
            const matchingPins = mapPins.filter(pin => {
                if (!searchQuery) return true;
                if (pin.title.toLowerCase().includes(lowerQ)) return true;
                if (pin.data.description?.toLowerCase().includes(lowerQ)) return true;
                return pin.data.sections?.some(s => 
                    s.title.toLowerCase().includes(lowerQ) || 
                    s.content.toLowerCase().includes(lowerQ) ||
                    (s.type === 'list' && s.list_items?.some(i => i.toLowerCase().includes(lowerQ)))
                );
            });

            if (searchQuery && !matchesMap && matchingPins.length === 0) return null;

            return {
                map,
                pins: matchingPins
            };
        }).filter(Boolean) as { map: MapType, pins: Pin[] }[];

    }, [maps, pins, searchQuery, isDM, isPlayerView]);

    // Filter Logic for Characters
    const filteredCharacters = useMemo(() => {
        const lowerQ = searchQuery.toLowerCase();
        // Determine visibility based on Role and isPlayerView toggle
        const availableChars = (isDM && !isPlayerView) 
            ? characters 
            : characters.filter(c => c.is_visible); // Only show unlocked chars to players

        return availableChars.filter(c => 
            !searchQuery || 
            c.name.toLowerCase().includes(lowerQ) || 
            c.role_details?.race.toLowerCase().includes(lowerQ) ||
            c.role_details?.class.toLowerCase().includes(lowerQ)
        );
    }, [characters, searchQuery, isDM, isPlayerView]);

    const activeMapData = selectedMapId ? filteredMaps.find(c => c.map.id === selectedMapId) : null;
    const activePin = selectedPinId ? pins.find(p => p.id === selectedPinId) : null;
    const activePinMap = activePin ? maps.find(m => m.id === activePin.map_id) : null;
    const activeCharacter = selectedCharacterId ? characters.find(c => c.id === selectedCharacterId) : null;

    // Helper to get character relationships
    const getCharacterName = (id: string) => characters.find(c => c.id === id)?.name || "Unknown";

    // Helper to render a character list (used in Pin and Map views)
    const CharacterPresenceList: React.FC<{ chars: Character[], title: string }> = ({ chars, title }) => {
        if (chars.length === 0) return null;
        return (
            <div className="mb-8 bg-stone-900/40 p-5 rounded-2xl border border-stone-700/50">
                <h3 className="text-xs font-bold uppercase text-stone-500 mb-4 flex items-center gap-2">
                    <Icon name="user" className="w-4 h-4"/> {title}
                </h3>
                <div className="flex flex-wrap gap-4">
                    {chars.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => handleNavigateToCharacter(c.id)} 
                            className="flex items-center gap-3 bg-stone-800 hover:bg-stone-700 p-2 rounded-xl border border-stone-700 hover:border-amber-500/50 transition-all group min-w-[150px]"
                        >
                            <div className="w-10 h-10 rounded-full bg-stone-900 overflow-hidden ring-2 ring-stone-700 group-hover:ring-amber-500/50 transition-all">
                                {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover" alt={c.name}/> : <div className="w-full h-full flex items-center justify-center text-stone-600"><Icon name="user" className="w-5 h-5"/></div>}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-stone-200 group-hover:text-amber-400 truncate max-w-[120px]">{c.name}</p>
                                <p className="text-[10px] text-stone-500 uppercase tracking-wider">{c.role_details?.race}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // --- Renderers ---

    const renderPinContent = (pin: Pin) => {
        const type = pinTypes.find(t => t.id === pin.pin_type_id);
        const charactersAtPin = characters.filter(c => c.current_pin_id === pin.id && ((isDM && !isPlayerView) || c.is_visible));
        
        return (
            <div className="space-y-8 animate-modal-in max-w-4xl mx-auto pb-20">
                {/* Header */}
                <div className="border-b border-stone-700/50 pb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl text-3xl ring-2 ring-stone-700/50" style={{ backgroundColor: type?.color || '#555' }}>
                            {type?.emoji || '📍'}
                        </div>
                        <div>
                            <h1 className="text-4xl font-medieval font-bold text-stone-100">{pin.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-stone-800/50 px-2 py-0.5 rounded text-xs text-stone-400 border border-stone-700 uppercase tracking-wider">{type?.name || 'Unknown'}</span>
                                {activePinMap && <span className="text-stone-500 text-sm flex items-center gap-1"><Icon name="map" className="w-3 h-3"/> {activePinMap.name}</span>}
                            </div>
                        </div>
                        <button 
                            onClick={() => onLocatePin(pin)}
                            className="ml-auto flex items-center gap-2 bg-stone-800 hover:bg-amber-700/20 hover:text-amber-500 border border-stone-700 px-4 py-2 rounded-xl transition-all text-sm font-medium group"
                        >
                            <Icon name="compass" className="w-4 h-4 group-hover:rotate-45 transition-transform"/>
                            Locate on Map
                        </button>
                    </div>

                    {pin.data.description && (
                         <div className="prose prose-invert max-w-none text-stone-300 text-lg leading-relaxed bg-stone-900/20 p-6 rounded-2xl border border-stone-800/50">
                            {pin.data.description}
                         </div>
                    )}
                </div>

                <CharacterPresenceList chars={charactersAtPin} title="Present Here" />

                {/* Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pin.data.sections?.map((section, idx) => {
                        if (section.type === 'secret' && !canSeeSecrets) return null;
                        
                        const isFullWidth = section.type === 'text' || section.type === 'list' || section.type === 'inventory';
                        
                        return (
                            <div key={idx} className={`bg-stone-800/20 rounded-2xl border border-stone-700/30 overflow-hidden ${isFullWidth ? 'md:col-span-2' : ''} ${section.type === 'secret' ? 'border-red-900/50 bg-red-950/10' : ''}`}>
                                <div className={`px-5 py-3 border-b border-stone-700/30 flex items-center justify-between ${section.type === 'secret' ? 'bg-red-950/30' : 'bg-stone-800/40'}`}>
                                    <h3 className={`font-medieval text-xl ${section.type === 'secret' ? 'text-red-400' : 'text-stone-200'}`}>
                                        {section.type === 'secret' && <Icon name="lock" className="w-4 h-4 inline mr-2" />}
                                        {section.title}
                                    </h3>
                                    <span className="text-xs uppercase text-stone-600 font-bold tracking-wider">{section.type}</span>
                                </div>
                                
                                <div className="p-5">
                                    {section.type === 'text' && <p className="whitespace-pre-wrap text-stone-300 leading-relaxed">{section.content}</p>}
                                    {section.type === 'secret' && <p className="whitespace-pre-wrap text-red-200/80 leading-relaxed font-mono text-sm">{section.content}</p>}
                                    {/* ... other sections ... */}
                                    {section.type === 'list' && (
                                        <>
                                            {section.content && <p className="mb-4 text-stone-400 italic">{section.content}</p>}
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {section.list_items?.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-stone-300 bg-stone-900/30 p-2 rounded">
                                                        <span className="text-amber-500 mt-1">✦</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                    {section.type === 'statblock' && (
                                        <>
                                            {section.content && <p className="mb-4 text-stone-400 italic">{section.content}</p>}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {section.stats?.map((stat, i) => (
                                                    <div key={i} className="bg-stone-900/50 p-3 rounded-lg border border-stone-800 flex flex-col items-center text-center">
                                                        <span className="text-xs uppercase tracking-wider text-amber-600 font-bold mb-1">{stat.label}</span>
                                                        <span className="font-medieval text-xl text-stone-200">{stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {section.type === 'image' && section.image_url && (
                                        <img src={section.image_url} alt={section.title} className="w-full h-auto rounded-lg shadow-lg" />
                                    )}
                                    {section.type === 'inventory' && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="text-stone-500 uppercase text-xs border-b border-stone-700/50">
                                                    <tr>
                                                        <th className="pb-2 pl-2">Item</th>
                                                        <th className="pb-2">Rarity</th>
                                                        <th className="pb-2 text-right pr-2">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-700/30">
                                                    {section.items?.map((item, i) => (
                                                        <tr key={i} className="hover:bg-stone-700/20">
                                                            <td className="py-2 pl-2">
                                                                <span className={`font-medium ${item.is_magic ? 'text-amber-400' : 'text-stone-300'}`}>{item.name}</span>
                                                            </td>
                                                            <td className="py-2 text-purple-400 text-xs">{item.rarity || '-'}</td>
                                                            <td className="py-2 text-right pr-2 font-mono text-stone-400">{item.count}</td>
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
            <div className="space-y-8 animate-modal-in max-w-4xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row gap-8 border-b border-stone-700/50 pb-8">
                    <div className="w-48 h-48 rounded-3xl overflow-hidden ring-4 ring-stone-800 shadow-2xl bg-stone-900 flex-shrink-0 mx-auto md:mx-0">
                        {char.image_url ? (
                            <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-600 bg-stone-800"><Icon name="user" className="w-16 h-16"/></div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-5xl font-medieval font-bold text-amber-500 mb-2">{char.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-stone-400 mb-4">
                            <span className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700">{char.role_details?.race}</span>
                            
                            {!isPlayerView && (
                                <>
                                    <span className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700">{char.role_details?.class}</span>
                                    <span className="bg-amber-900/30 px-3 py-1 rounded-full border border-amber-800/30 text-amber-500">Lvl {char.role_details?.level}</span>
                                    <span className="text-stone-500">{char.role_details?.alignment}</span>
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
                                    className="inline-flex items-center gap-2 text-amber-500 bg-amber-900/10 hover:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-900/30 hover:border-amber-500/50 mb-4 transition-all cursor-pointer group"
                                >
                                    <Icon name="map" className="w-4 h-4 group-hover:scale-110 transition-transform"/>
                                    <span>Currently in <span className="font-bold border-b border-transparent group-hover:border-amber-500 transition-colors">{currentMap.name}</span></span>
                                    <Icon name="chevron-right" className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                                </button>
                            );
                        })()}
                        
                        {!isPlayerView && char.sheet_url && (
                            <div className="flex gap-2 justify-center md:justify-start">
                                <a href={char.sheet_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                                    <Icon name="external" className="w-4 h-4"/> Character Sheet
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-stone-800/20 p-6 rounded-2xl border border-stone-700/30">
                            <h3 className="font-medieval text-xl text-stone-300 mb-4 border-b border-stone-700/50 pb-2">Biography</h3>
                            <p className="whitespace-pre-wrap text-stone-400 leading-relaxed">{char.backstory || "No biography available."}</p>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-stone-800/20 p-6 rounded-2xl border border-stone-700/30">
                            <h3 className="font-medieval text-xl text-stone-300 mb-4 border-b border-stone-700/50 pb-2">Journal & Notes</h3>
                            <div className="space-y-4 mb-6">
                                {characterComments.length === 0 && <p className="text-stone-600 italic text-sm">No notes yet.</p>}
                                {characterComments.map(comment => (
                                    <div key={comment.id} className="bg-stone-900/40 p-4 rounded-xl border border-stone-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-amber-600 text-sm">{comment.users.username}</span>
                                            <span className="text-xs text-stone-600">{new Date(comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-stone-300 text-sm">{comment.text}</p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleAddCharacterComment} className="space-y-3">
                                <textarea 
                                    value={newComment} 
                                    onChange={e => setNewComment(e.target.value)} 
                                    placeholder="Add a note..." 
                                    className="w-full bg-stone-900/50 border border-stone-700/50 rounded-xl p-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                                    rows={2}
                                />
                                <div className="flex justify-end">
                                    <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all">Post Note</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {canSeeSecrets && char.gm_notes && (
                            <div className="bg-red-950/20 p-5 rounded-2xl border border-red-900/40">
                                <h3 className="font-medieval text-lg text-red-400 mb-2 flex items-center gap-2"><Icon name="lock" className="w-4 h-4"/> GM Notes</h3>
                                <p className="text-sm text-red-300/70 whitespace-pre-wrap">{char.gm_notes}</p>
                            </div>
                        )}

                        <div className="bg-stone-800/20 p-5 rounded-2xl border border-stone-700/30">
                            <h3 className="font-medieval text-lg text-stone-300 mb-3">Relationships</h3>
                            {char.relationships.length > 0 ? (
                                <ul className="space-y-3">
                                    {char.relationships.map((rel, i) => (
                                        <li key={i} className="text-sm">
                                            <div className="font-bold text-stone-200">{getCharacterName(rel.targetId)}</div>
                                            <div className="text-amber-600 text-xs uppercase tracking-wide font-bold">{rel.type}</div>
                                            {rel.notes && <div className="text-stone-500 italic mt-1">"{rel.notes}"</div>}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-stone-600 italic text-sm">No known connections.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Layout ---
    return (
        <div className="flex h-full w-full bg-stone-950 text-stone-200">
            {/* Left Sidebar: Index */}
            <div className="w-80 border-r border-stone-700/50 flex flex-col bg-stone-900/30 backdrop-blur-sm">
                <div className="p-4 border-b border-stone-700/50">
                    <h2 className="text-amber-500 font-medieval text-xl mb-3 flex items-center gap-2">
                        <Icon name="book" className="w-5 h-5"/>
                        Wiki
                    </h2>
                    <div className="relative">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                        <input 
                            type="text" 
                            placeholder="Search everything..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-900/50 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-200 focus:border-amber-500 focus:outline-none placeholder-stone-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
                    
                    {/* CHARACTERS SECTION */}
                    {filteredCharacters.length > 0 && (
                        <div>
                             <h3 className="px-3 text-xs font-bold uppercase text-stone-500 mb-2 mt-2">Characters</h3>
                            {filteredCharacters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => { setSelectedCharacterId(char.id); setSelectedMapId(null); setSelectedPinId(null); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors mb-1 ${selectedCharacterId === char.id ? 'bg-amber-900/20 text-amber-400 border border-amber-500/30' : 'hover:bg-stone-800/50 text-stone-300 border border-transparent'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-stone-800 overflow-hidden flex-shrink-0">
                                        {char.image_url ? <img src={char.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="user" className="w-4 h-4"/></div>}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium truncate text-sm">{char.name}</div>
                                        <div className="text-[10px] text-stone-500 truncate">{char.role_details?.race} {char.role_details?.class}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* MAPS SECTION */}
                    {filteredMaps.length > 0 && (
                        <div>
                            <h3 className="px-3 text-xs font-bold uppercase text-stone-500 mb-2 mt-2">Locations</h3>
                            {filteredMaps.map(({ map, pins }) => (
                                <div key={map.id} className="rounded-xl overflow-hidden border border-transparent mb-1">
                                    <button 
                                        onClick={() => { setSelectedMapId(map.id); setSelectedPinId(null); setSelectedCharacterId(null); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${selectedMapId === map.id && !selectedPinId ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' : 'hover:bg-stone-800/50 text-stone-300'}`}
                                    >
                                        <Icon name="map" className="w-4 h-4 opacity-70"/>
                                        <span className="font-medium truncate">{map.name}</span>
                                    </button>
                                    
                                    {(selectedMapId === map.id || searchQuery) && (
                                        <div className="pl-4 border-l border-stone-800 ml-4 mt-1 space-y-0.5">
                                            {pins.map(pin => (
                                                <button 
                                                    key={pin.id}
                                                    onClick={() => { setSelectedMapId(map.id); setSelectedPinId(pin.id); setSelectedCharacterId(null); }}
                                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm rounded-lg transition-colors ${selectedPinId === pin.id ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/30'}`}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pinTypes.find(t => t.id === pin.pin_type_id)?.color }}></span>
                                                    <span className="truncate">{pin.title}</span>
                                                </button>
                                            ))}
                                            {pins.length === 0 && <p className="px-3 py-1 text-xs text-stone-600 italic">No pins found</p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredCharacters.length === 0 && filteredMaps.length === 0 && (
                         <div className="text-center text-stone-600 text-sm py-8">
                            <Icon name="search" className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                            <p>No results found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Pane: Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                <div className="p-8 md:p-12 min-h-full">
                    {selectedPinId && activePin ? (
                        renderPinContent(activePin)
                    ) : selectedCharacterId && activeCharacter ? (
                        renderCharacterContent(activeCharacter)
                    ) : selectedMapId && activeMapData ? (
                        <div className="max-w-4xl mx-auto space-y-8 animate-modal-in">
                            <div className="flex items-center gap-4 border-b border-stone-700/50 pb-6">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-stone-700 shadow-2xl bg-stone-900">
                                    <img src={activeMapData.map.image_url} className="w-full h-full object-cover" alt={activeMapData.map.name} />
                                </div>
                                <div>
                                    <h1 className="text-5xl font-medieval font-bold text-amber-500">{activeMapData.map.name}</h1>
                                    <p className="text-stone-500 mt-1 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
                                        <span className="capitalize">{activeMapData.map.map_type?.replace('_', ' ') || 'Region'} Map</span>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onSelectMap(activeMapData.map)}
                                    className="ml-auto flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl shadow-lg transition-all font-bold"
                                >
                                    <Icon name="map" className="w-5 h-5"/>
                                    Open Map
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeMapData.pins.map(pin => {
                                    const type = pinTypes.find(t => t.id === pin.pin_type_id);
                                    const charsAtPin = characters.filter(c => c.current_pin_id === pin.id && ((isDM && !isPlayerView) || c.is_visible));

                                    return (
                                        <button 
                                            key={pin.id}
                                            onClick={() => setSelectedPinId(pin.id)}
                                            className="bg-stone-800/40 hover:bg-stone-800 border border-stone-700/30 hover:border-amber-500/50 p-4 rounded-xl text-left transition-all group flex flex-col gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg ring-1 ring-white/10" style={{ backgroundColor: type?.color }}>
                                                    {type?.emoji}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-stone-200 truncate group-hover:text-amber-400">{pin.title}</h3>
                                                    <p className="text-xs text-stone-500">{type?.name}</p>
                                                </div>
                                            </div>
                                            {pin.data.description && (
                                                <p className="text-sm text-stone-500 line-clamp-2">{pin.data.description}</p>
                                            )}
                                            
                                            {/* Character Portraits Preview */}
                                            {charsAtPin.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-stone-700/30 flex items-center gap-2">
                                                    <div className="flex -space-x-2">
                                                        {charsAtPin.slice(0, 5).map(c => (
                                                            <div key={c.id} className="w-6 h-6 rounded-full ring-2 ring-stone-800 bg-stone-900 overflow-hidden relative z-0 hover:z-10 transition-all" title={c.name}>
                                                                {c.image_url ? (
                                                                    <img src={c.image_url} className="w-full h-full object-cover" alt={c.name} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-stone-500"><Icon name="user" className="w-3 h-3"/></div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {charsAtPin.length > 5 && (
                                                            <div className="w-6 h-6 rounded-full ring-2 ring-stone-800 bg-stone-800 flex items-center justify-center text-[10px] text-stone-400 font-bold z-0">
                                                                +{charsAtPin.length - 5}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                                                        {charsAtPin.length} Present
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-stone-600 space-y-6 opacity-50">
                            <Icon name="book" className="w-24 h-24"/>
                            <div className="text-center">
                                <h2 className="text-3xl font-medieval text-stone-400">The Archives</h2>
                                <p className="mt-2">Select a location or character from the left to begin reading.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Wiki;
