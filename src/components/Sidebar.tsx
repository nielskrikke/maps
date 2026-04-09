
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../App';
import { useAppContext } from '../contexts/AppContext';
import { Map as MapType, MapTypeEnum, Pin, Character } from '../types';
import { Icon } from './Icons';
import { cn } from '../lib/utils';

interface SidebarProps {
    selectedMap: MapType | null;
    selectedPin: Pin | null;
    selectedCharacter: Character | null;
    onSelectMap: (map: MapType | null) => void;
    onSelectPin: (pin: Pin | null) => void;
    onSelectCharacter: (char: Character | null) => void;
    currentView: 'map' | 'wiki';
    onViewChange: (view: 'map' | 'wiki') => void;
    onDMToolsOpen: () => void;
    onUserSettingsOpen: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    selectedMap, selectedPin, selectedCharacter, 
    onSelectMap, onSelectPin, onSelectCharacter,
    currentView, onViewChange, onDMToolsOpen, onUserSettingsOpen 
}) => {
    const { user, signOut } = useAuth();
    const { maps, pins, pinTypes, characters, isPlayerView, setIsPlayerView } = useAppContext();
    const [expandedMapIds, setExpandedMapIds] = useState<Set<string>>(new Set());
    
    // Wiki State
    const [wikiSearchQuery, setWikiSearchQuery] = useState('');

    // Filter data based on view mode
    const displayMaps = useMemo(() => {
        const list = (isPlayerView) ? maps.filter(m => m.is_visible) : maps;
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }, [maps, isPlayerView]);

    const displayCharacters = useMemo(() => {
        const list = (isPlayerView) ? characters.filter(c => c.is_visible) : characters;
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }, [characters, isPlayerView]);

    // Wiki Filter Logic
    const filteredWikiData = useMemo(() => {
        if (currentView !== 'wiki') return { maps: [], characters: [] };
        
        const lowerQ = wikiSearchQuery.toLowerCase();
        
        const fChars = displayCharacters.filter(c => 
            !wikiSearchQuery || 
            c.name.toLowerCase().includes(lowerQ) || 
            c.role_details?.race.toLowerCase().includes(lowerQ) ||
            c.role_details?.class.toLowerCase().includes(lowerQ)
        );

        const fMaps = displayMaps.map(map => {
            const mapPins = pins.filter(p => p.map_id === map.id);
            const matchingPins = mapPins.filter(pin => 
                pin.title.toLowerCase().includes(lowerQ) || 
                pin.data.description?.toLowerCase().includes(lowerQ)
            ).sort((a, b) => a.title.localeCompare(b.title));

            const matchesMap = map.name.toLowerCase().includes(lowerQ);
            if (!matchesMap && matchingPins.length === 0) return null;

            return { map, pins: matchingPins };
        }).filter(Boolean) as { map: MapType, pins: Pin[] }[];

        return { maps: fMaps, characters: fChars };
    }, [currentView, wikiSearchQuery, displayMaps, displayCharacters, pins]);


    useEffect(() => {
        if (selectedMap) {
            let current = selectedMap;
            const newExpanded = new Set(expandedMapIds);
            let changed = false;
            
            while (current && current.parent_map_id) {
                if (!newExpanded.has(current.parent_map_id)) {
                    newExpanded.add(current.parent_map_id);
                    changed = true;
                }
                const parent = displayMaps.find(m => m.id === current!.parent_map_id);
                if (!parent || parent.id === current.id) break;
                current = parent;
            }
            
            if (changed) {
                setExpandedMapIds(newExpanded);
            }
        }
    }, [selectedMap, displayMaps]);

    const toggleExpand = (mapId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(expandedMapIds);
        if (newSet.has(mapId)) newSet.delete(mapId);
        else newSet.add(mapId);
        setExpandedMapIds(newSet);
    };

    const getMapIconName = (type?: MapTypeEnum) => {
        switch (type) {
            case 'world': return 'globe';
            case 'city': return 'castle';
            case 'dungeon': return 'skull';
            case 'battlemap': return 'compass';
            default: return 'map';
        }
    };

    const MapModeTreeItem: React.FC<{ map: MapType, level: number, visited?: Set<string> }> = ({ map, level, visited = new Set() }) => {
        if (visited.has(map.id)) return null;
        const newVisited = new Set(visited).add(map.id);

        const children = displayMaps.filter(m => m.parent_map_id === map.id).sort((a, b) => a.name.localeCompare(b.name));
        const hasChildren = children.length > 0;
        const isExpanded = expandedMapIds.has(map.id);
        const isSelected = selectedMap?.id === map.id;
        const iconName = getMapIconName(map.map_type);

        return (
            <div className="select-none">
                <motion.div 
                    layout
                    onClick={() => onSelectMap(map)}
                    className={cn(
                        "flex items-center space-x-2 rounded-xl py-2 pr-3 text-sm font-medium transition-all duration-200 group cursor-pointer relative",
                        isSelected 
                            ? 'bg-dnd-gold/10 text-dnd-gold border border-dnd-gold/20 shadow-lg' 
                            : 'text-dnd-text/60 hover:bg-white/5 hover:text-white'
                    )}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                        {hasChildren ? (
                            <button onClick={(e) => toggleExpand(map.id, e)} className="p-1 hover:text-dnd-gold transition-colors focus:outline-none">
                                <Icon name={isExpanded ? "chevron-down" : "chevron-right"} className="w-4 h-4 opacity-70" />
                            </button>
                        ) : (
                            <Icon name={iconName} className={cn("h-4 w-4 opacity-50", isSelected && "text-dnd-gold opacity-100")} />
                        )}
                    </div>
                    <span className="truncate flex-1">{map.name}</span>
                    {!isPlayerView && !map.is_visible && <Icon name="eye-off" className="w-3 h-3 text-dnd-text/30" title="Hidden" />}
                </motion.div>
                <AnimatePresence>
                    {hasChildren && isExpanded && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1 space-y-1 overflow-hidden"
                        >
                            {children.map(child => (
                                <MapModeTreeItem key={child.id} map={child} level={level + 1} visited={newVisited} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const WikiModeTreeItem: React.FC<{ map: MapType, level: number }> = ({ map, level }) => {
        const children = displayMaps.filter(m => m.parent_map_id === map.id).sort((a, b) => a.name.localeCompare(b.name));
        const hasChildren = children.length > 0;
        const isExpanded = expandedMapIds.has(map.id);
        const isMapSelected = selectedMap?.id === map.id;
        const iconName = getMapIconName(map.map_type);

        const mapPins = isMapSelected 
            ? pins.filter(p => p.map_id === map.id).sort((a, b) => a.title.localeCompare(b.title))
            : [];

        return (
            <div className="select-none">
                <motion.div 
                    layout
                    onClick={() => onSelectMap(map)}
                    className={cn(
                        "flex items-center space-x-2 rounded-xl py-2 pr-3 text-sm font-medium transition-all duration-200 group cursor-pointer relative",
                        isMapSelected 
                            ? 'bg-dnd-gold/10 text-dnd-gold border border-dnd-gold/20 shadow-lg' 
                            : 'text-dnd-text/60 hover:bg-white/5 hover:text-white'
                    )}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                        {hasChildren ? (
                            <button onClick={(e) => toggleExpand(map.id, e)} className="p-1 hover:text-dnd-gold transition-colors focus:outline-none">
                                <Icon name={isExpanded ? "chevron-down" : "chevron-right"} className="w-4 h-4 opacity-70" />
                            </button>
                        ) : (
                            <Icon name={iconName} className={cn("h-4 w-4 opacity-50", isMapSelected && "text-dnd-gold opacity-100")} />
                        )}
                    </div>
                    <span className="truncate flex-1">{map.name}</span>
                </motion.div>

                <AnimatePresence>
                    {isMapSelected && mapPins.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-1 mt-1 space-y-0.5 overflow-hidden"
                        >
                            {mapPins.map(pin => (
                                <button 
                                    key={pin.id}
                                    onClick={() => onSelectPin(pin)}
                                    className={cn(
                                        "w-full flex items-center gap-2 py-1.5 text-xs text-left rounded-lg transition-colors pl-2",
                                        selectedPin?.id === pin.id 
                                            ? 'bg-white/10 text-dnd-gold font-bold' 
                                            : 'text-dnd-text/40 hover:text-dnd-text/80 hover:bg-white/5'
                                    )}
                                    style={{ paddingLeft: `${level * 12 + 36}px` }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pinTypes.find(t => t.id === pin.pin_type_id)?.color }}></span>
                                    <span className="truncate">{pin.title}</span>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <AnimatePresence>
                    {hasChildren && isExpanded && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1 space-y-1 overflow-hidden"
                        >
                            {children.map(child => (
                                <WikiModeTreeItem key={child.id} map={child} level={level + 1} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const rootMaps = displayMaps.filter(m => !m.parent_map_id || !displayMaps.find(p => p.id === m.parent_map_id)).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <aside className="flex h-full w-full flex-col md:w-64 bg-dnd-panel/80 backdrop-blur-md border-r border-white/5 p-3 shadow-2xl z-20 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-dnd-gold/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex items-center gap-3 mb-4 px-1 relative z-10">
                <img 
                    src="https://nielskrikke.com/wp-content/uploads/2026/04/maps-icon-new.png" 
                    alt="Atlas" 
                    className="w-8 h-8 rounded-xl shadow-2xl border border-white/10" 
                    referrerPolicy="no-referrer"
                />
                <h1 className="text-xl font-serif font-bold text-white tracking-tight">Atlas</h1>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 bg-black/20 p-1 rounded-xl mb-4 relative z-10">
                <button 
                    onClick={() => onViewChange('map')}
                    className={cn(
                        "flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all",
                        currentView === 'map' 
                            ? 'bg-dnd-gold text-white shadow-xl shadow-dnd-gold/20' 
                            : 'text-dnd-text/40 hover:text-dnd-text/80'
                    )}
                >
                    <Icon name="map" className="w-3.5 h-3.5" />
                    Map
                </button>
                <button 
                    onClick={() => onViewChange('wiki')}
                    className={cn(
                        "flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all",
                        currentView === 'wiki' 
                            ? 'bg-dnd-gold text-white shadow-xl shadow-dnd-gold/20' 
                            : 'text-dnd-text/40 hover:text-dnd-text/80'
                    )}
                >
                    <Icon name="book" className="w-3.5 h-3.5" />
                    Wiki
                </button>
            </div>

            <button 
                onClick={onUserSettingsOpen}
                className="w-full flex items-center space-x-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-dnd-gold/30 p-2.5 shadow-inner transition-all group text-left relative z-10"
                title="Profile Settings"
            >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-dnd-dark border border-white/10 overflow-hidden text-dnd-gold group-hover:border-dnd-gold/50 transition-colors shadow-xl">
                    {user?.profile.image_url ? (
                        <img src={user.profile.image_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        <span className="font-serif font-bold text-lg">{user?.profile.username.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-sm text-white group-hover:text-dnd-gold transition-colors">{user?.profile.username}</p>
                    <p className="text-[9px] text-dnd-text/40 uppercase tracking-widest font-bold">{user?.profile.role}</p>
                </div>
                <Icon name="settings" className="w-3.5 h-3.5 text-dnd-text/20 group-hover:text-dnd-gold opacity-0 group-hover:opacity-100 transition-all" />
            </button>

            {/* Wiki Search Bar */}
            <AnimatePresence>
                {currentView === 'wiki' && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-6 relative z-10"
                    >
                        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dnd-text/30" />
                        <input 
                            type="text" 
                            placeholder="Search the archives..." 
                            value={wikiSearchQuery}
                            onChange={(e) => setWikiSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:border-dnd-gold/50 focus:outline-none placeholder-dnd-text/20 transition-all"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <nav className="mt-4 flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
                {currentView === 'map' ? (
                    <>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-[10px] font-bold tracking-[0.2em] text-dnd-text/30 uppercase">Cartography</h2>
                        </div>
                        {rootMaps.length > 0 ? (
                            <div className="space-y-1">
                                {rootMaps.map((map) => (
                                    <MapModeTreeItem key={map.id} map={map} level={0} />
                                ))}
                            </div>
                        ) : (
                            <p className="px-3 text-sm text-dnd-text/20 italic">No maps discovered yet.</p>
                        )}
                    </>
                ) : (
                    <>
                         {wikiSearchQuery && (
                             <div className="mb-6">
                                <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-dnd-text/30 mb-3">Search Results</h3>
                                {filteredWikiData.characters.length === 0 && filteredWikiData.maps.length === 0 && (
                                     <p className="px-3 text-sm text-dnd-text/20 italic">No records found.</p>
                                )}
                             </div>
                         )}

                         {/* Characters Section */}
                         {(filteredWikiData.characters.length > 0) && (
                            <div className="mb-8">
                                <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-dnd-text/30 mb-3">Dramatis Personae</h3>
                                {filteredWikiData.characters.map(char => (
                                    <button
                                        key={char.id}
                                        onClick={() => onSelectCharacter(char)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all mb-2 border",
                                            selectedCharacter?.id === char.id 
                                                ? 'bg-dnd-gold/10 text-dnd-gold border-dnd-gold/20 shadow-lg' 
                                                : 'hover:bg-white/5 text-dnd-text/60 border-transparent'
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-dnd-dark border border-white/10 overflow-hidden flex-shrink-0 shadow-lg">
                                            {char.image_url ? (
                                                <img src={char.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-30">
                                                    <Icon name="user" className="w-5 h-5"/>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold truncate text-sm text-white">{char.name}</div>
                                            <div className="text-[10px] text-dnd-text/40 truncate uppercase tracking-tighter">
                                                {char.role_details?.race} {char.role_details?.class}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                         )}

                         {/* Locations Section */}
                         {(wikiSearchQuery ? filteredWikiData.maps.length > 0 : rootMaps.length > 0) && (
                             <div>
                                <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-dnd-text/30 mb-3">Compendium</h3>
                                {wikiSearchQuery ? (
                                    <div className="space-y-2">
                                        {filteredWikiData.maps.map(({ map, pins }) => (
                                            <div key={map.id} className="mb-4">
                                                <button 
                                                    onClick={() => onSelectMap(map)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-all rounded-xl",
                                                        selectedMap?.id === map.id ? 'text-dnd-gold bg-dnd-gold/10' : 'text-dnd-text/60 hover:bg-white/5'
                                                    )}
                                                >
                                                    <Icon name="map" className="w-4 h-4 opacity-50"/>
                                                    <span className="font-bold truncate">{map.name}</span>
                                                </button>
                                                <div className="pl-4 border-l border-white/5 ml-5 mt-2 space-y-1">
                                                    {pins.map(pin => (
                                                        <button 
                                                            key={pin.id}
                                                            onClick={() => onSelectPin(pin)}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs rounded-lg text-dnd-text/40 hover:text-dnd-text/80 hover:bg-white/5 transition-all"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: pinTypes.find(t => t.id === pin.pin_type_id)?.color }}></span>
                                                            <span className="truncate">{pin.title}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {rootMaps.map(map => (
                                            <WikiModeTreeItem key={map.id} map={map} level={0} />
                                        ))}
                                    </div>
                                )}
                             </div>
                         )}
                    </>
                )}
            </nav>

            {user?.profile.role === 'DM' && (
                <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
                    <h2 className="text-[9px] font-bold tracking-[0.3em] text-dnd-text/20 uppercase px-2 mb-3">Master Controls</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={onDMToolsOpen}
                            className="flex-1 flex items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-dnd-gold/30 text-dnd-text/40 hover:text-dnd-gold transition-all group shadow-xl"
                            title="DM Tools & Settings"
                        >
                            <Icon name="view_apps" className="w-6 h-6" />
                        </button>

                        <button 
                            onClick={() => setIsPlayerView(!isPlayerView)}
                            className={cn(
                                "flex-1 flex items-center justify-center p-2.5 rounded-xl border transition-all shadow-xl",
                                isPlayerView 
                                    ? 'bg-dnd-gold/10 border-dnd-gold/30 text-dnd-gold shadow-dnd-gold/10' 
                                    : 'bg-white/5 border-white/5 text-dnd-text/40 hover:bg-white/10 hover:text-white'
                            )}
                            title={isPlayerView ? "Switch to DM View" : "Switch to Player View"}
                        >
                            <Icon name={isPlayerView ? "visibility" : "visibility_off"} className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
            
            {user?.profile.role === 'Player' && (
                <div className="mt-6 border-t border-white/5 pt-6 relative z-10">
                    <button onClick={signOut} className="flex w-full items-center space-x-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-dnd-text/40 hover:bg-dnd-red/10 hover:text-dnd-red transition-all">
                        <Icon name="logout" className="h-5 w-5" />
                        <span>Depart Archives</span>
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
