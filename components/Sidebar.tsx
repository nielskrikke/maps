
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { Map as MapType, MapTypeEnum } from '../types';
import { Icon } from './Icons';

interface SidebarProps {
    selectedMap: MapType | null;
    onSelectMap: (map: MapType | null) => void;
    currentView: 'map' | 'wiki';
    onViewChange: (view: 'map' | 'wiki') => void;
    onDMToolsOpen: () => void;
    onUserSettingsOpen: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedMap, onSelectMap, currentView, onViewChange, onDMToolsOpen, onUserSettingsOpen }) => {
    const { user, signOut } = useAuth();
    const { maps, isPlayerView, setIsPlayerView } = useAppContext();
    const [expandedMapIds, setExpandedMapIds] = useState<Set<string>>(new Set());

    // Filter maps based on view mode
    const displayMaps = useMemo(() => {
        if (isPlayerView) {
            return maps.filter(m => m.is_visible);
        }
        return maps;
    }, [maps, isPlayerView]);

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
        if (newSet.has(mapId)) {
            newSet.delete(mapId);
        } else {
            newSet.add(mapId);
        }
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

    const MapTreeItem: React.FC<{ map: MapType, level: number, visited?: Set<string> }> = ({ map, level, visited = new Set() }) => {
        if (visited.has(map.id)) return null;
        const newVisited = new Set(visited).add(map.id);

        // Find children only within the filtered displayMaps list
        const children = displayMaps.filter(m => m.parent_map_id === map.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedMapIds.has(map.id);
        const isSelected = selectedMap?.id === map.id && currentView === 'map';
        const iconName = getMapIconName(map.map_type);

        return (
            <div className="select-none">
                <div 
                    onClick={() => onSelectMap(map)}
                    className={`flex items-center space-x-2 rounded-xl py-2 pr-3 text-sm font-medium transition-all duration-200 group cursor-pointer
                        ${isSelected 
                            ? 'bg-amber-900/30 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                            : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-100'
                        }
                    `}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                        {hasChildren ? (
                            <button 
                                onClick={(e) => toggleExpand(map.id, e)}
                                className="p-1 hover:text-amber-500 transition-colors focus:outline-none"
                            >
                                <Icon name={isExpanded ? "chevron-down" : "chevron-right"} className="w-4 h-4 opacity-70" />
                            </button>
                        ) : (
                            <Icon name={iconName} className={`h-4 w-4 opacity-50 ${isSelected ? 'text-amber-500' : ''}`} />
                        )}
                    </div>
                    <span className="truncate flex-1">{map.name}</span>
                    {!isPlayerView && !map.is_visible && (
                        <Icon name="eye-off" className="w-3 h-3 text-stone-600" title="Hidden from players" />
                    )}
                </div>
                
                {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1">
                        {children.map(child => (
                            <MapTreeItem key={child.id} map={child} level={level + 1} visited={newVisited} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Filter roots based on displayMaps logic
    const rootMaps = displayMaps.filter(m => !m.parent_map_id || !displayMaps.find(p => p.id === m.parent_map_id));

    return (
        <aside className="flex h-full w-full flex-col md:w-80 bg-stone-900/80 backdrop-blur-xl border-r border-stone-700/50 p-4 shadow-2xl z-20">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-medieval font-bold text-amber-500 drop-shadow-sm">D&D World Map</h1>
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

            <nav className="mt-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
                <h2 className="text-xs font-medieval tracking-widest text-stone-500 uppercase px-2 mb-2">Maps</h2>
                {rootMaps.length > 0 ? (
                    <div className="space-y-1">
                        {rootMaps.map((map) => (
                            <MapTreeItem key={map.id} map={map} level={0} />
                        ))}
                    </div>
                ) : (
                    <p className="px-3 text-sm text-stone-600 italic">No maps found.</p>
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
            
            {/* Show Sign Out button in sidebar ONLY for Players. For DMs, it's in the DM Tools modal. */}
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
