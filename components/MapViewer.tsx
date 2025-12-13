
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Map as MapType, Pin } from '../types';
import { useAppContext } from './Dashboard';
import { useAuth } from '../App';
import { Icon } from './Icons';

interface MapViewerProps {
    map: MapType;
    onSelectPin: (pin: Pin) => void;
    onAddPin: (coords: { x: number; y: number }) => void;
    highlightedPinId?: string | null;
}

type InteractionMode = 'pan' | 'pin';

const MapViewer: React.FC<MapViewerProps> = ({ map, onSelectPin, onAddPin, highlightedPinId }) => {
    const { pins, pinTypes, isPlayerView, characters } = useAppContext();
    const { user } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
    const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
    
    // Default to 'pan' mode. Only DMs can switch to 'pin'.
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('pan');

    // Defaults if map config is missing
    const gridSize = map.grid_size || 50;
    const pinSize = map.pin_scale || 50;
    const showGrid = map.is_grid_visible || false;

    const isDM = user?.profile.role === 'DM';
    const canEdit = isDM && !isPlayerView;

    const getPinType = (pinTypeId: string) => pinTypes.find(pt => pt.id === pinTypeId);

    const resetView = useCallback(() => {
        if (!containerRef.current || !imgDimensions.width) return;
        const container = containerRef.current;
        const { width: cWidth, height: cHeight } = container.getBoundingClientRect();
        const { width: iWidth, height: iHeight } = imgDimensions;

        const scaleX = cWidth / iWidth;
        const scaleY = cHeight / iHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        const x = (cWidth - iWidth * scale) / 2;
        const y = (cHeight - iHeight * scale) / 2;
        
        setViewState({ scale, x, y });
    }, [imgDimensions]);

    // Ensure players are always in pan mode
    useEffect(() => {
        if (!canEdit) {
            setInteractionMode('pan');
        }
    }, [canEdit]);

    useEffect(() => {
        const img = new Image();
        img.src = map.image_url;
        img.onload = () => {
            setImgDimensions({ width: img.width, height: img.height });
        };
    }, [map.image_url]);
    
    // Auto-center on highlighted pin when ID changes
    useEffect(() => {
        if (highlightedPinId && imgDimensions.width > 0 && containerRef.current) {
            const pin = pins.find(p => p.id === highlightedPinId);
            if (pin && pin.map_id === map.id) {
                const container = containerRef.current.getBoundingClientRect();
                const targetScale = Math.max(viewState.scale, 1); // Ensure we are zoomed in at least 1x
                
                const pinXPx = pin.x_coord * imgDimensions.width;
                const pinYPx = pin.y_coord * imgDimensions.height;

                // Center logic: (ContainerCenter) - (PinPos * Scale)
                const newX = (container.width / 2) - (pinXPx * targetScale);
                const newY = (container.height / 2) - (pinYPx * targetScale);

                setViewState({ scale: targetScale, x: newX, y: newY });
            }
        } else if (!highlightedPinId && imgDimensions.width > 0) {
            // Only reset view on initial load, not when highlight is cleared manually
            if (viewState.scale === 1 && viewState.x === 0) resetView();
        }
    }, [highlightedPinId, imgDimensions, pins, map.id]);

    // Initial reset view on image load
    useEffect(() => {
        if (imgDimensions.width > 0 && !highlightedPinId) {
            resetView();
        }
    }, [imgDimensions, resetView]);
    
    // Zoom Helpers
    const zoomIn = () => {
        setViewState(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) }));
    };

    const zoomOut = () => {
        setViewState(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.1) }));
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const { deltaY, clientX, clientY } = e;
        const scaleAmount = -deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, viewState.scale + scaleAmount), 5);
        
        const rect = containerRef.current!.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const newX = mouseX - (mouseX - viewState.x) * (newScale / viewState.scale);
        const newY = mouseY - (mouseY - viewState.y) * (newScale / viewState.scale);

        setViewState({ scale: newScale, x: newX, y: newY });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (interactionMode === 'pan' || e.button === 1 || e.button === 2) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
        }
    };
    
    const handleMouseUp = (e: React.MouseEvent) => {
        setIsPanning(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        setViewState(prev => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
    };

    const handleMapClick = (e: React.MouseEvent) => {
        if (!canEdit || isPanning || interactionMode !== 'pin') return;
        
        if (e.target !== mapRef.current && e.target !== (mapRef.current?.querySelector('img') as HTMLElement) && e.target !== (mapRef.current?.querySelector('.grid-overlay') as HTMLElement)) return;

        const rect = mapRef.current!.getBoundingClientRect();
        
        let x = (e.clientX - rect.left) / rect.width;
        let y = (e.clientY - rect.top) / rect.height;

        if (showGrid && gridSize > 0 && imgDimensions.width > 0 && imgDimensions.height > 0) {
            const originalX = x * imgDimensions.width;
            const originalY = y * imgDimensions.height;
            const col = Math.floor(originalX / gridSize);
            const row = Math.floor(originalY / gridSize);
            const centerX = (col * gridSize) + (gridSize / 2);
            const centerY = (row * gridSize) + (gridSize / 2);
            x = centerX / imgDimensions.width;
            y = centerY / imgDimensions.height;
        }
        
        onAddPin({ x, y });
    };

    let cursorStyle = 'default';
    if (isPanning) {
        cursorStyle = 'grabbing';
    } else if (interactionMode === 'pan') {
        cursorStyle = 'grab';
    } else if (interactionMode === 'pin' && canEdit) {
        cursorStyle = 'crosshair';
    }

    return (
        <div 
            ref={containerRef}
            className="h-full w-full overflow-hidden bg-stone-950 relative"
            style={{ cursor: cursorStyle }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
        >
            <div
                ref={mapRef}
                className="relative origin-top-left"
                style={{
                    transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
                    width: `${imgDimensions.width}px`,
                    height: `${imgDimensions.height}px`,
                }}
                onClick={handleMapClick}
            >
                <img src={map.image_url} alt={map.name} className="pointer-events-none w-full h-full absolute top-0 left-0" />
                
                {showGrid && (
                    <div 
                        className="grid-overlay absolute inset-0 pointer-events-none opacity-30"
                        style={{
                            backgroundSize: `${gridSize}px ${gridSize}px`,
                            backgroundImage: `
                                linear-gradient(to right, rgba(255, 255, 255, 0.5) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(255, 255, 255, 0.5) 1px, transparent 1px)
                            `
                        }}
                    />
                )}

                {/* Pins */}
                {pins.map(pin => {
                    if (pin.map_id !== map.id) return null;
                    const pinType = getPinType(pin.pin_type_id);
                    const isHighlighted = pin.id === highlightedPinId;

                    return (
                        <button
                            key={pin.id}
                            onClick={(e) => { e.stopPropagation(); onSelectPin(pin); }}
                            onMouseEnter={() => setHoveredPinId(pin.id)}
                            onMouseLeave={() => setHoveredPinId(null)}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all focus:outline-none shadow-lg shadow-black/50 ${isHighlighted ? 'ring-4 ring-amber-500 ring-offset-2 ring-offset-black z-50 scale-125 animate-pulse' : 'hover:brightness-110 focus:ring-2 focus:ring-white hover:z-50'}`}
                            style={{ 
                                left: `${pin.x_coord * 100}%`, 
                                top: `${pin.y_coord * 100}%`,
                                backgroundColor: pinType?.color || '#3B82F6',
                                width: `${pinSize}px`,
                                height: `${pinSize}px`,
                                fontSize: `${pinSize * 0.6}px`, 
                                cursor: 'pointer'
                            }}
                            title={pin.title}
                        >
                            <span className="drop-shadow-md leading-none select-none">
                                {pinType?.emoji || '📍'}
                            </span>
                        </button>
                    );
                })}

                {/* Hover Preview Tooltip */}
                {hoveredPinId && (() => {
                    const pin = pins.find(p => p.id === hoveredPinId);
                    if (!pin || pin.map_id !== map.id) return null;
                    const pinType = getPinType(pin.pin_type_id);
                    const charsHere = characters.filter(c => c.current_pin_id === pin.id && ((isDM && !isPlayerView) || c.is_visible));

                    return (
                        <div
                            className="absolute pointer-events-none z-[100] flex flex-col items-center"
                            style={{
                                left: `${pin.x_coord * 100}%`,
                                top: `${pin.y_coord * 100}%`,
                                // Inverse scaling logic:
                                // 1. Center transform origin (bottom center)
                                // 2. Translate up to clear pin (-pinSize/2 - 10px spacing)
                                // 3. Inverse scale (1/viewState.scale) to keep constant visual size
                                transform: `translate(-50%, -100%) translateY(${-pinSize/2 - 12}px) scale(${1 / viewState.scale})`,
                                transformOrigin: 'bottom center',
                            }}
                        >
                            <div className="bg-stone-900/95 backdrop-blur-xl border border-amber-500/30 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2 min-w-[160px] animate-modal-in">
                                <div className="text-center">
                                    <h3 className="font-medieval text-amber-500 text-xl leading-none whitespace-nowrap drop-shadow-md">{pin.title}</h3>
                                    <span className="text-[10px] uppercase text-stone-500 font-bold tracking-widest mt-1 block">{pinType?.name}</span>
                                </div>
                                
                                {charsHere.length > 0 && (
                                    <div className="flex items-center justify-center -space-x-2 pt-2 pb-1">
                                        {charsHere.slice(0, 5).map(c => (
                                            <div key={c.id} className="w-8 h-8 rounded-full border-2 border-stone-800 bg-stone-900 overflow-hidden relative z-0 shadow-sm">
                                                {c.image_url ? 
                                                    <img src={c.image_url} className="w-full h-full object-cover" alt={c.name} /> : 
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-stone-500 font-bold">{c.name[0]}</div>
                                                }
                                            </div>
                                        ))}
                                        {charsHere.length > 5 && (
                                            <div className="w-8 h-8 rounded-full border-2 border-stone-800 bg-stone-800 flex items-center justify-center text-[10px] text-stone-400 font-bold z-10 shadow-sm">
                                                +{charsHere.length - 5}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Arrow Pointer */}
                            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-amber-500/30 translate-y-[-1px]" />
                        </div>
                    );
                })()}
            </div>

            {/* Controls */}
             <div className="absolute bottom-6 right-6 flex flex-col gap-4 z-10">
                {canEdit && (
                    <div className="flex flex-col gap-1 p-1 rounded-xl bg-stone-900/80 backdrop-blur-lg border border-stone-700/50 shadow-xl">
                        <button 
                            onClick={() => setInteractionMode('pan')} 
                            className={`p-2 rounded-lg transition-colors ${interactionMode === 'pan' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
                            title="Pan Mode"
                        >
                            <Icon name="hand" className="w-5 h-5"/>
                        </button>
                        <button 
                            onClick={() => setInteractionMode('pin')} 
                            className={`p-2 rounded-lg transition-colors ${interactionMode === 'pin' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
                            title="Add Pin Mode"
                        >
                            <Icon name="pin" className="w-5 h-5"/>
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-1 p-1 rounded-xl bg-stone-900/80 backdrop-blur-lg border border-stone-700/50 shadow-xl">
                    <button onClick={zoomIn} className="p-2 rounded-lg text-stone-300 hover:text-amber-500 hover:bg-stone-800 transition-colors" title="Zoom In">
                        <Icon name="plus" className="w-5 h-5"/>
                    </button>
                    <button onClick={resetView} className="p-2 rounded-lg text-stone-300 hover:text-amber-500 hover:bg-stone-800 transition-colors" title="Center View">
                        <Icon name="center" className="w-5 h-5"/>
                    </button>
                    <button onClick={zoomOut} className="p-2 rounded-lg text-stone-300 hover:text-amber-500 hover:bg-stone-800 transition-colors" title="Zoom Out">
                        <Icon name="minus" className="w-5 h-5"/>
                    </button>
                </div>
             </div>
        </div>
    );
};

export default MapViewer;
