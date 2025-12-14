
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from '../App';
import { Map as MapType, Pin, PinType, Character } from '../types';
import { supabase } from '../services/supabase';
import Sidebar from './Sidebar';
import MapViewer from './MapViewer';
import PinDetails from './PinDetails';
import Wiki from './Wiki';
import { MapManagerModal, PinEditorModal, PinTypeManagerModal, PlayerManagerModal, CharacterManagerModal, DMToolsModal, UserSettingsModal } from './Modals';
import { Icon } from './Icons';

type AppContextType = {
    maps: MapType[];
    pinTypes: PinType[];
    pins: Pin[];
    characters: Character[];
    isPlayerView: boolean;
    refreshData: (silent?: boolean) => Promise<void>;
    setIsPlayerView: React.Dispatch<React.SetStateAction<boolean>>;
    // Performance: Local Updaters to avoid full refetch
    updateLocalPin: (pin: Pin) => void;
    updateLocalMap: (map: MapType) => void;
    updateLocalCharacter: (char: Character) => void;
    updateLocalPinType: (pt: PinType) => void;
    removeLocalItem: (type: 'map'|'pin'|'character'|'pintype', id: string) => void;
};

const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppContextProvider');
    return context;
};

const Dashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const [maps, setMaps] = useState<MapType[]>([]);
    const [pinTypes, setPinTypes] = useState<PinType[]>([]);
    const [pins, setPins] = useState<Pin[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    
    // View State
    const [currentView, setCurrentView] = useState<'map' | 'wiki'>('map');
    
    // Unified Selection State
    const [selectedMap, setSelectedMap] = useState<MapType | null>(null);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

    // Highlight State (for locating pins from Wiki)
    const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
    
    const [isPlayerView, setIsPlayerView] = useState(user?.profile.role === 'Player');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isDMToolsOpen, setDMToolsOpen] = useState(false);
    const [isMapManagerOpen, setMapManagerOpen] = useState(false);
    const [isPinTypeManagerOpen, setPinTypeManagerOpen] = useState(false);
    const [isPlayerManagerOpen, setPlayerManagerOpen] = useState(false);
    const [isCharacterManagerOpen, setCharacterManagerOpen] = useState(false);
    const [isUserSettingsOpen, setUserSettingsOpen] = useState(false);
    const [editingPin, setEditingPin] = useState<Partial<Pin> | null>(null);

    useEffect(() => {
        if (user) {
            setIsPlayerView(user.profile.role === 'Player');
        }
    }, [user?.id]);

    const refreshData = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);

        const isDM = user.profile.role === 'DM';

        // Parallel Fetching for Performance
        const promises = [
            // 1. Maps (Sorted Alphabetically by name)
            isDM 
                ? supabase.from('maps').select('*').order('name', {ascending: true}) 
                : supabase.from('maps').select('*').eq('is_visible', true).order('name', {ascending: true}),
            // 2. Pin Types
            supabase.from('pin_types').select('*').order('name', {ascending: true}),
            // 3. Pins (Sorted Alphabetically by title)
            (isDM && !isPlayerView) 
                ? supabase.from('pins').select('*, pin_types(*)').order('title', {ascending: true}) 
                : supabase.from('pins').select('*, pin_types(*)').eq('is_visible', true).order('title', {ascending: true}),
            // 4. Characters (Sorted Alphabetically by name)
            supabase.from('characters').select('*').order('name', {ascending: true})
        ];

        const [mapsRes, pinTypesRes, pinsRes, charsRes] = await Promise.all(promises);

        if (mapsRes.data) setMaps(mapsRes.data);
        if (pinTypesRes.data) setPinTypes(pinTypesRes.data);
        if (pinsRes.data) setPins(pinsRes.data as Pin[]);
        if (charsRes.data) setCharacters(charsRes.data as Character[]);

        // Errors
        if (mapsRes.error) console.error("Maps error", mapsRes.error);
        if (pinsRes.error) console.error("Pins error", pinsRes.error);
        
        if (!silent) setLoading(false);
    }, [user, isPlayerView]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // --- Performance: Local Updaters ---
    const updateLocalPin = (pin: Pin) => {
        setPins(prev => {
            const idx = prev.findIndex(p => p.id === pin.id);
            let newPins = [...prev];
            if (idx >= 0) {
                newPins[idx] = pin;
            } else {
                newPins.push(pin);
            }
            // Maintain alphabetical sort
            return newPins.sort((a, b) => a.title.localeCompare(b.title));
        });
        // Also update selected pin if it matches
        if (selectedPin?.id === pin.id) setSelectedPin(pin);
    };

    const updateLocalMap = (map: MapType) => {
        setMaps(prev => {
            const idx = prev.findIndex(m => m.id === map.id);
            let newMaps = [...prev];
            if (idx >= 0) {
                newMaps[idx] = map;
            } else {
                newMaps.push(map);
            }
            // Maintain alphabetical sort
            return newMaps.sort((a, b) => a.name.localeCompare(b.name));
        });
        if (selectedMap?.id === map.id) setSelectedMap(map);
    };

    const updateLocalCharacter = (char: Character) => {
        setCharacters(prev => {
            const idx = prev.findIndex(c => c.id === char.id);
            let newChars = [...prev];
            if (idx >= 0) {
                newChars[idx] = char;
            } else {
                newChars.push(char);
            }
            // Maintain alphabetical sort
            return newChars.sort((a, b) => a.name.localeCompare(b.name));
        });
    };

    const updateLocalPinType = (pt: PinType) => {
        setPinTypes(prev => {
            const idx = prev.findIndex(p => p.id === pt.id);
            if (idx >= 0) {
                const newPt = [...prev];
                newPt[idx] = pt;
                return newPt;
            }
            return [...prev, pt];
        });
    };

    const removeLocalItem = (type: 'map'|'pin'|'character'|'pintype', id: string) => {
        if(type === 'map') setMaps(prev => prev.filter(m => m.id !== id));
        if(type === 'pin') setPins(prev => prev.filter(p => p.id !== id));
        if(type === 'character') setCharacters(prev => prev.filter(c => c.id !== id));
        if(type === 'pintype') setPinTypes(prev => prev.filter(p => p.id !== id));
    };

    // ------------------------------------

    const handleSelectMap = (map: MapType | null) => {
        setSelectedMap(map);
        setSelectedPin(null);
        setSelectedCharacter(null);
        setHighlightedPinId(null);
    };

    const handleSelectPin = (pin: Pin | null) => {
        setSelectedPin(pin);
        setSelectedCharacter(null);
        // If selecting a pin, we implicitly keep the map selected or select the parent map
        if (pin) {
            const parentMap = maps.find(m => m.id === pin.map_id);
            if(parentMap) setSelectedMap(parentMap);
        }
        setHighlightedPinId(null);
    };

    const handleSelectCharacter = (char: Character | null) => {
        setSelectedCharacter(char);
        setSelectedPin(null);
        setSelectedMap(null);
    };

    const handlePinSave = async (savedPin?: Pin) => {
        setEditingPin(null);
        if (savedPin) {
            updateLocalPin(savedPin);
        } else {
            await refreshData(true);
        }
    };
    
    const handleMovePin = async (pinId: string, x: number, y: number) => {
        // Optimistic update
        setPins(prev => prev.map(p => p.id === pinId ? { ...p, x_coord: x, y_coord: y } : p));
        
        const { error } = await supabase.from('pins').update({ x_coord: x, y_coord: y }).eq('id', pinId);
        if (error) {
            console.error("Error moving pin:", error);
            refreshData(true); // Only fetch on error
        }
    };
    
    // Called when clicking "Open in Wiki" from a character modal
    const handleOpenWikiCharacter = (charId: string) => {
        const char = characters.find(c => c.id === charId);
        if (char) {
            setSelectedCharacter(char);
            setSelectedMap(null);
            setSelectedPin(null);
            setCurrentView('wiki');
        }
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-stone-950"><Icon name="spinner" className="h-10 w-10 animate-spin text-amber-500" /></div>;
    }
    
    return (
        <AppContext.Provider value={{ 
            maps, pinTypes, pins, characters, isPlayerView, refreshData, setIsPlayerView,
            updateLocalPin, updateLocalMap, updateLocalCharacter, updateLocalPinType, removeLocalItem
        }}>
            <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-stone-950 text-stone-200">
                <Sidebar
                    selectedMap={selectedMap}
                    selectedPin={selectedPin}
                    selectedCharacter={selectedCharacter}
                    onSelectMap={handleSelectMap}
                    onSelectPin={handleSelectPin}
                    onSelectCharacter={handleSelectCharacter}
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    onDMToolsOpen={() => setDMToolsOpen(true)}
                    onUserSettingsOpen={() => setUserSettingsOpen(true)}
                />
                <main className="relative flex-1 bg-stone-950 overflow-hidden">
                    {currentView === 'map' ? (
                        <>
                            {selectedMap ? (
                                <MapViewer
                                    map={selectedMap}
                                    onSelectPin={(pin) => {
                                        setSelectedPin(pin);
                                        setHighlightedPinId(null); 
                                    }}
                                    onAddPin={(coords) => {
                                        if (user?.profile.role === 'DM' && !isPlayerView) {
                                            setEditingPin({ x_coord: coords.x, y_coord: coords.y, map_id: selectedMap.id });
                                            setHighlightedPinId(null);
                                        }
                                    }}
                                    onMovePin={handleMovePin}
                                    highlightedPinId={highlightedPinId}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-stone-500">
                                    <div className="text-center">
                                        <Icon name="map" className="mx-auto h-16 w-16 opacity-30 mb-4" />
                                        <p className="text-lg font-medieval">Select a map to begin</p>
                                    </div>
                                </div>
                            )}
                            <PinDetails 
                                pin={selectedPin} 
                                onClose={() => setSelectedPin(null)} 
                                onEdit={(pin) => setEditingPin(pin)}
                                mapId={selectedMap?.id}
                                onOpenWiki={handleOpenWikiCharacter}
                            />
                        </>
                    ) : (
                        <Wiki 
                            selectedMap={selectedMap}
                            selectedPin={selectedPin}
                            selectedCharacter={selectedCharacter}
                            onSelectMap={(map) => {
                                setSelectedMap(map);
                                setCurrentView('map');
                            }}
                            onLocatePin={(pin) => {
                                const map = maps.find(m => m.id === pin.map_id);
                                if(map) {
                                    setSelectedMap(map);
                                    setHighlightedPinId(pin.id); 
                                    setSelectedPin(null); 
                                    setCurrentView('map');
                                }
                            }}
                        />
                    )}

                    {isDMToolsOpen && (
                        <DMToolsModal 
                            isOpen={isDMToolsOpen}
                            onClose={() => setDMToolsOpen(false)}
                            onMapManagerOpen={() => setMapManagerOpen(true)}
                            onCharacterManagerOpen={() => setCharacterManagerOpen(true)}
                            onPinTypeManagerOpen={() => setPinTypeManagerOpen(true)}
                            onPlayerManagerOpen={() => setPlayerManagerOpen(true)}
                            onSignOut={() => signOut()}
                        />
                    )}

                    {isMapManagerOpen && <MapManagerModal isOpen={isMapManagerOpen} onClose={() => setMapManagerOpen(false)} />}
                    {isPinTypeManagerOpen && <PinTypeManagerModal isOpen={isPinTypeManagerOpen} onClose={() => setPinTypeManagerOpen(false)} />}
                    {isPlayerManagerOpen && <PlayerManagerModal isOpen={isPlayerManagerOpen} onClose={() => setPlayerManagerOpen(false)} />}
                    {isCharacterManagerOpen && <CharacterManagerModal isOpen={isCharacterManagerOpen} onClose={() => setCharacterManagerOpen(false)} />}
                    {isUserSettingsOpen && <UserSettingsModal isOpen={isUserSettingsOpen} onClose={() => setUserSettingsOpen(false)} />}
                    {editingPin && (
                        <PinEditorModal 
                            pinData={editingPin} 
                            onClose={() => setEditingPin(null)} 
                            onSave={handlePinSave} 
                        />
                    )}
                </main>
            </div>
        </AppContext.Provider>
    );
};

export default Dashboard;
