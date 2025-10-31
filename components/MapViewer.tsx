
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Map as MapType, Pin } from '../types';
import { useAppContext } from './Dashboard';
import { useAuth } from '../App';
import { Icon } from './Icons';

interface MapViewerProps {
    map: MapType;
    onSelectPin: (pin: Pin) => void;
    onAddPin: (coords: { x: number; y: number }) => void;
}

const MapViewer: React.FC<MapViewerProps> = ({ map, onSelectPin, onAddPin }) => {
    const { pins, pinTypes, isPlayerView } = useAppContext();
    const { user } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

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

    useEffect(() => {
        const img = new Image();
        img.src = map.image_url;
        img.onload = () => {
            setImgDimensions({ width: img.width, height: img.height });
        };
    }, [map.image_url]);
    
    useEffect(() => {
        resetView();
    }, [imgDimensions, resetView]);
    
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
        // Allow adding pins with right click, pan with left click
        if (e.button === 0) {
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
        if (user?.profile.role !== 'DM' || isPlayerView || isPanning) return;
        if (e.target !== mapRef.current && e.target !== (mapRef.current?.firstChild as HTMLElement).firstChild) return;

        const rect = mapRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        onAddPin({ x, y });
    };

    return (
        <div 
            ref={containerRef}
            className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
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
                    cursor: user?.profile.role === 'DM' && !isPlayerView ? 'crosshair' : 'grab',
                }}
                onClick={handleMapClick}
            >
                <img src={map.image_url} alt={map.name} className="pointer-events-none w-full h-full" />
                
                {pins.map(pin => {
                    const pinType = getPinType(pin.pin_type_id);
                    return (
                        <button
                            key={pin.id}
                            onClick={(e) => { e.stopPropagation(); onSelectPin(pin); }}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white"
                            style={{ 
                                left: `${pin.x_coord * 100}%`, 
                                top: `${pin.y_coord * 100}%`,
                                backgroundColor: pinType?.color || '#3B82F6',
                                transform: `translate(-50%, -50%) scale(${1 / viewState.scale})`,
                            }}
                            title={pin.title}
                        >
                            <span style={{ fontSize: `${16 / viewState.scale}px` }}>
                                {pinType?.emoji || '📍'}
                            </span>
                        </button>
                    );
                })}
            </div>
             <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button onClick={resetView} className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg hover:bg-white dark:hover:bg-gray-700">
                    <Icon name="center" className="w-5 h-5 text-gray-700 dark:text-gray-300"/>
                </button>
             </div>
        </div>
    );
};

export default MapViewer;