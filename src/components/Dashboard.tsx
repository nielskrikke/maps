
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { Map as MapType, Pin, PinType, Character, WikiPage, MapLabel, Clock } from '../types';
import { supabase } from '../services/supabase';
import Sidebar from './Sidebar';
import MapViewer from './MapViewer';
import PinDetails from './PinDetails';
import Wiki from './Wiki';
import { MapManagerModal, PinEditorModal, PinTypeManagerModal, PlayerManagerModal, CharacterManagerModal, DMToolsModal, UserSettingsModal, WikiPageManagerModal, LabelEditorModal, ClockManagerModal } from './Modals';
import { Icon } from './Icons';
import { AppContext } from '../contexts/AppContext';

const Dashboard: React.FC = () => {
    const { user, signOut } = useAuth();
    const [maps, setMaps] = useState<MapType[]>([]);
    const [pinTypes, setPinTypes] = useState<PinType[]>([]);
    const [pins, setPins] = useState<Pin[]>([]);
    const [labels, setLabels] = useState<MapLabel[]>([]);
    const [clocks, setClocks] = useState<Clock[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
    const [error, setError] = useState<{ message: string; details?: any } | null>(null);
    
    // View State
    const [currentView, setCurrentView] = useState<'map' | 'wiki'>('map');
    
    // Unified Selection State
    const [selectedMap, setSelectedMap] = useState<MapType | null>(null);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [selectedWikiPage, setSelectedWikiPage] = useState<WikiPage | null>(null);
    const [expandedWikiSection, setExpandedWikiSection] = useState<'wiki' | 'characters' | 'locations'>('wiki');

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
    const [isWikiPageManagerOpen, setWikiPageManagerOpen] = useState(false);
    const [isWikiPageTypeManagerOpen, setWikiPageTypeManagerOpen] = useState(false);
    const [isClockManagerOpen, setClockManagerOpen] = useState(false);
    const [isUserSettingsOpen, setUserSettingsOpen] = useState(false);
    const [editingPin, setEditingPin] = useState<Partial<Pin> | null>(null);
    const [editingLabel, setEditingLabel] = useState<Partial<MapLabel> | null>(null);
    const [wikiPageToEdit, setWikiPageToEdit] = useState<WikiPage | null>(null);
    const [characterToEdit, setCharacterToEdit] = useState<Character | null>(null);

    useEffect(() => {
        if (user) {
            setIsPlayerView(user.profile.role === 'Player');
        }
    }, [user?.id]);

    const refreshData = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);

        const isDM = user.profile.role === 'DM';

        // Fetch all fields including image_url to ensure MapViewer works correctly and supports pre-loading
        const mapsQuery = supabase.from('maps').select('*').order('name', {ascending: true});
        if (!isDM) mapsQuery.eq('is_visible', true);

        const promises = [
            mapsQuery,
            supabase.from('pin_types').select('*').order('name', {ascending: true}),
            (isDM && !isPlayerView) 
                ? supabase.from('pins').select('*, pin_types(*)').order('title', {ascending: true}) 
                : supabase.from('pins').select('*, pin_types(*)').eq('is_visible', true).order('title', {ascending: true}),
            supabase.from('characters').select('*').order('name', {ascending: true}),
            (isDM && !isPlayerView)
                ? supabase.from('wiki_pages').select('*').order('title', {ascending: true})
                : supabase.from('wiki_pages').select('*').eq('is_visible', true).order('title', {ascending: true}),
            (isDM && !isPlayerView)
                ? supabase.from('map_labels').select('*')
                : supabase.from('map_labels').select('*').eq('is_visible', true),
            (isDM && !isPlayerView)
                ? supabase.from('progress_clocks').select('*').order('created_at', { ascending: false })
                : null
        ].filter(Boolean);

        const [mapsRes, pinTypesRes, pinsRes, charsRes, wikiPagesRes, labelsRes, clocksRes] = await Promise.all(promises);
        
        if (mapsRes.error) setError({ message: "Maps error", details: mapsRes.error });
        if (pinsRes.error) setError({ message: "Pins error", details: pinsRes.error });
        if (labelsRes.error) {
             console.error("Labels error", labelsRes.error);
             // Table might not exist yet if user hasn't run migration
        }
        if (clocksRes && clocksRes.error) {
             console.error("Clocks error", clocksRes.error);
        }
        if (pinTypesRes.error) setError({ message: "Pin Types error", details: pinTypesRes.error });
        if (charsRes.error) setError({ message: "Characters error", details: charsRes.error });
        if (wikiPagesRes.error) {
            console.error("Wiki Pages error", wikiPagesRes.error);
            if (wikiPagesRes.error.code === '42P01') {
                setError({ 
                    message: "Wiki table missing", 
                    details: "The 'wiki_pages' table does not exist in your database. Please run the SQL setup script provided in the instructions." 
                });
            } else {
                setError({ message: "Wiki Pages error", details: wikiPagesRes.error });
            }
        }

        if (mapsRes.data) setMaps(mapsRes.data as MapType[]);
        if (pinTypesRes.data) setPinTypes(pinTypesRes.data);
        if (pinsRes.data) setPins(pinsRes.data as Pin[]);
        if (charsRes.data) setCharacters(charsRes.data as Character[]);
        if (wikiPagesRes.data) setWikiPages(wikiPagesRes.data as WikiPage[]);
        if (labelsRes.data) setLabels(labelsRes.data as MapLabel[]);
        if (clocksRes && clocksRes.data) setClocks(clocksRes.data as Clock[]);

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

    const updateLocalLabel = (label: MapLabel) => {
        setLabels(prev => {
            const idx = prev.findIndex(l => l.id === label.id);
            let newLabels = [...prev];
            if (idx >= 0) {
                newLabels[idx] = label;
            } else {
                newLabels.push(label);
            }
            return newLabels;
        });
    };

    const updateLocalClock = (clock: Clock) => {
        setClocks(prev => {
            const idx = prev.findIndex(c => c.id === clock.id);
            let newClocks = [...prev];
            if (idx >= 0) {
                newClocks[idx] = clock;
            } else {
                newClocks.push(clock);
            }
            return newClocks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
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

    const updateLocalWikiPage = (page: WikiPage) => {
        setWikiPages(prev => {
            const idx = prev.findIndex(p => p.id === page.id);
            let newPages = [...prev];
            if (idx >= 0) {
                newPages[idx] = page;
            } else {
                newPages.push(page);
            }
            return newPages.sort((a, b) => a.title.localeCompare(b.title));
        });
    };

    const removeLocalItem = (type: 'map'|'pin'|'character'|'pintype'|'wikipage'|'label'|'clock', id: string) => {
        if(type === 'map') setMaps(prev => prev.filter(m => m.id !== id));
        if(type === 'pin') setPins(prev => prev.filter(p => p.id !== id));
        if(type === 'character') setCharacters(prev => prev.filter(c => c.id !== id));
        if(type === 'pintype') setPinTypes(prev => prev.filter(p => p.id !== id));
        if(type === 'wikipage') setWikiPages(prev => prev.filter(p => p.id !== id));
        if(type === 'label') setLabels(prev => prev.filter(l => l.id !== id));
        if(type === 'clock') setClocks(prev => prev.filter(c => c.id !== id));
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

    const handleSelectWikiPage = (page: WikiPage | null) => {
        setSelectedWikiPage(page);
        if (page) {
            setSelectedMap(null);
            setSelectedPin(null);
            setSelectedCharacter(null);
            setCurrentView('wiki');
        }
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

    const handleMoveLabel = async (labelId: string, x: number, y: number) => {
        setLabels(prev => prev.map(l => l.id === labelId ? { ...l, x_coord: x, y_coord: y } : l));
        const { error } = await supabase.from('map_labels').update({ x_coord: x, y_coord: y }).eq('id', labelId);
        if (error) {
            console.error("Error moving label:", error);
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
            maps, pinTypes, pins, labels, clocks, characters, wikiPages, isPlayerView, error, setError, refreshData, setIsPlayerView,
            updateLocalPin, updateLocalMap, updateLocalLabel, updateLocalClock, updateLocalCharacter, updateLocalPinType, updateLocalWikiPage, removeLocalItem,
            expandedWikiSection, setExpandedWikiSection
        }}>
            <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-dnd-dark text-dnd-text">
                {error && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
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
                    </div>
                )}
                
                {/* Background Map Preloader */}
                <div className="fixed -z-50 invisible pointer-events-none opacity-0 h-0 w-0 overflow-hidden">
                    {maps.map(map => (
                        <img key={`preload-${map.id}`} src={map.image_url} alt="" referrerPolicy="no-referrer" />
                    ))}
                </div>

                <Sidebar
                    selectedMap={selectedMap}
                    selectedPin={selectedPin}
                    selectedCharacter={selectedCharacter}
                    selectedWikiPage={selectedWikiPage}
                    onSelectMap={handleSelectMap}
                    onSelectPin={handleSelectPin}
                    onSelectCharacter={handleSelectCharacter}
                    onSelectWikiPage={handleSelectWikiPage}
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    onDMToolsOpen={() => setDMToolsOpen(true)}
                    onUserSettingsOpen={() => setUserSettingsOpen(true)}
                />
                <main className="relative flex-1 p-2 md:p-4 overflow-hidden">
                    <div className="h-full w-full glass-panel overflow-hidden relative">
                        {currentView === 'map' ? (
                            <>
                                {selectedMap ? (
                                    <MapViewer
                                        map={selectedMap}
                                        onSelectPin={(pin) => {
                                            setSelectedPin(pin);
                                            setHighlightedPinId(null); 
                                        }}
                                        onSelectLabel={(label) => {
                                            if (user?.profile.role === 'DM' && !isPlayerView) {
                                                setEditingLabel(label);
                                            }
                                        }}
                                        onAddPin={(coords) => {
                                            if (user?.profile.role === 'DM' && !isPlayerView) {
                                                setEditingPin({ x_coord: coords.x, y_coord: coords.y, map_id: selectedMap.id });
                                                setHighlightedPinId(null);
                                            }
                                        }}
                                        onAddLabel={(coords) => {
                                            if (user?.profile.role === 'DM' && !isPlayerView) {
                                                setEditingLabel({ x_coord: coords.x, y_coord: coords.y, map_id: selectedMap.id, font_size: 24, color: '#e5c983' });
                                            }
                                        }}
                                        onMovePin={handleMovePin}
                                        onMoveLabel={handleMoveLabel}
                                        highlightedPinId={highlightedPinId}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-dnd-text/30">
                                        <div className="text-center">
                                            <Icon name="map" className="mx-auto h-24 w-24 opacity-10 mb-6" />
                                            <h2 className="text-3xl font-serif font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#e5c983] to-[#8a7238] drop-shadow-2xl uppercase mb-2">
                                                ATLAS
                                            </h2>
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
                                    onOpenWikiPage={(pageId) => {
                                        const page = wikiPages.find(p => p.id === pageId);
                                        if (page) handleSelectWikiPage(page);
                                    }}
                                />
                            </>
                        ) : (
                            <Wiki 
                                selectedMap={selectedMap}
                                selectedPin={selectedPin}
                                selectedCharacter={selectedCharacter}
                                selectedWikiPage={selectedWikiPage}
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
                                onSelectWikiPage={handleSelectWikiPage}
                                onSelectCharacter={handleSelectCharacter}
                                onSelectPin={handleSelectPin}
                                onEditWikiPage={(page) => {
                                    setWikiPageToEdit(page);
                                    setWikiPageManagerOpen(true);
                                }}
                                onEditCharacter={(char) => {
                                    setCharacterToEdit(char);
                                    setCharacterManagerOpen(true);
                                }}
                                onEditPin={(pin) => {
                                    setEditingPin(pin);
                                }}
                                onHome={() => {
                                    setSelectedMap(null);
                                    setSelectedPin(null);
                                    setSelectedCharacter(null);
                                    setSelectedWikiPage(null);
                                    setHighlightedPinId(null);
                                }}
                            />
                        )}
                    </div>

                    {/* Modals */}
                    {isDMToolsOpen && (
                        <DMToolsModal 
                            isOpen={isDMToolsOpen}
                            onClose={() => setDMToolsOpen(false)}
                            onMapManagerOpen={() => setMapManagerOpen(true)}
                            onCharacterManagerOpen={() => setCharacterManagerOpen(true)}
                            onPinTypeManagerOpen={() => setPinTypeManagerOpen(true)}
                            onWikiPageManagerOpen={() => setWikiPageManagerOpen(true)}
                            onPlayerManagerOpen={() => setPlayerManagerOpen(true)}
                            onClockManagerOpen={() => setClockManagerOpen(true)}
                            onSignOut={() => signOut()}
                        />
                    )}

                    {isMapManagerOpen && <MapManagerModal isOpen={isMapManagerOpen} onClose={() => setMapManagerOpen(false)} />}
                    {isPinTypeManagerOpen && <PinTypeManagerModal isOpen={isPinTypeManagerOpen} onClose={() => setPinTypeManagerOpen(false)} />}
                    {isClockManagerOpen && <ClockManagerModal isOpen={isClockManagerOpen} onClose={() => setClockManagerOpen(false)} />}
                    {isPlayerManagerOpen && <PlayerManagerModal isOpen={isPlayerManagerOpen} onClose={() => setPlayerManagerOpen(false)} />}
                    {isCharacterManagerOpen && (
                        <CharacterManagerModal 
                            isOpen={isCharacterManagerOpen} 
                            onClose={() => {
                                setCharacterManagerOpen(false);
                                setCharacterToEdit(null);
                            }} 
                            initialEditItem={characterToEdit}
                        />
                    )}
                    {isWikiPageManagerOpen && (
                        <WikiPageManagerModal 
                            isOpen={isWikiPageManagerOpen} 
                            onClose={() => {
                                setWikiPageManagerOpen(false);
                                setWikiPageToEdit(null);
                            }} 
                            initialEditItem={wikiPageToEdit}
                        />
                    )}
                    {isUserSettingsOpen && <UserSettingsModal isOpen={isUserSettingsOpen} onClose={() => setUserSettingsOpen(false)} />}
                    {editingPin && (
                        <PinEditorModal 
                            pinData={editingPin} 
                            onClose={() => setEditingPin(null)} 
                            onSave={handlePinSave} 
                        />
                    )}
                    {editingLabel && (
                        <LabelEditorModal 
                            labelData={editingLabel} 
                            onClose={() => setEditingLabel(null)} 
                            onSave={async (savedLabel) => {
                                setEditingLabel(null);
                                if (savedLabel) updateLocalLabel(savedLabel);
                                else await refreshData(true);
                            }}
                        />
                    )}
                </main>
            </div>
        </AppContext.Provider>
    );
};

export default Dashboard;
