
import React, { useState, useMemo } from 'react';
import { useAppContext } from './Dashboard';
import { useAuth } from '../App';
import { Map as MapType, Pin, PinSection } from '../types';
import { Icon } from './Icons';

interface WikiProps {
    onSelectMap: (map: MapType) => void;
    onLocatePin: (pin: Pin) => void;
}

const Wiki: React.FC<WikiProps> = ({ onSelectMap, onLocatePin }) => {
    const { maps, pins, pinTypes, isPlayerView } = useAppContext();
    const { user } = useAuth();
    const isDM = user?.profile.role === 'DM';
    const canSeeSecrets = isDM && !isPlayerView;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

    // Filter logic
    const filteredContent = useMemo(() => {
        const lowerQ = searchQuery.toLowerCase();
        
        return maps.map(map => {
            const mapPins = pins.filter(p => p.map_id === map.id);
            
            // If searching, check if map matches OR any of its pins match
            let matchesMap = !searchQuery || map.name.toLowerCase().includes(lowerQ);
            
            const matchingPins = mapPins.filter(pin => {
                if (!searchQuery) return true;
                
                // Search Pin Title
                if (pin.title.toLowerCase().includes(lowerQ)) return true;
                // Search Pin Description
                if (pin.data.description?.toLowerCase().includes(lowerQ)) return true;
                // Search Sections
                return pin.data.sections?.some(s => 
                    s.title.toLowerCase().includes(lowerQ) || 
                    s.content.toLowerCase().includes(lowerQ) ||
                    (s.type === 'list' && s.list_items?.some(i => i.toLowerCase().includes(lowerQ))) ||
                    (s.type === 'inventory' && s.items?.some(i => i.name.toLowerCase().includes(lowerQ)))
                );
            });

            // If query exists, only show map if it matches or has matching pins
            if (searchQuery && !matchesMap && matchingPins.length === 0) return null;

            return {
                map,
                pins: matchingPins
            };
        }).filter(Boolean) as { map: MapType, pins: Pin[] }[];

    }, [maps, pins, searchQuery]);

    const activeMapData = selectedMapId ? filteredContent.find(c => c.map.id === selectedMapId) : null;
    const activePin = selectedPinId ? pins.find(p => p.id === selectedPinId) : null;
    const activePinMap = activePin ? maps.find(m => m.id === activePin.map_id) : null;

    // --- Renderers ---

    const renderPinContent = (pin: Pin) => {
        const type = pinTypes.find(t => t.id === pin.pin_type_id);
        
        return (
            <div className="space-y-8 animate-modal-in max-w-4xl mx-auto pb-20">
                {/* Header */}
                <div className="border-b border-stone-700/50 pb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl text-3xl ring-2 ring-stone-700/50" style={{ backgroundColor: type?.color || '#555' }}>
                            {type?.emoji || '📍'}
                        </div>
                        <div>
                            <h1 className="text-4xl font-medieval font-bold text-stone-100">{pin.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-stone-800/50 px-2 py-0.5 rounded text-xs text-stone-400 border border-stone-700 uppercase tracking-wider">{type?.name || 'Unknown'}</span>
                                {activePinMap && <span className="text-stone-500 text-sm flex items-center gap-1"><Icon name="map" className="w-3 h-3"/> {activePinMap.name}</span>}
                            </div>
                        </div>
                        <button 
                            onClick={() => onLocatePin(pin)}
                            className="ml-auto flex items-center gap-2 bg-stone-800 hover:bg-amber-700/20 hover:text-amber-500 border border-stone-700 px-4 py-2 rounded-xl transition-all text-sm font-medium group"
                        >
                            <Icon name="compass" className="w-4 h-4 group-hover:rotate-45 transition-transform"/>
                            Locate on Map
                        </button>
                    </div>

                    {pin.data.description && (
                         <div className="prose prose-invert max-w-none text-stone-300 text-lg leading-relaxed bg-stone-900/20 p-6 rounded-2xl border border-stone-800/50">
                            {pin.data.description}
                         </div>
                    )}
                </div>

                {/* Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pin.data.sections?.map((section, idx) => {
                        if (section.type === 'secret' && !canSeeSecrets) return null;
                        
                        const isFullWidth = section.type === 'text' || section.type === 'list' || section.type === 'inventory';
                        
                        return (
                            <div key={idx} className={`bg-stone-800/20 rounded-2xl border border-stone-700/30 overflow-hidden ${isFullWidth ? 'md:col-span-2' : ''} ${section.type === 'secret' ? 'border-red-900/50 bg-red-950/10' : ''}`}>
                                <div className={`px-5 py-3 border-b border-stone-700/30 flex items-center justify-between ${section.type === 'secret' ? 'bg-red-950/30' : 'bg-stone-800/40'}`}>
                                    <h3 className={`font-medieval text-xl ${section.type === 'secret' ? 'text-red-400' : 'text-stone-200'}`}>
                                        {section.type === 'secret' && <Icon name="lock" className="w-4 h-4 inline mr-2" />}
                                        {section.title}
                                    </h3>
                                    <span className="text-xs uppercase text-stone-600 font-bold tracking-wider">{section.type}</span>
                                </div>
                                
                                <div className="p-5">
                                    {section.type === 'text' && <p className="whitespace-pre-wrap text-stone-300 leading-relaxed">{section.content}</p>}
                                    {section.type === 'secret' && <p className="whitespace-pre-wrap text-red-200/80 leading-relaxed font-mono text-sm">{section.content}</p>}
                                    
                                    {section.type === 'list' && (
                                        <>
                                            {section.content && <p className="mb-4 text-stone-400 italic">{section.content}</p>}
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {section.list_items?.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-stone-300 bg-stone-900/30 p-2 rounded">
                                                        <span className="text-amber-500 mt-1">✦</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}

                                    {section.type === 'statblock' && (
                                        <>
                                            {section.content && <p className="mb-4 text-stone-400 italic">{section.content}</p>}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {section.stats?.map((stat, i) => (
                                                    <div key={i} className="bg-stone-900/50 p-3 rounded-lg border border-stone-800 flex flex-col items-center text-center">
                                                        <span className="text-xs uppercase tracking-wider text-amber-600 font-bold mb-1">{stat.label}</span>
                                                        <span className="font-medieval text-xl text-stone-200">{stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {section.type === 'image' && (
                                        <div className="space-y-2">
                                            {section.image_url ? (
                                                <img src={section.image_url} alt={section.title} className="w-full h-auto rounded-lg shadow-lg" />
                                            ) : <div className="h-32 bg-stone-900/50 rounded flex items-center justify-center text-stone-600">No Image</div>}
                                            {section.content && <p className="text-sm text-stone-400 text-center italic">{section.content}</p>}
                                        </div>
                                    )}

                                    {section.type === 'inventory' && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="text-stone-500 uppercase text-xs border-b border-stone-700/50">
                                                    <tr>
                                                        <th className="pb-2 pl-2">Item</th>
                                                        <th className="pb-2">Rarity</th>
                                                        <th className="pb-2 text-right pr-2">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-700/30">
                                                    {section.items?.map((item, i) => (
                                                        <tr key={i} className="hover:bg-stone-700/20">
                                                            <td className="py-2 pl-2">
                                                                <span className={`font-medium ${item.is_magic ? 'text-amber-400' : 'text-stone-300'}`}>{item.name}</span>
                                                                {item.desc && <p className="text-xs text-stone-500 line-clamp-1">{item.desc}</p>}
                                                            </td>
                                                            <td className="py-2 text-purple-400 text-xs">{item.rarity || '-'}</td>
                                                            <td className="py-2 text-right pr-2 font-mono text-stone-400">{item.count}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {pin.data.sections.length === 0 && !pin.data.description && (
                    <div className="text-center py-20 bg-stone-800/20 rounded-2xl border border-stone-700/30 border-dashed">
                        <Icon name="scroll" className="w-12 h-12 text-stone-600 mx-auto mb-4"/>
                        <p className="text-stone-500 text-lg">This page is currently empty.</p>
                    </div>
                )}
            </div>
        );
    };

    // --- Main Layout ---
    return (
        <div className="flex h-full w-full bg-stone-950 text-stone-200">
            {/* Left Sidebar: Index */}
            <div className="w-80 border-r border-stone-700/50 flex flex-col bg-stone-900/30 backdrop-blur-sm">
                <div className="p-4 border-b border-stone-700/50">
                    <h2 className="text-amber-500 font-medieval text-xl mb-3 flex items-center gap-2">
                        <Icon name="book" className="w-5 h-5"/>
                        World Codex
                    </h2>
                    <div className="relative">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                        <input 
                            type="text" 
                            placeholder="Search knowledge..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-900/50 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-200 focus:border-amber-500 focus:outline-none placeholder-stone-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {filteredContent.map(({ map, pins }) => (
                        <div key={map.id} className="rounded-xl overflow-hidden border border-transparent">
                            <button 
                                onClick={() => { setSelectedMapId(map.id); setSelectedPinId(null); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${selectedMapId === map.id && !selectedPinId ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' : 'hover:bg-stone-800/50 text-stone-300'}`}
                            >
                                <Icon name="map" className="w-4 h-4 opacity-70"/>
                                <span className="font-medium truncate">{map.name}</span>
                            </button>
                            
                            {(selectedMapId === map.id || searchQuery) && (
                                <div className="pl-4 border-l border-stone-800 ml-4 mt-1 space-y-0.5">
                                    {pins.map(pin => (
                                        <button 
                                            key={pin.id}
                                            onClick={() => { setSelectedMapId(map.id); setSelectedPinId(pin.id); }}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm rounded-lg transition-colors ${selectedPinId === pin.id ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/30'}`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pinTypes.find(t => t.id === pin.pin_type_id)?.color }}></span>
                                            <span className="truncate">{pin.title}</span>
                                        </button>
                                    ))}
                                    {pins.length === 0 && <p className="px-3 py-1 text-xs text-stone-600 italic">No pins found</p>}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredContent.length === 0 && (
                        <div className="p-4 text-center text-stone-600">
                            No results found for "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>

            {/* Right Pane: Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                <div className="p-8 md:p-12 min-h-full">
                    {selectedPinId && activePin ? (
                        renderPinContent(activePin)
                    ) : selectedMapId && activeMapData ? (
                        <div className="max-w-4xl mx-auto space-y-8 animate-modal-in">
                            <div className="flex items-center gap-4 border-b border-stone-700/50 pb-6">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-stone-700 shadow-2xl bg-stone-900">
                                    <img src={activeMapData.map.image_url} className="w-full h-full object-cover" alt={activeMapData.map.name} />
                                </div>
                                <div>
                                    <h1 className="text-5xl font-medieval font-bold text-amber-500">{activeMapData.map.name}</h1>
                                    <p className="text-stone-500 mt-1 uppercase tracking-widest text-sm font-bold">Region Map</p>
                                </div>
                                <button 
                                    onClick={() => onSelectMap(activeMapData.map)}
                                    className="ml-auto flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl shadow-lg transition-all font-bold"
                                >
                                    <Icon name="map" className="w-5 h-5"/>
                                    Open Map
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeMapData.pins.map(pin => {
                                    const type = pinTypes.find(t => t.id === pin.pin_type_id);
                                    return (
                                        <button 
                                            key={pin.id}
                                            onClick={() => setSelectedPinId(pin.id)}
                                            className="bg-stone-800/40 hover:bg-stone-800 border border-stone-700/30 hover:border-amber-500/50 p-4 rounded-xl text-left transition-all group flex flex-col gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg ring-1 ring-white/10" style={{ backgroundColor: type?.color }}>
                                                    {type?.emoji}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-stone-200 truncate group-hover:text-amber-400">{pin.title}</h3>
                                                    <p className="text-xs text-stone-500">{type?.name}</p>
                                                </div>
                                            </div>
                                            {pin.data.description && (
                                                <p className="text-sm text-stone-500 line-clamp-2">{pin.data.description}</p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-stone-600 space-y-6 opacity-50">
                            <Icon name="book" className="w-24 h-24"/>
                            <div className="text-center">
                                <h2 className="text-3xl font-medieval text-stone-400">The Archives</h2>
                                <p className="mt-2">Select a map or topic from the left to begin reading.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Wiki;