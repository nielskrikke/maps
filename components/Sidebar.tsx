
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { Map as MapType, MapTypeEnum, Pin, Character } from '../types';
import { Icon } from './Icons';

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
        // Standard alphabetical sort
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [maps, isPlayerView]);

    const displayCharacters = useMemo(() => {
        const list = (isPlayerView) ? characters.filter(c => c.is_visible) : characters;
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [characters, isPlayerView]);

    // Wiki Filter Logic
    const filteredWikiData = useMemo(() => {
        if (currentView !== 'wiki') return { maps: [], characters: [] };
        
        const lowerQ = wikiSearchQuery.toLowerCase();
        
        // Filter Characters
        const fChars = displayCharacters.filter(c => 
            !wikiSearchQuery || 
            c.name.toLowerCase().includes(lowerQ) || 
            c.role_details?.race.toLowerCase().includes(lowerQ) ||
            c.role_details?.class.toLowerCase().includes(lowerQ)
        );

        // Filter Maps (Search flat list logic)
        // If Searching, flat list. If not, tree structure (handled by rendering logic).
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


    // Auto-expand logic for current selection
    useEffect(() => {
        if (selectedMap) {
            let current = selectedMap;
            const newExpanded = new Set(expandedMapIds);
            let changed = false;
            
            // Only expand through visible parents
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

    // --- Tree Items ---

    const MapModeTreeItem: React.FC<{ map: MapType, level: number, visited?: Set<string> }> = ({ map, level, visited = new Set() }) => {
        if (visited.has(map.id)) return null;
        const newVisited = new Set(visited).add(map.id);

        const children = displayMaps.filter(m => m.parent_map_id === map.id).sort((a, b) => a.name.localeCompare(b.name));
        const hasChildren = children.length > 0;
        const isExpanded = expandedMapIds.has(map.id);
        const isSelected = selectedMap?.id === map.id;
        const iconName = getMapIconName(map.map_type);

        return (
            <div className="select-none transition-all duration-200">
                <div 
                    onClick={() => onSelectMap(map)}
                    className={`flex items-center space-x-2 rounded-xl py-2 pr-3 text-sm font-medium transition-all duration-200 group cursor-pointer relative
                        ${isSelected 
                            ? 'bg-amber-900/30 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                            : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-100'
                        }
                    `}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                        {hasChildren ? (
                            <button onClick={(e) => toggleExpand(map.id, e)} className="p-1 hover:text-amber-500 transition-colors focus:outline-none">
                                <Icon name={isExpanded ? "chevron-down" : "chevron-right"} className="w-4 h-4 opacity-70" />
                            </button>
                        ) : (
                            <Icon name={iconName} className={`h-4 w-4 opacity-50 ${isSelected ? 'text-amber-500' : ''}`} />
                        )}
                    </div>
                    <span className="truncate flex-1">{map.name}</span>
                    {!isPlayerView && !map.is_visible && <Icon name="eye-off" className="w-3 h-3 text-stone-600" title="Hidden" />}
                </div>
                {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1">
                        {children.map(child => (
                            <MapModeTreeItem key={child.id} map={child} level={level + 1} visited={newVisited} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const WikiModeTreeItem: React.FC<{ map: MapType, level: number }> = ({ map, level }) => {
        const children = displayMaps.filter(m => m.parent_map_id === map.id).sort((a, b) => a.name.localeCompare(b.name));
        const hasChildren = children.length > 0;
        const isExpanded = expandedMapIds.has(map.id);
        const isMapSelected = selectedMap?.id === map.id;
        const iconName = getMapIconName(map.map_type); // Unified icon logic

        // Requirement: Only show pins if this specific map is selected
        const mapPins = isMapSelected 
            ? pins.filter(p => p.map_id === map.id).sort((a, b) => a.title.localeCompare(b.title))
            : [];

        return (
            <div className="select-none transition-all duration-200">
                <div 
                    onClick={() => onSelectMap(map)}
                    // MATCHED STYLING FROM MAP MODE
                    className={`flex items-center space-x-2 rounded-xl py-2 pr-3 text-sm font-medium transition-all duration-200 group cursor-pointer relative
                        ${isMapSelected 
                            ? 'bg-amber-900/30 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                            : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-100'
                        }
                    `}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                        {hasChildren ? (
                            <button onClick={(e) => toggleExpand(map.id, e)} className="p-1 hover:text-amber-500 transition-colors focus:outline-none">
                                <Icon name={isExpanded ? "chevron-down" : "chevron-right"} className="w-4 h-4 opacity-70" />
                            </button>
                        ) : (
                             // MATCHED ICON SIZE AND OPACITY
                             <Icon name={iconName} className={`h-4 w-4 opacity-50 ${isMapSelected ? 'text-amber-500' : ''}`} />
                        )}
                    </div>
                    <span className="truncate flex-1">{map.name}</span>
                </div>

                {isMapSelected && mapPins.length > 0 && (
                    <div className="mb-1 mt-1 space-y-0.5">
                        {mapPins.map(pin => (
                            <button 
                                key={pin.id}
                                onClick={() => onSelectPin(pin)}
                                className={`w-full flex items-center gap-2 py-1.5 text-xs text-left rounded-lg transition-colors pl-2
                                    ${selectedPin?.id === pin.id ? 'bg-stone-800 text-amber-500 font-bold' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/30'}
                                `}
                                style={{ paddingLeft: `${level * 12 + 36}px` }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pinTypes.find(t => t.id === pin.pin_type_id)?.color }}></span>
                                <span className="truncate">{pin.title}</span>
                            </button>
                        ))}
                    </div>
                )}
                
                {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1">
                        {children.map(child => (
                            <WikiModeTreeItem key={child.id} map={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // --- Render ---

    const rootMaps = displayMaps.filter(m => !m.parent_map_id || !displayMaps.find(p => p.id === m.parent_map_id)).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <aside className="flex h-full w-full flex-col md:w-80 bg-stone-900/80 backdrop-blur-xl border-r border-stone-700/50 p-4 shadow-2xl z-20">
            <div className="flex items-center gap-3 mb-6 px-1">
                <img src="https://nielskrikke.com/wp-content/uploads/2025/12/maps-app-icon-v2.png" alt="World Atlas" className="w-10 h-10 rounded-xl shadow-lg border border-stone-600/50" />
                <h1 className="text-2xl font-medieval font-bold text-amber-500 drop-shadow-sm">World Atlas</h1>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-stone-800/50 p-1 rounded-xl mb-4">
                <button 
                    onClick={() => onViewChange('map')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${currentView === 'map' ? 'bg-amber-600 text-white shadow-lg' : 'text-stone-400 hover:text-stone-200'}`}
                >
                    <Icon name="map" className="w-4 h-4" />
                    Map
                </button>
                <button 
                    onClick={() => onViewChange('wiki')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${currentView === 'wiki' ? 'bg-amber-600 text-white shadow-lg' : 'text-stone-400 hover:text-stone-200'}`}
                >
                    <Icon name="book" className="w-4 h-4" />
                    Wiki
                </button>
            </div>

            <button 
                onClick={onUserSettingsOpen}
                className="w-full flex items-center space-x-3 rounded-xl bg-stone-800/40 hover:bg-stone-800/80 border border-stone-700/30 hover:border-amber-500/50 p-3 shadow-inner transition-all group text-left"
                title="Profile Settings"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 border border-stone-700 overflow-hidden text-amber-500 group-hover:border-amber-500/50 transition-colors">
                    {user?.profile.image_url ? (
                        <img src={user.profile.image_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="font-medieval font-bold text-lg">{user?.profile.username.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate text-stone-200 group-hover:text-amber-500 transition-colors">{user?.profile.username}</p>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-bold">{user?.profile.role}</p>
                </div>
                <Icon name="settings" className="w-4 h-4 text-stone-600 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
            </button>

            {/* Wiki Search Bar */}
            {currentView === 'wiki' && (
                <div className="mt-4 relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input 
                        type="text" 
                        placeholder="Search wiki..." 
                        value={wikiSearchQuery}
                        onChange={(e) => setWikiSearchQuery(e.target.value)}
                        className="w-full bg-stone-900/50 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-200 focus:border-amber-500 focus:outline-none placeholder-stone-600"
                    />
                </div>
            )}

            <nav className="mt-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
                
                {currentView === 'map' ? (
                    // --- MAP VIEW SIDEBAR CONTENT ---
                    <>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h2 className="text-xs font-medieval tracking-widest text-stone-500 uppercase">Maps</h2>
                        </div>
                        {rootMaps.length > 0 ? (
                            <div className="space-y-1">
                                {rootMaps.map((map) => (
                                    <MapModeTreeItem key={map.id} map={map} level={0} />
                                ))}
                            </div>
                        ) : (
                            <p className="px-3 text-sm text-stone-600 italic">No maps found.</p>
                        )}
                    </>
                ) : (
                    // --- WIKI VIEW SIDEBAR CONTENT ---
                    <>
                         {wikiSearchQuery && (
                             <div className="mb-4">
                                <h3 className="px-3 text-xs font-bold uppercase text-stone-500 mb-2">Search Results</h3>
                                {filteredWikiData.characters.length === 0 && filteredWikiData.maps.length === 0 && (
                                     <p className="px-3 text-sm text-stone-600 italic">No results found.</p>
                                )}
                             </div>
                         )}

                         {/* Characters Section (Show if query matches or no query) */}
                         {(filteredWikiData.characters.length > 0) && (
                            <div className="mb-6">
                                <h3 className="px-3 text-xs font-bold uppercase text-stone-500 mb-2">Characters</h3>
                                {filteredWikiData.characters.map(char => (
                                    <button
                                        key={char.id}
                                        onClick={() => onSelectCharacter(char)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors mb-1 ${selectedCharacter?.id === char.id ? 'bg-amber-900/20 text-amber-400 border border-amber-500/30' : 'hover:bg-stone-800/50 text-stone-300 border border-transparent'}`}
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

                         {/* Locations Section */}
                         {/* If Search Active: Flat List. If Not: Tree */}
                         {(wikiSearchQuery ? filteredWikiData.maps.length > 0 : rootMaps.length > 0) && (
                             <div>
                                <h3 className="px-3 text-xs font-bold uppercase text-stone-500 mb-2">Locations</h3>
                                {wikiSearchQuery ? (
                                    <div>
                                        {filteredWikiData.maps.map(({ map, pins }) => (
                                            <div key={map.id} className="mb-2">
                                                <button 
                                                    onClick={() => onSelectMap(map)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-lg ${selectedMap?.id === map.id ? 'text-amber-400 bg-amber-900/20' : 'text-stone-300 hover:bg-stone-800/50'}`}
                                                >
                                                    <Icon name="map" className="w-4 h-4 opacity-70"/>
                                                    <span className="font-medium truncate">{map.name}</span>
                                                </button>
                                                <div className="pl-4 border-l border-stone-800 ml-4 mt-1 space-y-0.5">
                                                    {pins.map(pin => (
                                                        <button 
                                                            key={pin.id}
                                                            onClick={() => onSelectPin(pin)}
                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs rounded-lg text-stone-400 hover:text-stone-200"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pinTypes.find(t => t.id === pin.pin_type_id)?.color }}></span>
                                                            <span className="truncate">{pin.title}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div>
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
                <div className="mt-4 pt-4 border-t border-stone-800">
                    <h2 className="text-[10px] font-medieval tracking-widest text-stone-600 uppercase px-2 mb-2">DM Controls</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={onDMToolsOpen}
                            className="flex-1 flex items-center justify-center p-3 rounded-xl bg-stone-800/40 hover:bg-stone-700 border border-stone-700/50 hover:border-amber-500/50 text-stone-400 hover:text-amber-500 transition-all group"
                            title="DM Tools & Settings"
                        >
                            <Icon name="view_apps" className="w-7 h-7" />
                        </button>

                        <button 
                            onClick={() => setIsPlayerView(!isPlayerView)}
                            className={`flex-1 flex items-center justify-center p-3 rounded-xl border transition-all ${
                                isPlayerView 
                                ? 'bg-amber-900/20 border-amber-600/50 text-amber-500 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]' 
                                : 'bg-stone-800/40 border-stone-700/50 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                            }`}
                            title={isPlayerView ? "Switch to DM View" : "Switch to Player View"}
                        >
                            <Icon name={isPlayerView ? "visibility" : "visibility_off"} className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            )}
            
            {user?.profile.role === 'Player' && (
                <div className="mt-4 border-t border-stone-800 pt-4">
                    <button onClick={signOut} className="flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-500 hover:bg-red-900/20 hover:text-red-400 transition-colors">
                        <Icon name="logout" className="h-5 w-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
