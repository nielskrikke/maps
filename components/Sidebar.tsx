
import React from 'react';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { Map as MapType } from '../types';
import { Icon } from './Icons';

interface SidebarProps {
    selectedMap: MapType | null;
    onSelectMap: (map: MapType | null) => void;
    onMapManagerOpen: () => void;
    onPinTypeManagerOpen: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedMap, onSelectMap, onMapManagerOpen, onPinTypeManagerOpen }) => {
    const { user, signOut } = useAuth();
    const { maps, isPlayerView, setIsPlayerView } = useAppContext();

    return (
        <aside className="flex h-full w-full flex-col bg-white p-4 shadow-lg dark:bg-gray-800 md:w-72">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">D&D World Map</h1>
            </div>

            <div className="mt-4 flex items-center space-x-3 rounded-lg bg-gray-100 p-2 dark:bg-gray-700">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white font-bold">
                    {user?.profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{user?.profile.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.profile.role}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user?.id}>ID: {user?.id}</p>
                </div>
            </div>

            <nav className="mt-6 flex-1 space-y-2 overflow-y-auto">
                <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Maps</h2>
                {maps.length > 0 ? (
                    maps.map((map) => (
                        <button
                            key={map.id}
                            onClick={() => onSelectMap(map)}
                            className={`flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                                selectedMap?.id === map.id
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Icon name="map" className="h-5 w-5" />
                            <span>{map.name}</span>
                        </button>
                    ))
                ) : (
                    <p className="px-3 text-sm text-gray-400">No maps found.</p>
                )}
            </nav>

            {user?.profile.role === 'DM' && (
                <div className="mt-4 space-y-2 border-t pt-4 dark:border-gray-700">
                    <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">DM Tools</h2>
                    <button onClick={onMapManagerOpen} className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Icon name="upload" className="h-5 w-5" />
                        <span>Manage Maps</span>
                    </button>
                    <button onClick={onPinTypeManagerOpen} className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Icon name="tag" className="h-5 w-5" />
                        <span>Manage Pin Types</span>
                    </button>
                     <div className="flex items-center justify-between rounded-md px-3 py-2">
                        <label htmlFor="player-view-toggle" className="flex items-center space-x-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                           <Icon name={isPlayerView ? 'eye-off' : 'eye'} className="h-5 w-5" />
                           <span>Player View</span>
                        </label>
                        <button
                          id="player-view-toggle"
                          onClick={() => setIsPlayerView(!isPlayerView)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${isPlayerView ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPlayerView ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            )}
            
            <div className="mt-4 border-t pt-4 dark:border-gray-700">
                <button onClick={signOut} className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Icon name="logout" className="h-5 w-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;