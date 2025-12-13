
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { useItems, ApiItem } from './ItemProvider';
import { Map as MapType, Pin, PinData, PinType, PinSectionType, PinSection, InventoryItem, Character, CharacterRelationship, MapTypeEnum, UserProfile } from '../types';
import { Icon } from './Icons';
import MapViewer from './MapViewer';

// Helper to convert file to Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Reusable Modal Wrapper
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-2xl' }) => {
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className={`w-full ${maxWidthClass} rounded-3xl bg-stone-900/95 backdrop-blur-2xl border border-stone-700/50 p-6 shadow-2xl animate-modal-in flex flex-col max-h-[95vh]`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-stone-700/50 pb-4 mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-medieval font-bold text-amber-500">{title}</h2>
                    <button onClick={onClose} className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300">
                        <Icon name="close" className="h-6 w-6" />
                    </button>
                </div>
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">{children}</div>
            </div>
        </div>
    );
};

// --- DM TOOLS MODAL ---
interface DMToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMapManagerOpen: () => void;
    onCharacterManagerOpen: () => void;
    onPinTypeManagerOpen: () => void;
    onPlayerManagerOpen: () => void;
    onSignOut: () => void;
}

export const DMToolsModal: React.FC<DMToolsModalProps> = ({
    isOpen, onClose, onMapManagerOpen, onCharacterManagerOpen, onPinTypeManagerOpen, onPlayerManagerOpen, onSignOut
}) => {
    const handleAction = (action: () => void) => {
        onClose();
        action();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="DM Tools & Settings" maxWidthClass="max-w-md">
            <div className="space-y-4">
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase text-stone-500 mb-2">Content Management</h3>
                    <button onClick={() => handleAction(onMapManagerOpen)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-stone-800/40 hover:bg-stone-800 border border-stone-700/50 hover:border-amber-500/50 transition-all group text-left">
                        <div className="p-2 rounded-lg bg-stone-900 text-amber-600 group-hover:text-amber-500">
                            <Icon name="map" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-stone-200">Manage Maps</div>
                            <div className="text-xs text-stone-500">Create, edit, and organize maps</div>
                        </div>
                    </button>
                    
                    <button onClick={() => handleAction(onCharacterManagerOpen)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-stone-800/40 hover:bg-stone-800 border border-stone-700/50 hover:border-amber-500/50 transition-all group text-left">
                        <div className="p-2 rounded-lg bg-stone-900 text-amber-600 group-hover:text-amber-500">
                            <Icon name="user" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-stone-200">Manage Characters</div>
                            <div className="text-xs text-stone-500">NPCs, Players, and biographies</div>
                        </div>
                    </button>

                    <button onClick={() => handleAction(onPinTypeManagerOpen)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-stone-800/40 hover:bg-stone-800 border border-stone-700/50 hover:border-amber-500/50 transition-all group text-left">
                        <div className="p-2 rounded-lg bg-stone-900 text-amber-600 group-hover:text-amber-500">
                            <Icon name="tag" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-stone-200">Manage Pin Types</div>
                            <div className="text-xs text-stone-500">Customize map markers and icons</div>
                        </div>
                    </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-800">
                    <h3 className="text-xs font-bold uppercase text-stone-500 mb-2">System & Users</h3>
                    <button onClick={() => handleAction(onPlayerManagerOpen)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-stone-800/40 hover:bg-stone-800 border border-stone-700/50 hover:border-amber-500/50 transition-all group text-left">
                        <div className="p-2 rounded-lg bg-stone-900 text-stone-400 group-hover:text-stone-300">
                            <Icon name="shield" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-stone-200">User Management</div>
                            <div className="text-xs text-stone-500">Manage players and permissions</div>
                        </div>
                    </button>
                </div>

                <div className="pt-4 border-t border-stone-800">
                    <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 hover:text-red-300 transition-all font-bold">
                        <Icon name="logout" className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- USER SETTINGS MODAL ---
interface UserSettingsModalProps { isOpen: boolean; onClose: () => void; }
export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [username, setUsername] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setUsername(user.profile.username);
            setImageUrl(user.profile.image_url || '');
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setMsg(null);

        try {
            const { error } = await supabase
                .from('users')
                .update({ username: username, image_url: imageUrl || null })
                .eq('id', user.id);

            if (error) {
                if (error.message?.includes('column "image_url" of relation "users" does not exist')) {
                    throw new Error("Database Error: The 'image_url' column is missing. Please run the migration in 'database_updates.txt'.");
                }
                throw error;
            }
            
            setMsg({ type: 'success', text: "Profile updated! Reloading..." });
            
            setTimeout(() => {
                 window.location.reload(); 
            }, 1000);

        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Profile Settings">
            <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-stone-800 border-2 border-stone-600 flex items-center justify-center overflow-hidden relative group">
                        {imageUrl ? <img src={imageUrl} alt="Profile" className="w-full h-full object-cover"/> : <span className="font-medieval text-4xl text-stone-500">{username.charAt(0)}</span>}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Icon name="upload" className="w-6 h-6 text-white"/>
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                if(e.target.files?.[0]) setImageUrl(await fileToBase64(e.target.files[0]));
                            }}/>
                        </label>
                    </div>
                    <div className="flex gap-2 w-full max-w-sm">
                         <input type="text" placeholder="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="flex-1 bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-stone-300"/>
                         {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="p-2 text-stone-500 hover:text-red-500"><Icon name="trash" className="w-4 h-4"/></button>}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase text-stone-500">Display Name</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200 font-medium" />
                    <p className="text-[10px] text-amber-500/80 italic">Note: Changing this does not change your Login Username.</p>
                </div>

                {msg && <div className={`p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>{msg.text}</div>}

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                    <button type="button" onClick={onClose} className="bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-xl text-sm text-stone-300">Cancel</button>
                    <button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg disabled:opacity-50">
                        {loading ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- PLAYER MANAGER MODAL ---
interface PlayerManagerModalProps { isOpen: boolean; onClose: () => void; }
export const PlayerManagerModal: React.FC<PlayerManagerModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [view, setView] = useState<'list' | 'create'>('list');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Create Form State
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'Player' | 'DM'>('Player');
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // Edit State
    const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null);

    useEffect(() => {
        if (isOpen && view === 'list') {
            fetchUsers();
        }
    }, [isOpen, view]);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('users').select('*').order('username');
        if (data) setUsers(data as any);
        if (error) console.error("Error fetching users:", error);
        setLoading(false);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const trimmedUsername = username.trim();
            if (!trimmedUsername) throw new Error('Username is required.');
            const usernameRegex = /^[a-zA-Z0-9_-]+$/;
            if (!usernameRegex.test(trimmedUsername)) throw new Error('Username can only contain letters, numbers, hyphens, and underscores.');

            // Generate dummy credentials
            const lowerCaseUsername = trimmedUsername.toLowerCase();
            const dummyEmail = `${lowerCaseUsername}@dnd-map-login.local`;
            const dummyPassword = `DUMMY_PASSWORD_FOR_${lowerCaseUsername}`;

            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'temp-auth-client' }
            });

            const { data: authData, error: signUpError } = await tempClient.auth.signUp({
                email: dummyEmail,
                password: dummyPassword,
                options: { data: { username: trimmedUsername, role: role } }
            });

            if (signUpError) throw signUpError;

            if (authData.user) {
                // Try to create the profile immediately.
                const { error: profileError } = await supabase.from('users').insert({
                    id: authData.user.id,
                    username: trimmedUsername,
                    role: role,
                    password_hash: 'managed_by_supabase_auth'
                });
                
                if (profileError) {
                    if (profileError.code === '42501') {
                         setStatus({ type: 'success', msg: `Auth account created! Profile row failed (Permission Denied). Please run 'database_updates.txt' to fix DM permissions. The user CAN still log in.` });
                    } else if (profileError.code !== '23505') {
                         console.error("Profile creation warning:", profileError);
                         setStatus({ type: 'success', msg: `User created in Auth, but profile sync failed. They will be initialized on first login.` });
                    } else {
                         setStatus({ type: 'success', msg: `User '${trimmedUsername}' created successfully!` });
                    }
                } else {
                    setStatus({ type: 'success', msg: `User '${trimmedUsername}' created successfully!` });
                }
                
                setUsername('');
                // Refresh list if we go back
                fetchUsers();
            }
        } catch (error: any) {
            setStatus({ type: 'error', msg: error.message || "Unknown error occurred" });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser || !editingUser.id) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('users').update({
                username: editingUser.username,
                role: editingUser.role
            }).eq('id', editingUser.id);
            
            if (error) throw error;
            setEditingUser(null);
            fetchUsers();
        } catch (e: any) {
            alert(`Error updating user: ${e.message}. Run database_updates.txt if permissions fail.`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if(!confirm("Are you sure? This deletes their profile data and access. (Auth account requires admin cleanup).")) return;
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) {
            alert(`Error deleting user: ${error.message}. Run database_updates.txt if permissions fail.`);
        } else {
            fetchUsers();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="User Management" maxWidthClass="max-w-4xl">
            <div className="flex gap-2 mb-6 border-b border-stone-700/50 pb-2">
                <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'list' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-stone-200'}`}>User List</button>
                <button onClick={() => setView('create')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'create' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-stone-200'}`}>Create User</button>
            </div>

            {view === 'list' && (
                <div className="space-y-2">
                    {loading && users.length === 0 && <div className="text-center py-4"><Icon name="spinner" className="animate-spin h-6 w-6 mx-auto text-amber-500"/></div>}
                    {!loading && users.length === 0 && <p className="text-center text-stone-500 py-4">No users found.</p>}
                    
                    <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {users.map(u => (
                            <div key={u.id} className="bg-stone-800/40 border border-stone-700/50 p-3 rounded-xl flex items-center justify-between group">
                                {editingUser?.id === u.id ? (
                                    <div className="flex items-center gap-2 flex-1 mr-4">
                                        <input type="text" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className="bg-stone-900 border border-stone-600 rounded px-2 py-1 text-sm text-white flex-1"/>
                                        <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})} className="bg-stone-900 border border-stone-600 rounded px-2 py-1 text-sm text-white w-24">
                                            <option value="Player">Player</option>
                                            <option value="DM">DM</option>
                                        </select>
                                        <button onClick={handleUpdateUser} className="text-green-500 hover:text-green-400 p-1"><Icon name="check" className="w-5 h-5"/></button>
                                        <button onClick={() => setEditingUser(null)} className="text-red-500 hover:text-red-400 p-1"><Icon name="close" className="w-5 h-5"/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-stone-700 overflow-hidden flex-shrink-0">
                                                {u.image_url ? <img src={u.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{u.username.charAt(0)}</div>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-stone-200 text-sm">{u.username}</p>
                                                <p className="text-[10px] text-stone-500 uppercase font-bold">{u.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingUser(u)} className="p-2 bg-stone-700 hover:bg-amber-600 rounded-lg text-white"><Icon name="pencil" className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-stone-700 hover:bg-red-600 rounded-lg text-white" disabled={u.id === user?.id}><Icon name="trash" className="w-4 h-4"/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'create' && (
                 <form onSubmit={handleCreateSubmit} className="space-y-6">
                    <div className="bg-stone-800/40 p-4 rounded-xl border border-stone-700/50 mb-4">
                        <p className="text-sm text-stone-300">
                            Create a new account for your players. They will log in using only the username provided below.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" 
                            placeholder="e.g. Aragorn" 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Role</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 cursor-pointer rounded-xl border px-4 py-3 text-center transition-all ${role === 'Player' ? 'bg-amber-900/30 border-amber-500 text-amber-500' : 'bg-stone-800/40 border-stone-700 text-stone-400 hover:bg-stone-800'}`}>
                                <input type="radio" className="hidden" checked={role === 'Player'} onChange={() => setRole('Player')} />
                                <span className="font-bold">Player</span>
                            </label>
                            <label className={`flex-1 cursor-pointer rounded-xl border px-4 py-3 text-center transition-all ${role === 'DM' ? 'bg-amber-900/30 border-amber-500 text-amber-500' : 'bg-stone-800/40 border-stone-700 text-stone-400 hover:bg-stone-800'}`}>
                                <input type="radio" className="hidden" checked={role === 'DM'} onChange={() => setRole('DM')} />
                                <span className="font-bold">Dungeon Master</span>
                            </label>
                        </div>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl border text-sm ${status.type === 'success' ? 'bg-green-900/20 border-green-800/50 text-green-300' : 'bg-red-900/20 border-red-800/50 text-red-300'}`}>
                            {status.msg}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin mx-auto"/> : 'Create User'}
                    </button>
                </form>
            )}
        </Modal>
    );
};

// --- MAP MANAGER MODAL ---
interface MapManagerModalProps { isOpen: boolean; onClose: () => void; }
export const MapManagerModal: React.FC<MapManagerModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { maps, refreshData } = useAppContext();
    const [editingMap, setEditingMap] = useState<Partial<MapType> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form fields
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [parentMapId, setParentMapId] = useState<string>('');
    const [isVisible, setIsVisible] = useState(true);
    const [gridSize, setGridSize] = useState(50);
    const [pinScale, setPinScale] = useState(50);
    const [isGridVisible, setIsGridVisible] = useState(false);
    const [mapType, setMapType] = useState<MapTypeEnum>('region');
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setEditingMap(null); setIsEditing(false); setName(''); setImageFile(null); setImageUrl('');
        setParentMapId(''); setIsVisible(true); setGridSize(50); setPinScale(50); setIsGridVisible(false);
        setMapType('region');
    };

    const handleEdit = (map: MapType) => {
        setEditingMap(map); setIsEditing(true);
        setName(map.name); setImageUrl(map.image_url); setParentMapId(map.parent_map_id || '');
        setIsVisible(map.is_visible); setGridSize(map.grid_size || 50); 
        setPinScale(map.pin_scale || 50); setIsGridVisible(map.is_grid_visible || false);
        setMapType(map.map_type || 'region');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            let finalImageUrl = imageUrl;
            if (imageFile) finalImageUrl = await fileToBase64(imageFile);

            const payload = {
                name,
                image_url: finalImageUrl,
                parent_map_id: parentMapId || null,
                is_visible: isVisible,
                grid_size: gridSize,
                pin_scale: pinScale,
                is_grid_visible: isGridVisible,
                map_type: mapType,
                created_by: user.id
            };

            if (isEditing && editingMap?.id) {
                await supabase.from('maps').update(payload).eq('id', editingMap.id);
            } else {
                await supabase.from('maps').insert(payload);
            }

            await refreshData(true);
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Error saving map.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This will delete the map and all its pins.")) return;
        setLoading(true);
        await supabase.from('maps').delete().eq('id', id);
        await refreshData(true);
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Maps" maxWidthClass="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* List */}
                <div className="md:col-span-1 border-r border-stone-800 pr-4 space-y-4">
                    <button onClick={resetForm} className="w-full flex items-center justify-center space-x-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2 px-4 rounded-xl transition-all border border-stone-700">
                        <Icon name="plus" className="h-4 w-4" />
                        <span>New Map</span>
                    </button>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {maps.map(map => (
                            <div key={map.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-stone-800/50">
                                <span className="text-sm text-stone-300 truncate">{map.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(map)} className="p-1 hover:text-amber-500 text-stone-500"><Icon name="pencil" className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(map.id)} className="p-1 hover:text-red-500 text-stone-500"><Icon name="trash" className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form */}
                <div className="md:col-span-2">
                    <h3 className="text-lg font-medieval text-stone-300 mb-4">{isEditing ? 'Edit Map' : 'Create New Map'}</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" placeholder="Map Name" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200 focus:border-amber-500 focus:outline-none" />
                             <select value={mapType} onChange={e => setMapType(e.target.value as MapTypeEnum)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-3 text-stone-300 capitalize">
                                <option value="world">World Map</option>
                                <option value="region">Region Map</option>
                                <option value="city">City/Settlement</option>
                                <option value="dungeon">Dungeon/Interior</option>
                                <option value="battlemap">Battlemap</option>
                             </select>
                        </div>
                        
                        <div className="bg-stone-800/30 p-3 rounded-xl border border-stone-700/30">
                             <div className="flex items-center gap-3 mb-2">
                                <label className="cursor-pointer bg-stone-700 hover:bg-stone-600 px-3 py-1.5 rounded text-xs text-stone-200 font-bold transition-colors">
                                    Upload Image
                                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                                        if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setImageUrl(''); }
                                    }} />
                                </label>
                                <span className="text-xs text-stone-500">OR</span>
                                <input type="text" placeholder="Image URL" value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImageFile(null); }} className="flex-1 bg-transparent border-b border-stone-700 text-xs text-stone-300 py-1 focus:outline-none focus:border-amber-500" />
                            </div>
                            {(imageUrl || (imageFile && URL.createObjectURL(imageFile))) && (
                                <img src={imageUrl || (imageFile ? URL.createObjectURL(imageFile) : '')} className="h-32 w-auto object-cover rounded border border-stone-600" alt="Preview" />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Parent Map</label>
                                <select value={parentMapId} onChange={e => setParentMapId(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-sm text-stone-300">
                                    <option value="">(None - Top Level)</option>
                                    {maps.filter(m => m.id !== editingMap?.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Grid Size (px)</label>
                                <input type="number" value={gridSize} onChange={e => setGridSize(parseInt(e.target.value))} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                             </div>
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Pin Scale (px)</label>
                                <input type="number" value={pinScale} onChange={e => setPinScale(parseInt(e.target.value))} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                             </div>
                             <div className="flex flex-col justify-end gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300">
                                    <input type="checkbox" checked={isGridVisible} onChange={e => setIsGridVisible(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                                    Show Grid Overlay
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300">
                                    <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                                    Visible to Players
                                </label>
                             </div>
                         </div>

                        <div className="flex justify-end pt-4">
                             <button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Map'}
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
};

interface PinTypeManagerModalProps { isOpen: boolean; onClose: () => void; }
export const PinTypeManagerModal: React.FC<PinTypeManagerModalProps> = ({ isOpen, onClose }) => {
    const { pinTypes, refreshData } = useAppContext();
    const [editingType, setEditingType] = useState<Partial<PinType> | null>(null);
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📍');
    const [color, setColor] = useState('#EF4444');
    const [loading, setLoading] = useState(false);

    const resetForm = () => { setEditingType(null); setName(''); setEmoji('📍'); setColor('#EF4444'); };

    const handleEdit = (pt: PinType) => {
        setEditingType(pt); setName(pt.name); setEmoji(pt.emoji || '📍'); setColor(pt.color);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const payload = { name, emoji, color };
        if (editingType?.id) {
            await supabase.from('pin_types').update(payload).eq('id', editingType.id);
        } else {
            await supabase.from('pin_types').insert(payload);
        }
        await refreshData(true);
        resetForm();
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this pin type?')) return;
        await supabase.from('pin_types').delete().eq('id', id);
        await refreshData(true);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Pin Types">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-r border-stone-800 pr-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                     <button onClick={resetForm} className="w-full text-center bg-stone-800 py-2 rounded-xl text-stone-300 text-sm font-bold mb-2 hover:bg-stone-700">+ New Type</button>
                    {pinTypes.map(pt => (
                        <div key={pt.id} className="flex items-center justify-between p-2 rounded-lg bg-stone-900/40 border border-stone-800">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs" style={{backgroundColor: pt.color}}>{pt.emoji}</span>
                                <span className="text-sm text-stone-300">{pt.name}</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(pt)} className="p-1 hover:text-amber-500"><Icon name="pencil" className="w-4 h-4 text-stone-600"/></button>
                                <button onClick={() => handleDelete(pt.id)} className="p-1 hover:text-red-500"><Icon name="trash" className="w-4 h-4 text-stone-600"/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase">{editingType ? 'Edit Type' : 'New Type'}</h3>
                    <input type="text" placeholder="Type Name" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200" />
                    <div className="flex gap-4">
                        <div className="flex-1">
                             <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Emoji</label>
                             <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-center text-xl" maxLength={2} />
                        </div>
                        <div className="flex-1">
                             <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Color</label>
                             <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-[50px] rounded-xl border border-stone-600/50 bg-stone-800/40 cursor-pointer" />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin mx-auto"/> : 'Save Type'}
                    </button>
                </form>
            </div>
        </Modal>
    );
};

// --- PIN EDITOR MODAL ---
interface PinEditorModalProps {
    pinData: Partial<Pin>;
    onClose: () => void;
    onSave: () => Promise<void>;
}
export const PinEditorModal: React.FC<PinEditorModalProps> = ({ pinData, onClose, onSave }) => {
    const { user } = useAuth();
    const { maps, pinTypes } = useAppContext();
    const { items: apiItems } = useItems(); // For inventory search

    const [title, setTitle] = useState(pinData.title || '');
    const [pinTypeId, setPinTypeId] = useState(pinData.pin_type_id || (pinTypes[0]?.id || ''));
    const [linkedMapId, setLinkedMapId] = useState(pinData.linked_map_id || '');
    const [isVisible, setIsVisible] = useState(pinData.is_visible ?? true);
    const [description, setDescription] = useState(pinData.data?.description || '');
    const [sections, setSections] = useState<PinSection[]>(pinData.data?.sections || []);
    const [encounterFile, setEncounterFile] = useState<{name: string, content: string} | null>(pinData.data?.encounter_file || null);
    
    const [loading, setLoading] = useState(false);

    // Section editing state
    const addSection = (type: PinSectionType) => {
        setSections([...sections, {
            id: Date.now().toString(),
            type,
            title: type.charAt(0).toUpperCase() + type.slice(1),
            content: '',
            list_items: [],
            stats: [],
            items: []
        }]);
    };
    
    const removeSection = (index: number) => {
        const newSections = [...sections];
        newSections.splice(index, 1);
        setSections(newSections);
    };

    const updateSection = (index: number, field: keyof PinSection, value: any) => {
        const newSections = [...sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setSections(newSections);
    };

    // Inventory Helper for Sections
    const InventoryEditor: React.FC<{ sectionIndex: number, currentItems: InventoryItem[] }> = ({ sectionIndex, currentItems }) => {
        const [search, setSearch] = useState('');
        const [matches, setMatches] = useState<ApiItem[]>([]);

        useEffect(() => {
            if (!search) { setMatches([]); return; }
            setMatches(apiItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5));
        }, [search, apiItems]);

        const addItem = (apiItem: ApiItem) => {
            const newItem: InventoryItem = {
                id: Date.now().toString(),
                name: apiItem.name,
                count: 1,
                is_magic: apiItem.is_magic
            };
            // Fetch basic details if possible from local cache or allow edit later
            updateSection(sectionIndex, 'items', [...(currentItems || []), newItem]);
            setSearch('');
        };

        const updateItem = (itemId: string, field: keyof InventoryItem, val: any) => {
            const newItems = currentItems.map(i => i.id === itemId ? { ...i, [field]: val } : i);
            updateSection(sectionIndex, 'items', newItems);
        };

        const removeItem = (itemId: string) => {
            updateSection(sectionIndex, 'items', currentItems.filter(i => i.id !== itemId));
        };

        return (
            <div className="space-y-3">
                <div className="relative">
                    <input type="text" placeholder="Search 5e items..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-sm text-stone-300"/>
                    {matches.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-stone-800 border border-stone-700 z-50 max-h-40 overflow-y-auto">
                            {matches.map(m => (
                                <button key={m.index} onClick={() => addItem(m)} type="button" className="w-full text-left p-2 hover:bg-stone-700 text-sm text-stone-300">
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    {currentItems?.map(item => (
                        <div key={item.id} className="flex items-center gap-2 bg-stone-900/50 p-2 rounded">
                            <input type="number" value={item.count} onChange={e => updateItem(item.id, 'count', parseInt(e.target.value))} className="w-12 bg-stone-800 border border-stone-700 rounded text-center text-sm" />
                            <span className={`flex-1 text-sm ${item.is_magic ? 'text-amber-400' : 'text-stone-300'}`}>{item.name}</span>
                            <button type="button" onClick={() => removeItem(item.id)} className="text-stone-500 hover:text-red-500"><Icon name="trash" className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dataPayload: PinData = {
            description,
            images: [], // Deprecated in favor of sections
            sections,
            encounter_file: encounterFile
        };

        const dbPayload = {
            map_id: pinData.map_id,
            x_coord: pinData.x_coord,
            y_coord: pinData.y_coord,
            title,
            pin_type_id: pinTypeId,
            linked_map_id: linkedMapId || null,
            is_visible: isVisible,
            data: dataPayload as any, // jsonb casting
            created_by: pinData.created_by || user?.id
        };

        try {
            if (pinData.id) {
                await supabase.from('pins').update(dbPayload).eq('id', pinData.id);
            } else {
                await supabase.from('pins').insert(dbPayload);
            }
            await onSave();
        } catch (error) {
            console.error(error);
            alert("Failed to save pin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={pinData.id ? "Edit Pin" : "New Pin"} maxWidthClass="max-w-4xl">
            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <div className="bg-stone-800/40 p-4 rounded-xl border border-stone-700/50 space-y-3">
                        <h3 className="text-xs font-bold uppercase text-stone-500">Core Info</h3>
                        <input type="text" placeholder="Pin Title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200 focus:border-amber-500 focus:outline-none" />
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Type</label>
                                <select value={pinTypeId} onChange={e => setPinTypeId(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-300">
                                    {pinTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.emoji} {pt.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Linked Map</label>
                                <select value={linkedMapId} onChange={e => setLinkedMapId(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-300">
                                    <option value="">(None)</option>
                                    {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pt-2">
                             <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                             <span className="text-sm text-stone-300 font-bold">Visible to Players</span>
                        </label>
                     </div>

                     <div className="bg-stone-800/40 p-4 rounded-xl border border-stone-700/50 space-y-3">
                         <h3 className="text-xs font-bold uppercase text-stone-500">Main Description</h3>
                         <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200 focus:border-amber-500 focus:outline-none" placeholder="General description seen by everyone..." />
                     </div>

                     <div className="bg-stone-800/40 p-4 rounded-xl border border-stone-700/50 space-y-3">
                         <h3 className="text-xs font-bold uppercase text-stone-500">Encounter Data</h3>
                         <label className="block w-full cursor-pointer bg-stone-900/50 border border-dashed border-stone-600 rounded-xl p-4 text-center hover:border-amber-500 transition-colors">
                             <span className="text-sm text-stone-400">{encounterFile ? `File Loaded: ${encounterFile.name}` : "Upload .json Encounter File"}</span>
                             <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                                 const f = e.target.files?.[0];
                                 if (f) {
                                     const text = await f.text();
                                     setEncounterFile({ name: f.name, content: text });
                                 }
                             }}/>
                         </label>
                         {encounterFile && <button type="button" onClick={() => setEncounterFile(null)} className="text-xs text-red-400 hover:underline">Clear File</button>}
                     </div>
                </div>

                {/* Right Column: Sections */}
                <div className="flex flex-col h-full bg-stone-800/20 rounded-xl border border-stone-700/30 overflow-hidden">
                    <div className="bg-stone-800/80 p-3 border-b border-stone-700/50 flex justify-between items-center">
                        <span className="font-medieval text-stone-300">Content Sections</span>
                        <div className="flex gap-1">
                            {['text', 'secret', 'list', 'statblock', 'image', 'inventory'].map(t => (
                                <button key={t} type="button" onClick={() => addSection(t as PinSectionType)} className="p-1.5 bg-stone-700 hover:bg-amber-600 rounded text-stone-200 text-xs uppercase" title={`Add ${t}`}>
                                    <Icon name={t === 'secret' ? 'lock' : t === 'image' ? 'image' : t === 'inventory' ? 'backpack' : t === 'list' ? 'scroll' : t === 'statblock' ? 'shield' : 'book'} className="w-4 h-4" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                        {sections.map((section, idx) => (
                            <div key={idx} className={`relative bg-stone-900/40 rounded-xl border p-3 ${section.type === 'secret' ? 'border-red-900/30' : 'border-stone-700/50'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <input type="text" value={section.title} onChange={e => updateSection(idx, 'title', e.target.value)} className="bg-transparent border-b border-stone-700 text-sm font-bold text-stone-300 focus:border-amber-500 focus:outline-none w-1/2" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase text-stone-600 font-bold">{section.type}</span>
                                        <button type="button" onClick={() => removeSection(idx)} className="text-stone-600 hover:text-red-500"><Icon name="close" className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                
                                {section.type === 'text' && <textarea value={section.content} onChange={e => updateSection(idx, 'content', e.target.value)} rows={3} className="w-full bg-stone-800/50 border border-stone-700 rounded p-2 text-sm text-stone-300"/>}
                                {section.type === 'secret' && <textarea value={section.content} onChange={e => updateSection(idx, 'content', e.target.value)} rows={3} className="w-full bg-red-950/20 border border-red-900/30 rounded p-2 text-sm text-red-200"/>}
                                {section.type === 'image' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Image URL" value={section.image_url || ''} onChange={e => updateSection(idx, 'image_url', e.target.value)} className="flex-1 bg-stone-800 border border-stone-700 rounded p-1 text-xs text-stone-300"/>
                                            <label className="cursor-pointer bg-stone-700 px-2 py-1 rounded text-xs text-stone-200 hover:bg-stone-600">
                                                Upload
                                                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                                    if(e.target.files?.[0]) updateSection(idx, 'image_url', await fileToBase64(e.target.files[0]));
                                                }}/>
                                            </label>
                                        </div>
                                        {section.image_url && <img src={section.image_url} className="h-20 rounded border border-stone-700" />}
                                    </div>
                                )}
                                {section.type === 'list' && (
                                    <div>
                                        <div className="flex gap-2 mb-2">
                                            <input type="text" placeholder="Add item..." onKeyPress={e => {
                                                if(e.key === 'Enter') { 
                                                    e.preventDefault(); 
                                                    const target = e.target as HTMLInputElement; 
                                                    if(target.value) { 
                                                        updateSection(idx, 'list_items', [...(section.list_items || []), target.value]); 
                                                        target.value = ''; 
                                                    } 
                                                }
                                            }} className="flex-1 bg-stone-800 border border-stone-700 rounded p-1 text-xs text-stone-300"/>
                                        </div>
                                        <ul className="space-y-1">
                                            {section.list_items?.map((li, liIdx) => (
                                                <li key={liIdx} className="flex justify-between text-xs text-stone-400 bg-stone-800/50 px-2 py-1 rounded">
                                                    <span>{li}</span>
                                                    <button type="button" onClick={() => updateSection(idx, 'list_items', section.list_items?.filter((_, i) => i !== liIdx))} className="text-stone-600 hover:text-red-500">&times;</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {section.type === 'statblock' && (
                                    <div className="space-y-2">
                                        <button type="button" onClick={() => updateSection(idx, 'stats', [...(section.stats || []), {label: 'New Stat', value: '10'}])} className="text-xs text-amber-500 hover:underline">+ Add Stat</button>
                                        <div className="grid grid-cols-2 gap-2">
                                            {section.stats?.map((stat, sIdx) => (
                                                <div key={sIdx} className="bg-stone-800 p-1 rounded border border-stone-700 flex flex-col gap-1">
                                                    <input type="text" value={stat.label} onChange={e => {
                                                        const newStats = [...(section.stats || [])]; newStats[sIdx].label = e.target.value; updateSection(idx, 'stats', newStats);
                                                    }} className="bg-transparent text-[10px] text-amber-500 font-bold uppercase w-full"/>
                                                    <div className="flex justify-between">
                                                        <input type="text" value={stat.value} onChange={e => {
                                                            const newStats = [...(section.stats || [])]; newStats[sIdx].value = e.target.value; updateSection(idx, 'stats', newStats);
                                                        }} className="bg-transparent text-sm text-stone-200 w-full"/>
                                                        <button type="button" onClick={() => updateSection(idx, 'stats', section.stats?.filter((_, i) => i !== sIdx))} className="text-stone-600 hover:text-red-500 px-1">&times;</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {section.type === 'inventory' && <InventoryEditor sectionIndex={idx} currentItems={section.items || []} />}
                            </div>
                        ))}
                        {sections.length === 0 && <p className="text-center text-stone-600 text-sm italic py-4">No content sections added.</p>}
                    </div>
                </div>

                <div className="lg:col-span-2 flex justify-end gap-3 border-t border-stone-700/50 pt-4">
                    <button type="button" onClick={onClose} className="bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold py-3 px-6 rounded-xl transition-all">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all">
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin mx-auto"/> : "Save Pin"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- CHARACTER MANAGER MODAL ---
interface CharacterManagerModalProps { isOpen: boolean; onClose: () => void; }
export const CharacterManagerModal: React.FC<CharacterManagerModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { characters, refreshData } = useAppContext();
    const [editingChar, setEditingChar] = useState<Partial<Character> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [race, setRace] = useState('');
    const [charClass, setCharClass] = useState('');
    const [level, setLevel] = useState(1);
    const [alignment, setAlignment] = useState('');
    const [backstory, setBackstory] = useState('');
    const [gmNotes, setGmNotes] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [isNpc, setIsNpc] = useState(true);
    const [isVisible, setIsVisible] = useState(true);
    const [charJson, setCharJson] = useState<any>(null);

    const resetForm = () => {
        setEditingChar(null); setIsEditing(false);
        setName(''); setRace(''); setCharClass(''); setLevel(1); setAlignment('');
        setBackstory(''); setGmNotes(''); setImageUrl(''); setSheetUrl('');
        setIsNpc(true); setIsVisible(true); setCharJson(null);
    };

    const handleEdit = (char: Character) => {
        setEditingChar(char); setIsEditing(true);
        setName(char.name);
        setRace(char.role_details?.race || '');
        setCharClass(char.role_details?.class || '');
        setLevel(char.role_details?.level || 1);
        setAlignment(char.role_details?.alignment || '');
        setBackstory(char.backstory || '');
        setGmNotes(char.gm_notes || '');
        setImageUrl(char.image_url || '');
        setSheetUrl(char.sheet_url || '');
        setIsNpc(char.is_npc);
        setIsVisible(char.is_visible);
        setCharJson(char.character_json || null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        const payload = {
            name,
            role_details: { race, class: charClass, level, alignment },
            backstory,
            gm_notes: gmNotes,
            image_url: imageUrl || null,
            sheet_url: sheetUrl || null,
            is_npc: isNpc,
            is_visible: isVisible,
            character_json: charJson,
            created_by: editingChar?.created_by || user.id
        };

        try {
            if (isEditing && editingChar?.id) {
                await supabase.from('characters').update(payload).eq('id', editingChar.id);
            } else {
                await supabase.from('characters').insert(payload);
            }
            await refreshData(true);
            resetForm();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

     const handleDelete = async (id: string) => {
        if (!confirm('Delete this character?')) return;
        await supabase.from('characters').delete().eq('id', id);
        await refreshData(true);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Characters" maxWidthClass="max-w-5xl">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 border-r border-stone-800 pr-4 space-y-4">
                    <button onClick={resetForm} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2 px-4 rounded-xl transition-all border border-stone-700 flex items-center justify-center gap-2">
                        <Icon name="plus" className="w-4 h-4"/> New Character
                    </button>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {characters.map(c => (
                            <div key={c.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-stone-800/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                     <div className="w-8 h-8 rounded-full bg-stone-800 overflow-hidden flex-shrink-0">
                                        {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full"><Icon name="user" className="w-4 h-4 text-stone-500"/></div>}
                                     </div>
                                     <div className="min-w-0">
                                         <div className="text-sm text-stone-300 truncate font-bold">{c.name}</div>
                                         <div className="text-xs text-stone-500 truncate">{c.role_details?.race} {c.role_details?.class}</div>
                                     </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(c)} className="p-1 hover:text-amber-500 text-stone-500"><Icon name="pencil" className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-1 hover:text-red-500 text-stone-500"><Icon name="trash" className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <h3 className="text-lg font-medieval text-stone-300 mb-4">{isEditing ? `Edit ${editingChar?.name}` : 'Create New Character'}</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Class</label>
                                <input type="text" value={charClass} onChange={e => setCharClass(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                            </div>
                        </div>

                         <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Race</label>
                                <input type="text" value={race} onChange={e => setRace(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Level</label>
                                <input type="number" value={level} onChange={e => setLevel(parseInt(e.target.value))} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Alignment</label>
                                <input type="text" value={alignment} onChange={e => setAlignment(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                            </div>
                        </div>

                         <div className="bg-stone-800/30 p-3 rounded-xl border border-stone-700/30">
                             <div className="flex gap-2 mb-2">
                                <input type="text" placeholder="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="flex-1 bg-stone-800 border border-stone-700 rounded p-1 text-xs text-stone-300"/>
                                <label className="cursor-pointer bg-stone-700 px-2 py-1 rounded text-xs text-stone-200 hover:bg-stone-600 flex items-center gap-1">
                                    <Icon name="upload" className="w-3 h-3"/> Upload
                                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                        if(e.target.files?.[0]) setImageUrl(await fileToBase64(e.target.files[0]));
                                    }}/>
                                </label>
                            </div>
                            {imageUrl && <img src={imageUrl} className="h-20 w-auto rounded border border-stone-600" />}
                        </div>

                        <div>
                             <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Sheet URL (External)</label>
                             <input type="text" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" placeholder="https://dndbeyond.com/..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Backstory</label>
                                <textarea value={backstory} onChange={e => setBackstory(e.target.value)} rows={4} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200 text-sm" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold uppercase text-red-500 mb-1">GM Notes (Private)</label>
                                <textarea value={gmNotes} onChange={e => setGmNotes(e.target.value)} rows={4} className="w-full rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2 text-red-200 text-sm" />
                            </div>
                        </div>

                        <div className="flex gap-4 border-t border-stone-800 pt-4">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300">
                                <input type="checkbox" checked={isNpc} onChange={e => setIsNpc(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                                Is NPC
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300">
                                <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                                Visible to Players
                            </label>
                            
                             <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300 ml-auto">
                                <Icon name="upload" className="w-4 h-4"/>
                                {charJson ? "JSON Loaded" : "Upload JSON"}
                                <input type="file" className="hidden" accept=".json" onChange={async (e) => {
                                    if(e.target.files?.[0]) setCharJson(JSON.parse(await e.target.files[0].text()));
                                }}/>
                            </label>
                        </div>

                        <div className="flex justify-end pt-2">
                             <button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Character'}
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
}
