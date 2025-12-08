import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from '../App';
import { Map as MapType, Pin, PinType } from '../types';
import { supabase } from '../services/supabase';
import Sidebar from './Sidebar';
import MapViewer from './MapViewer';
import PinDetails from './PinDetails';
import Wiki from './Wiki';
import { MapManagerModal, PinEditorModal, PinTypeManagerModal, PlayerManagerModal } from './Modals';
import { Icon } from './Icons';

type AppContextType = {
    maps: MapType[];
    pinTypes: PinType[];
    pins: Pin[];
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
    const { user } = useAuth();
    const [maps, setMaps] = useState<MapType[]>([]);
    const [pinTypes, setPinTypes] = useState<PinType[]>([]);
    const [pins, setPins] = useState<Pin[]>([]);
    
    // View State
    const [currentView, setCurrentView] = useState<'map' | 'wiki'>('map');
    const [selectedMap, setSelectedMap] = useState<MapType | null>(null);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    
    // Highlight State (for locating pins from Wiki)
    const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
    
    const [isPlayerView, setIsPlayerView] = useState(user?.profile.role === 'Player');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isMapManagerOpen, setMapManagerOpen] = useState(false);
    const [isPinTypeManagerOpen, setPinTypeManagerOpen] = useState(false);
    const [isPlayerManagerOpen, setPlayerManagerOpen] = useState(false);
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

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-stone-950"><Icon name="spinner" className="h-10 w-10 animate-spin text-amber-500" /></div>;
    }
    
    return (
        <AppContext.Provider value={{ maps, pinTypes, pins, isPlayerView, refreshData, setIsPlayerView }}>
            <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-stone-950 text-stone-200">
                <Sidebar
                    selectedMap={selectedMap}
                    onSelectMap={handleSelectMap}
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    onMapManagerOpen={() => setMapManagerOpen(true)}
                    onPinTypeManagerOpen={() => setPinTypeManagerOpen(true)}
                    onPlayerManagerOpen={() => setPlayerManagerOpen(true)}
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
                                            setEditingPin({ ...coords, map_id: selectedMap.id });
                                            setHighlightedPinId(null);
                                        }
                                    }}
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
                            />
                        </>
                    ) : (
                        <Wiki 
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

                    {isMapManagerOpen && <MapManagerModal isOpen={isMapManagerOpen} onClose={() => setMapManagerOpen(false)} />}
                    {isPinTypeManagerOpen && <PinTypeManagerModal isOpen={isPinTypeManagerOpen} onClose={() => setPinTypeManagerOpen(false)} />}
                    {isPlayerManagerOpen && <PlayerManagerModal isOpen={isPlayerManagerOpen} onClose={() => setPlayerManagerOpen(false)} />}
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