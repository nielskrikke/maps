
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../App';
import { Map as MapType, Pin, PinType, Character } from '../types';
import { supabase } from '../services/supabase';
import Sidebar from './Sidebar';
import MapViewer from './MapViewer';
import PinDetails from './PinDetails';
import Wiki from './Wiki';
import { MapManagerModal, PinEditorModal, PinTypeManagerModal, PlayerManagerModal, CharacterManagerModal, DMToolsModal, UserSettingsModal } from './Modals';
import { Icon } from './Icons';
import { AppContext } from '../contexts/AppContext';

const Dashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const [maps, setMaps] = useState<MapType[]>([]);
    const [pinTypes, setPinTypes] = useState<PinType[]>([]);
    const [pins, setPins] = useState<Pin[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [error, setError] = useState<{ message: string; details?: any } | null>(null);
    
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

        // Optimization: Don't fetch image_url in the initial list to avoid timeouts
        const mapsQuery = supabase.from('maps').select('id, name, is_visible, created_at, created_by, parent_map_id, map_type, grid_size, pin_scale, is_grid_visible').order('name', {ascending: true});
        if (!isDM) mapsQuery.eq('is_visible', true);

        const promises = [
            mapsQuery,
            supabase.from('pin_types').select('*').order('name', {ascending: true}),
            (isDM && !isPlayerView) 
                ? supabase.from('pins').select('*, pin_types(*)').order('title', {ascending: true}) 
                : supabase.from('pins').select('*, pin_types(*)').eq('is_visible', true).order('title', {ascending: true}),
            supabase.from('characters').select('*').order('name', {ascending: true})
        ];

        const [mapsRes, pinTypesRes, pinsRes, charsRes] = await Promise.all(promises);
        
        if (mapsRes.error) setError({ message: "Maps error", details: mapsRes.error });
        if (pinsRes.error) setError({ message: "Pins error", details: pinsRes.error });
        if (pinTypesRes.error) setError({ message: "Pin Types error", details: pinTypesRes.error });
        if (charsRes.error) setError({ message: "Characters error", details: charsRes.error });

        if (mapsRes.data) setMaps(mapsRes.data as MapType[]);
        if (pinTypesRes.data) setPinTypes(pinTypesRes.data);
        if (pinsRes.data) setPins(pinsRes.data as Pin[]);
        if (charsRes.data) setCharacters(charsRes.data as Character[]);

        if (mapsRes.error) console.error("Maps error", mapsRes.error);
        if (pinsRes.error) console.error("Pins error", pinsRes.error);
        
        if (!silent) setLoading(false);
    }, [user, isPlayerView]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const updateLocalPin = (pin: Pin) => {
        setPins(prev => {
            const idx = prev.findIndex(p => p.id === pin.id);
            let newPins = [...prev];
            if (idx >= 0) {
                newPins[idx] = pin;
            } else {
                newPins.push(pin);
            }
            return newPins.sort((a, b) => a.title.localeCompare(b.title));
        });
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

    const handleSelectMap = async (map: MapType | null) => {
        if (map && !map.image_url) {
            // Fetch full map data including image_url when selected
            const { data, error } = await supabase.from('maps').select('*').eq('id', map.id).single();
            if (data) {
                updateLocalMap(data);
                setSelectedMap(data);
            } else if (error) {
                console.error("Error fetching full map data:", error);
            }
        } else {
            setSelectedMap(map);
        }
        setSelectedPin(null);
        setSelectedCharacter(null);
        setHighlightedPinId(null);
    };

    const handleSelectPin = (pin: Pin | null) => {
        setSelectedPin(pin);
        setSelectedCharacter(null);
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
        setPins(prev => prev.map(p => p.id === pinId ? { ...p, x_coord: x, y_coord: y } : p));
        const { error } = await supabase.from('pins').update({ x_coord: x, y_coord: y }).eq('id', pinId);
        if (error) {
            console.error("Error moving pin:", error);
            refreshData(true);
        }
    };
    
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
        return (
            <div className="flex h-screen w-full items-center justify-center bg-dnd-dark">
                <Icon name="spinner" className="h-12 w-12 animate-spin text-dnd-gold" />
            </div>
        );
    }
    
    return (
        <AppContext.Provider value={{ 
            maps, pinTypes, pins, characters, isPlayerView, error, setError, refreshData, setIsPlayerView,
            updateLocalPin, updateLocalMap, updateLocalCharacter, updateLocalPinType, removeLocalItem
        }}>
            <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-dnd-dark text-dnd-text">
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
                        >
                            <div className="bg-dnd-red/90 backdrop-blur-xl border border-dnd-red/30 p-4 rounded-2xl shadow-2xl flex items-start gap-4">
                                <div className="p-2 bg-dnd-red/20 rounded-xl text-white">
                                    <Icon name="skull" className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold text-sm tracking-tight">{error.message}</h4>
                                    <p className="text-white/70 text-xs mt-1 font-medium leading-relaxed truncate">
                                        {typeof error.details === 'string' ? error.details : (error.details?.message || "An unexpected disturbance in the weave occurred.")}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setError(null)}
                                    className="p-1 text-white/40 hover:text-white transition-colors"
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                <main className="relative flex-1 p-2 md:p-4 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentView}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full w-full glass-panel overflow-hidden relative"
                        >
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
                                        <div className="flex h-full w-full items-center justify-center text-dnd-text/30">
                                            <div className="text-center">
                                                <Icon name="map" className="mx-auto h-24 w-24 opacity-10 mb-6" />
                                                <h2 className="text-3xl font-serif mb-2">Atlas</h2>
                                                <p className="text-lg">Select a map from the sidebar to begin your exploration</p>
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
                        </motion.div>
                    </AnimatePresence>

                    {/* Modals */}
                    <AnimatePresence>
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
                    </AnimatePresence>
                </main>
            </div>
        </AppContext.Provider>
    );
};

export default Dashboard;
