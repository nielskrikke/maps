
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { Map as MapType } from '../types';
import { Icon } from './Icons';

interface SidebarProps {
    selectedMap: MapType | null;
    onSelectMap: (map: MapType | null) => void;
    currentView: 'map' | 'wiki';
    onViewChange: (view: 'map' | 'wiki') => void;
    onMapManagerOpen: () => void;
    onPinTypeManagerOpen: () => void;
    onPlayerManagerOpen: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedMap, onSelectMap, currentView, onViewChange, onMapManagerOpen, onPinTypeManagerOpen, onPlayerManagerOpen }) => {
    const { user, signOut } = useAuth();
    const { maps, isPlayerView, setIsPlayerView } = useAppContext();
    const [expandedMapIds, setExpandedMapIds] = useState<Set<string>>(new Set());

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
                const parent = maps.find(m => m.id === current!.parent_map_id);
                if (!parent || parent.id === current.id) break;
                current = parent;
            }
            
            if (changed) {
                setExpandedMapIds(newExpanded);
            }
        }
    }, [selectedMap, maps]);

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

    const MapTreeItem: React.FC<{ map: MapType, level: number, visited?: Set<string> }> = ({ map, level, visited = new Set() }) => {
        if (visited.has(map.id)) return null;
        const newVisited = new Set(visited).add(map.id);

        const children = maps.filter(m => m.parent_map_id === map.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedMapIds.has(map.id);
        const isSelected = selectedMap?.id === map.id && currentView === 'map';

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
                            <Icon name="map" className={`h-4 w-4 opacity-50 ${isSelected ? 'text-amber-500' : ''}`} />
                        )}
                    </div>
                    <span className="truncate flex-1">{map.name}</span>
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

    const rootMaps = maps.filter(m => !m.parent_map_id || !maps.find(p => p.id === m.parent_map_id));

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
                    Codex
                </button>
            </div>

            <div className="flex items-center space-x-3 rounded-xl bg-stone-800/40 border border-stone-700/30 p-3 shadow-inner">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white font-medieval font-bold text-lg shadow-lg">
                    {user?.profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate text-stone-200">{user?.profile.username}</p>
                    <p className="text-xs text-amber-500/80 uppercase tracking-wider font-bold">{user?.profile.role}</p>
                </div>
            </div>

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
                <div className="mt-4 space-y-2 border-t border-stone-800 pt-4">
                    <h2 className="text-xs font-medieval tracking-widest text-stone-500 uppercase px-2">DM Tools</h2>
                    <button onClick={onMapManagerOpen} className="flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-400 hover:bg-stone-800/50 hover:text-stone-100 transition-colors">
                        <Icon name="upload" className="h-5 w-5 text-stone-600" />
                        <span>Manage Maps</span>
                    </button>
                    <button onClick={onPinTypeManagerOpen} className="flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-400 hover:bg-stone-800/50 hover:text-stone-100 transition-colors">
                        <Icon name="tag" className="h-5 w-5 text-stone-600" />
                        <span>Manage Pin Types</span>
                    </button>
                    <button onClick={onPlayerManagerOpen} className="flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-400 hover:bg-stone-800/50 hover:text-stone-100 transition-colors">
                        <Icon name="user" className="h-5 w-5 text-stone-600" />
                        <span>Add New User</span>
                    </button>
                     <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-stone-800/20 mt-2">
                        <label htmlFor="player-view-toggle" className="flex items-center space-x-3 text-sm font-medium text-stone-400">
                           <Icon name={isPlayerView ? 'eye-off' : 'eye'} className="h-5 w-5" />
                           <span>Player View</span>
                        </label>
                        <button
                          id="player-view-toggle"
                          onClick={() => setIsPlayerView(!isPlayerView)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-900 ${isPlayerView ? 'bg-amber-600' : 'bg-stone-700'}`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-stone-200 shadow ring-0 transition duration-200 ease-in-out ${isPlayerView ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            )}
            
            <div className="mt-4 border-t border-stone-800 pt-4">
                <button onClick={signOut} className="flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-500 hover:bg-red-900/20 hover:text-red-400 transition-colors">
                    <Icon name="logout" className="h-5 w-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;