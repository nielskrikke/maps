
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from '../App';
import { Map as MapType, Pin, PinType } from '../types';
import { supabase } from '../services/supabase';
import Sidebar from './Sidebar';
import MapViewer from './MapViewer';
import PinDetails from './PinDetails';
import { MapManagerModal, PinEditorModal, PinTypeManagerModal } from './Modals';
import { Icon } from './Icons';

type AppContextType = {
    maps: MapType[];
    pinTypes: PinType[];
    pins: Pin[];
    isPlayerView: boolean;
    refreshData: () => Promise<void>;
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
    const [selectedMap, setSelectedMap] = useState<MapType | null>(null);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    
    const [isPlayerView, setIsPlayerView] = useState(user?.profile.role === 'Player');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isMapManagerOpen, setMapManagerOpen] = useState(false);
    const [isPinTypeManagerOpen, setPinTypeManagerOpen] = useState(false);
    const [editingPin, setEditingPin] = useState<Partial<Pin> | null>(null);

    const refreshData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const fetchMaps = supabase.from('maps').select('*');
        const { data: mapsData, error: mapsError } = await (user.profile.role === 'DM' ? fetchMaps : fetchMaps.eq('is_visible', true));

        const { data: pinTypesData, error: pinTypesError } = await supabase.from('pin_types').select('*');

        if (mapsData) setMaps(mapsData);
        if (pinTypesData) setPinTypes(pinTypesData);
        if (mapsError) console.error("Error fetching maps", mapsError);
        if (pinTypesError) console.error("Error fetching pin types", pinTypesError);
        
        setLoading(false);
    }, [user]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    useEffect(() => {
        const fetchMapDetails = async () => {
            if (selectedMap) {
                const fetchPins = supabase.from('pins').select('*, pin_types(*)').eq('map_id', selectedMap.id);
                const { data: pinsData, error: pinsError } = await (user?.profile.role === 'DM' && !isPlayerView ? fetchPins : fetchPins.eq('is_visible', true));

                if (pinsData) setPins(pinsData as Pin[]); // Type assertion due to join
                if (pinsError) console.error(pinsError);
            } else {
                setPins([]);
            }
        };
        fetchMapDetails();
    }, [selectedMap, user, isPlayerView]);


    const handleSelectMap = (map: MapType | null) => {
        setSelectedMap(map);
        setSelectedPin(null);
    };

    const handlePinSave = async () => {
        setEditingPin(null);
        if (selectedMap) {
            const { data } = await supabase.from('pins').select('*, pin_types(*)').eq('map_id', selectedMap.id);
            if(data) setPins(data as Pin[]);
        }
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><Icon name="spinner" className="h-10 w-10 animate-spin text-primary-500" /></div>;
    }
    
    return (
        <AppContext.Provider value={{ maps, pinTypes, pins, isPlayerView, refreshData, setIsPlayerView }}>
            <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden">
                <Sidebar
                    selectedMap={selectedMap}
                    onSelectMap={handleSelectMap}
                    onMapManagerOpen={() => setMapManagerOpen(true)}
                    onPinTypeManagerOpen={() => setPinTypeManagerOpen(true)}
                />
                <main className="relative flex-1 bg-gray-200 dark:bg-gray-800">
                    {selectedMap ? (
                        <MapViewer
                            map={selectedMap}
                            onSelectPin={setSelectedPin}
                            onAddPin={(coords) => setEditingPin({ map_id: selectedMap.id, x_coord: coords.x, y_coord: coords.y })}
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center space-y-4">
                            <Icon name="map" className="h-24 w-24 text-gray-400 dark:text-gray-500" />
                            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Select a map to begin</h2>
                            <p className="text-gray-500 dark:text-gray-400">Choose a map from the sidebar to view its details.</p>
                            {user?.profile.role === 'DM' && (
                                <button onClick={() => setMapManagerOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white shadow-md hover:bg-primary-700">
                                    <Icon name="upload" className="h-5 w-5" /> Manage Maps
                                </button>
                            )}
                        </div>
                    )}
                </main>
                <PinDetails
                    pin={selectedPin}
                    onClose={() => setSelectedPin(null)}
                    onEdit={(pinToEdit) => setEditingPin(pinToEdit)}
                    mapId={selectedMap?.id}
                />

                {user?.profile.role === 'DM' && (
                    <>
                        <MapManagerModal isOpen={isMapManagerOpen} onClose={() => setMapManagerOpen(false)} />
                        <PinTypeManagerModal isOpen={isPinTypeManagerOpen} onClose={() => setPinTypeManagerOpen(false)} />
                        {editingPin && <PinEditorModal pinData={editingPin} onClose={() => setEditingPin(null)} onSave={handlePinSave} />}
                    </>
                )}
            </div>
        </AppContext.Provider>
    );
};

export default Dashboard;