import React, { createContext, useContext } from 'react';
import { Map as MapType, Pin, PinType, Character } from '../types';

export type AppContextType = {
    maps: MapType[];
    pinTypes: PinType[];
    pins: Pin[];
    characters: Character[];
    isPlayerView: boolean;
    error: { message: string; details?: any } | null;
    setError: (error: { message: string; details?: any } | null) => void;
    refreshData: (silent?: boolean) => Promise<void>;
    setIsPlayerView: React.Dispatch<React.SetStateAction<boolean>>;
    updateLocalPin: (pin: Pin) => void;
    updateLocalMap: (map: MapType) => void;
    updateLocalCharacter: (char: Character) => void;
    updateLocalPinType: (pt: PinType) => void;
    removeLocalItem: (type: 'map'|'pin'|'character'|'pintype', id: string) => void;
};

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppContextProvider');
    return context;
};
