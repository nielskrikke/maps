import React, { createContext, useContext } from 'react';
import { Map as MapType, Pin, PinType, Character, WikiPage } from '../types';

export type AppContextType = {
    maps: MapType[];
    pinTypes: PinType[];
    pins: Pin[];
    characters: Character[];
    wikiPages: WikiPage[];
    isPlayerView: boolean;
    error: { message: string; details?: any } | null;
    setError: (error: { message: string; details?: any } | null) => void;
    refreshData: (silent?: boolean) => Promise<void>;
    setIsPlayerView: React.Dispatch<React.SetStateAction<boolean>>;
    updateLocalPin: (pin: Pin) => void;
    updateLocalMap: (map: MapType) => void;
    updateLocalCharacter: (char: Character) => void;
    updateLocalPinType: (pt: PinType) => void;
    updateLocalWikiPage: (page: WikiPage) => void;
    removeLocalItem: (type: 'map'|'pin'|'character'|'pintype'|'wikipage', id: string) => void;
};

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppContextProvider');
    return context;
};
