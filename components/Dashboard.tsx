
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
    const [selectedMap, setSelectedMap] = useState<MapType | null>(null);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    
    // Wiki Target State (for deep linking)
    const [wikiTarget, setWikiTarget] = useState<{ type: 'character' | 'map', id: string } | null>(null);

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

        const fetchMaps = supabase.from('maps').select('*');
        const { data: mapsData, error: mapsError } = await (user.profile.role === 'DM' ? fetchMaps : fetchMaps.eq('is_visible', true));

        const { data: pinTypesData, error: pinTypesError } = await supabase.from('pin_types').select('*');

        if (mapsData) setMaps(mapsData);
        if (pinTypesData) setPinTypes(pinTypesData);
        if (mapsError) console.error("Error fetching maps", mapsError);
        if (pinTypesError) console.error("Error fetching pin types", pinTypesError);
        
        // Fetch ALL pins for the wiki search, but map viewer filters by selected map
        const fetchPins = supabase.from('pins').select('*, pin_types(*)');
        const { data: pinsData, error: pinsError } = await (user.profile.role === 'DM' && !isPlayerView ? fetchPins : fetchPins.eq('is_visible', true));
        if (pinsData) setPins(pinsData as Pin[]);

        // Fetch Characters
        const { data: charData, error: charError } = await supabase.from('characters').select('*');
        if (charData) setCharacters(charData as Character[]);
        if (charError) {
             // Swallow error if table doesn't exist yet to prevent app crash on older DBs
             if(charError.code !== '42P01') console.error("Error fetching characters", charError);
        }
        
        if (!silent) setLoading(false);
    }, [user, isPlayerView]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleSelectMap = (map: MapType | null) => {
        setSelectedMap(map);
        setSelectedPin(null);
        setHighlightedPinId(null);
        setCurrentView('map'); // Switch to map view when selecting from sidebar
    };

    const handlePinSave = async () => {
        setEditingPin(null);
        await refreshData(true);
    };
    
    const handleMovePin = async (pinId: string, x: number, y: number) => {
        // Optimistic update
        setPins(prev => prev.map(p => p.id === pinId ? { ...p, x_coord: x, y_coord: y } : p));
        
        const { error } = await supabase.from('pins').update({ x_coord: x, y_coord: y }).eq('id', pinId);
        if (error) {
            console.error("Error moving pin:", error);
            // Revert on error
            refreshData(true);
        }
    };
    
    const handleOpenWikiCharacter = (charId: string) => {
        setWikiTarget({ type: 'character', id: charId });
        setCurrentView('wiki');
        setSelectedPin(null); // Close pin details
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-stone-950"><Icon name="spinner" className="h-10 w-10 animate-spin text-amber-500" /></div>;
    }
    
    return (
        <AppContext.Provider value={{ maps, pinTypes, pins, characters, isPlayerView, refreshData, setIsPlayerView }}>
            <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-stone-950 text-stone-200">
                <Sidebar
                    selectedMap={selectedMap}
                    onSelectMap={handleSelectMap}
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
                                        setHighlightedPinId(null); // Clear highlight on user interaction
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
                            target={wikiTarget}
                            onSelectMap={(map) => handleSelectMap(map)}
                            onLocatePin={(pin) => {
                                const map = maps.find(m => m.id === pin.map_id);
                                if(map) {
                                    setSelectedMap(map);
                                    setHighlightedPinId(pin.id); // Set the highlight
                                    setSelectedPin(null); // Ensure detail view is closed
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
