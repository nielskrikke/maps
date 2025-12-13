
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
                                <label className={`cursor-pointer px-3 py-1.5 rounded text-xs text-stone-200 font-bold transition-colors ${isEditing ? 'bg-amber-700 hover:bg-amber-600' : 'bg-stone-700 hover:bg-stone-600'}`}>
                                    {isEditing ? 'Replace Image' : 'Upload Image'}
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
                             {isEditing && (
                                <p className="text-[10px] text-stone-500 mt-2 italic">Note: Replacing the image will keep all existing pins in their relative positions. Ensure the new image has the same aspect ratio for best results.</p>
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

// --- PIN TYPE MANAGER MODAL ---
interface PinTypeManagerModalProps { isOpen: boolean; onClose: () => void; }
export const PinTypeManagerModal: React.FC<PinTypeManagerModalProps> = ({ isOpen, onClose }) => {
    const { pinTypes, refreshData } = useAppContext();
    const [editingType, setEditingType] = useState<Partial<PinType> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📍');
    const [color, setColor] = useState('#ffffff');
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setEditingType(null); setIsEditing(false);
        setName(''); setEmoji('📍'); setColor('#ffffff');
    };

    const handleEdit = (pt: PinType) => {
        setEditingType(pt); setIsEditing(true);
        setName(pt.name); setEmoji(pt.emoji || '📍'); setColor(pt.color);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const payload = { name, emoji, color };
        if (isEditing && editingType?.id) {
            await supabase.from('pin_types').update(payload).eq('id', editingType.id);
        } else {
            await supabase.from('pin_types').insert(payload);
        }
        await refreshData(true);
        setLoading(false);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Delete this pin type? Pins using it may break or disappear.")) return;
        setLoading(true);
        await supabase.from('pin_types').delete().eq('id', id);
        await refreshData(true);
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Pin Types" maxWidthClass="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 border-r border-stone-800 pr-4 space-y-4">
                     <button onClick={resetForm} className="w-full flex items-center justify-center space-x-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2 px-4 rounded-xl transition-all border border-stone-700">
                        <Icon name="plus" className="h-4 w-4" />
                        <span>New Type</span>
                    </button>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {pinTypes.map(pt => (
                            <div key={pt.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-stone-800/50">
                                <div className="flex items-center gap-2">
                                    <span style={{color: pt.color}}>{pt.emoji}</span>
                                    <span className="text-sm text-stone-300">{pt.name}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(pt)} className="p-1 hover:text-amber-500 text-stone-500"><Icon name="pencil" className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(pt.id)} className="p-1 hover:text-red-500 text-stone-500"><Icon name="trash" className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-2">
                    <h3 className="text-lg font-medieval text-stone-300 mb-4">{isEditing ? 'Edit Pin Type' : 'Create New Type'}</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Emoji Icon</label>
                                <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-4 py-3 text-stone-200" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Color</label>
                                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-12 rounded-xl border border-stone-600/50 bg-stone-800/40 p-1" />
                            </div>
                        </div>
                         <div className="flex justify-end pt-4">
                             <button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Type'}
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
};

// --- CHARACTER MANAGER MODAL ---
interface CharacterManagerModalProps { isOpen: boolean; onClose: () => void; }
export const CharacterManagerModal: React.FC<CharacterManagerModalProps> = ({ isOpen, onClose }) => {
    const { characters, refreshData } = useAppContext();
    const { user } = useAuth();
    const [editingChar, setEditingChar] = useState<Partial<Character> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form fields
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
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setEditingChar(null); setIsEditing(false);
        setName(''); setRace(''); setCharClass(''); setLevel(1); setAlignment('');
        setBackstory(''); setGmNotes(''); setImageUrl(''); setSheetUrl(''); setIsNpc(true); setIsVisible(false);
    };

    const handleEdit = (c: Character) => {
        setEditingChar(c); setIsEditing(true);
        setName(c.name);
        setRace(c.role_details?.race || '');
        setCharClass(c.role_details?.class || '');
        setLevel(c.role_details?.level || 1);
        setAlignment(c.role_details?.alignment || '');
        setBackstory(c.backstory || '');
        setGmNotes(c.gm_notes || '');
        setImageUrl(c.image_url || '');
        setSheetUrl(c.sheet_url || '');
        setIsNpc(c.is_npc);
        setIsVisible(c.is_visible);
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
            image_url: imageUrl,
            sheet_url: sheetUrl,
            is_npc: isNpc,
            is_visible: isVisible,
            created_by: user.id
        };

        if (isEditing && editingChar?.id) {
            await supabase.from('characters').update(payload).eq('id', editingChar.id);
        } else {
            await supabase.from('characters').insert(payload);
        }
        await refreshData(true);
        setLoading(false);
        resetForm();
    };
    
    const handleDelete = async (id: string) => {
        if(!confirm("Delete this character?")) return;
        await supabase.from('characters').delete().eq('id', id);
        await refreshData(true);
    };

    return (
         <Modal isOpen={isOpen} onClose={onClose} title="Manage Characters" maxWidthClass="max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 border-r border-stone-800 pr-4 space-y-4">
                    <button onClick={resetForm} className="w-full flex items-center justify-center space-x-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2 px-4 rounded-xl transition-all border border-stone-700">
                        <Icon name="plus" className="h-4 w-4" />
                        <span>New Character</span>
                    </button>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {characters.map(c => (
                            <div key={c.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-stone-800/50 cursor-pointer" onClick={() => handleEdit(c)}>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-stone-700 overflow-hidden">
                                        {c.image_url && <img src={c.image_url} className="w-full h-full object-cover"/>}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm text-stone-300 font-bold">{c.name}</div>
                                        <div className="text-[10px] text-stone-500 uppercase">{c.is_npc ? 'NPC' : 'PC'}</div>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-1 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Icon name="trash" className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-3">
                    <form onSubmit={handleSave} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" />
                            </div>
                             <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300 bg-stone-800/30 px-3 py-2 rounded-xl border border-stone-700/50 flex-1">
                                    <input type="checkbox" checked={isNpc} onChange={e => setIsNpc(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                                    Is NPC
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300 bg-stone-800/30 px-3 py-2 rounded-xl border border-stone-700/50 flex-1">
                                    <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                                    Visible to Players
                                </label>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="text-xs text-stone-500">Race</label><input type="text" value={race} onChange={e => setRace(e.target.value)} className="w-full rounded-xl bg-stone-800/40 px-3 py-2 text-stone-200 border border-stone-600/50"/></div>
                            <div><label className="text-xs text-stone-500">Class</label><input type="text" value={charClass} onChange={e => setCharClass(e.target.value)} className="w-full rounded-xl bg-stone-800/40 px-3 py-2 text-stone-200 border border-stone-600/50"/></div>
                            <div><label className="text-xs text-stone-500">Level</label><input type="number" value={level} onChange={e => setLevel(parseInt(e.target.value))} className="w-full rounded-xl bg-stone-800/40 px-3 py-2 text-stone-200 border border-stone-600/50"/></div>
                            <div><label className="text-xs text-stone-500">Alignment</label><input type="text" value={alignment} onChange={e => setAlignment(e.target.value)} className="w-full rounded-xl bg-stone-800/40 px-3 py-2 text-stone-200 border border-stone-600/50"/></div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Image URL</label>
                                <div className="flex gap-2">
                                    <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="flex-1 rounded-xl bg-stone-800/40 px-3 py-2 text-xs text-stone-300 border border-stone-600/50"/>
                                    <label className="cursor-pointer p-2 bg-stone-700 rounded-lg hover:bg-stone-600"><Icon name="upload" className="w-4 h-4"/><input type="file" className="hidden" onChange={async (e) => {if(e.target.files?.[0]) setImageUrl(await fileToBase64(e.target.files[0]))}} /></label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Sheet URL (Optional)</label>
                                <input type="text" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full rounded-xl bg-stone-800/40 px-3 py-2 text-xs text-stone-300 border border-stone-600/50"/>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Backstory</label>
                                <textarea value={backstory} onChange={e => setBackstory(e.target.value)} rows={5} className="w-full rounded-xl bg-stone-800/40 px-3 py-2 text-sm text-stone-300 border border-stone-600/50 custom-scrollbar"/>
                            </div>
                             <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1 text-red-400">GM Notes (Secret)</label>
                                <textarea value={gmNotes} onChange={e => setGmNotes(e.target.value)} rows={5} className="w-full rounded-xl bg-red-950/20 px-3 py-2 text-sm text-stone-300 border border-red-900/40 custom-scrollbar"/>
                            </div>
                         </div>

                         <div className="flex justify-end pt-4">
                             <button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Character'}
                             </button>
                        </div>
                    </form>
                </div>
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
    const { pinTypes, maps } = useAppContext();
    const { user } = useAuth();
    const { items: allItems } = useItems(); // From ItemProvider
    
    // Form State
    const [title, setTitle] = useState(pinData.title || '');
    const [pinTypeId, setPinTypeId] = useState(pinData.pin_type_id || (pinTypes[0]?.id || ''));
    const [isVisible, setIsVisible] = useState(pinData.is_visible ?? false);
    const [description, setDescription] = useState(pinData.data?.description || '');
    const [linkedMapId, setLinkedMapId] = useState(pinData.linked_map_id || '');
    const [sections, setSections] = useState<PinSection[]>(pinData.data?.sections || []);
    
    const [loading, setLoading] = useState(false);

    // Section Editor State
    const [itemSearch, setItemSearch] = useState('');

    const addSection = (type: PinSectionType) => {
        setSections([...sections, {
            id: crypto.randomUUID(),
            type,
            title: type === 'secret' ? 'Secret Note' : type.charAt(0).toUpperCase() + type.slice(1),
            content: '',
            list_items: type === 'list' ? [] : undefined,
            stats: type === 'statblock' ? [] : undefined,
            items: type === 'inventory' ? [] : undefined,
            image_url: type === 'image' ? '' : undefined
        }]);
    };

    const updateSection = (id: string, updates: Partial<PinSection>) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };
    
    const removeSection = (id: string) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };

    // Inventory Helpers
    const addItemToSection = (sectionId: string, item: ApiItem) => {
        const section = sections.find(s => s.id === sectionId);
        if (!section || !section.items) return;
        
        const newItem: InventoryItem = {
            id: crypto.randomUUID(),
            name: item.name,
            count: 1,
            desc: item.desc?.join('\n') || '',
            rarity: item.rarity?.name,
            is_magic: item.is_magic,
            cost: item.cost ? `${item.cost.quantity} ${item.cost.unit}` : undefined,
            category: item.equipment_category?.name
        };
        
        updateSection(sectionId, { items: [...section.items, newItem] });
    };

    const handleSaveLocal = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload: Partial<Pin> = {
            title,
            pin_type_id: pinTypeId,
            is_visible: isVisible,
            linked_map_id: linkedMapId || null,
            data: {
                ...pinData.data,
                description,
                sections,
                images: pinData.data?.images || []
            },
            // If new pin, include coords
            ...(pinData.x_coord !== undefined ? { x_coord: pinData.x_coord, y_coord: pinData.y_coord, map_id: pinData.map_id } : {})
        };

        if (pinData.id) {
            await supabase.from('pins').update(payload).eq('id', pinData.id);
        } else if (user) {
            await supabase.from('pins').insert({ ...payload, created_by: user.id });
        }
        
        await onSave();
        setLoading(false);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={pinData.id ? "Edit Pin" : "New Pin"} maxWidthClass="max-w-5xl">
            <form onSubmit={handleSaveLocal} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200" autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Pin Type</label>
                        <select value={pinTypeId} onChange={e => setPinTypeId(e.target.value)} className="w-full rounded-xl border border-stone-600/50 bg-stone-800/40 px-3 py-2 text-stone-200">
                            {pinTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.emoji} {pt.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex items-center gap-6 bg-stone-800/30 p-3 rounded-xl border border-stone-700/30">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300">
                        <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="rounded bg-stone-800 border-stone-600 text-amber-600" />
                        Visible to Players
                    </label>
                    <div className="h-4 w-px bg-stone-700"></div>
                     <div className="flex-1 flex items-center gap-2">
                         <span className="text-xs font-bold uppercase text-stone-500 whitespace-nowrap">Link to Map:</span>
                         <select value={linkedMapId} onChange={e => setLinkedMapId(e.target.value)} className="w-full rounded-lg bg-stone-900 border border-stone-700/50 px-2 py-1 text-xs text-stone-300">
                            <option value="">(None)</option>
                            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                         </select>
                     </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Main Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full rounded-xl bg-stone-800/40 px-3 py-2 text-sm text-stone-300 border border-stone-600/50 custom-scrollbar"/>
                </div>
                
                {/* Sections Editor */}
                <div className="space-y-4 pt-4 border-t border-stone-800">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold uppercase text-stone-400">Content Sections</h3>
                        <div className="flex gap-2">
                             {(['text', 'image', 'list', 'statblock', 'inventory', 'secret'] as PinSectionType[]).map(type => (
                                 <button key={type} type="button" onClick={() => addSection(type)} className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs text-stone-300 capitalize border border-stone-700">
                                     + {type}
                                 </button>
                             ))}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="bg-stone-900/30 border border-stone-800 rounded-xl p-4 relative group">
                                <button type="button" onClick={() => removeSection(section.id)} className="absolute top-2 right-2 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="trash" className="w-4 h-4"/></button>
                                
                                <div className="mb-3 flex gap-3">
                                    <div className="bg-stone-800 px-2 py-1 rounded text-xs font-bold uppercase text-stone-500 self-start">{section.type}</div>
                                    <input type="text" value={section.title} onChange={e => updateSection(section.id, {title: e.target.value})} className="bg-transparent border-b border-stone-700 text-stone-200 font-medieval font-bold text-lg focus:outline-none focus:border-amber-500 w-full" placeholder="Section Title"/>
                                </div>

                                {section.type === 'text' && (
                                    <textarea value={section.content} onChange={e => updateSection(section.id, {content: e.target.value})} rows={3} className="w-full bg-stone-800/50 rounded p-2 text-sm text-stone-300 border border-stone-700/50" placeholder="Content text..."/>
                                )}
                                
                                {section.type === 'secret' && (
                                    <textarea value={section.content} onChange={e => updateSection(section.id, {content: e.target.value})} rows={3} className="w-full bg-red-950/20 rounded p-2 text-sm text-red-200/80 border border-red-900/40" placeholder="Secret GM text..."/>
                                )}

                                {section.type === 'list' && (
                                     <div>
                                        <p className="text-[10px] text-stone-500 mb-1">One item per line:</p>
                                        <textarea 
                                            value={section.list_items?.join('\n') || ''} 
                                            onChange={e => updateSection(section.id, {list_items: e.target.value.split('\n')})} 
                                            rows={4} 
                                            className="w-full bg-stone-800/50 rounded p-2 text-sm text-stone-300 border border-stone-700/50" 
                                            placeholder="Item 1&#10;Item 2&#10;Item 3"
                                        />
                                    </div>
                                )}
                                
                                {section.type === 'image' && (
                                    <div className="flex gap-2 items-center">
                                         <input type="text" value={section.image_url || ''} onChange={e => updateSection(section.id, {image_url: e.target.value})} className="flex-1 bg-stone-800/50 rounded p-2 text-sm text-stone-300 border border-stone-700/50" placeholder="Image URL..."/>
                                         <label className="cursor-pointer p-2 bg-stone-800 rounded hover:bg-stone-700"><Icon name="upload" className="w-4 h-4"/><input type="file" className="hidden" accept="image/*" onChange={async e => {if(e.target.files?.[0]) updateSection(section.id, {image_url: await fileToBase64(e.target.files[0])})}} /></label>
                                         {section.image_url && <img src={section.image_url} className="h-10 w-10 object-cover rounded border border-stone-700" alt="Preview"/>}
                                    </div>
                                )}

                                {section.type === 'statblock' && (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {section.stats?.map((stat, i) => (
                                                <div key={i} className="flex gap-1">
                                                    <input type="text" value={stat.label} onChange={e => {
                                                        const newStats = [...(section.stats || [])]; newStats[i].label = e.target.value; updateSection(section.id, {stats: newStats});
                                                    }} className="w-1/3 bg-stone-800/50 rounded p-1 text-xs text-amber-500 font-bold uppercase border border-stone-700" placeholder="Label"/>
                                                    <input type="text" value={stat.value} onChange={e => {
                                                        const newStats = [...(section.stats || [])]; newStats[i].value = e.target.value; updateSection(section.id, {stats: newStats});
                                                    }} className="w-2/3 bg-stone-800/50 rounded p-1 text-sm text-stone-200 border border-stone-700" placeholder="Value"/>
                                                    <button type="button" onClick={() => {
                                                         const newStats = [...(section.stats || [])]; newStats.splice(i, 1); updateSection(section.id, {stats: newStats});
                                                    }} className="text-stone-600 hover:text-red-500 px-1">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" onClick={() => updateSection(section.id, {stats: [...(section.stats || []), {label: '', value: ''}]})} className="text-xs text-amber-500 hover:text-amber-400 font-bold">+ Add Stat</button>
                                    </div>
                                )}

                                {section.type === 'inventory' && (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="w-full bg-stone-800/50 rounded p-2 text-sm text-stone-300 border border-stone-700/50 focus:border-amber-500" placeholder="Search 5e SRD items to add..."/>
                                            {itemSearch && (
                                                <div className="absolute top-full left-0 w-full bg-stone-800 border border-stone-600 rounded-b-lg max-h-40 overflow-y-auto z-10 shadow-xl">
                                                    {allItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 10).map(item => (
                                                        <button key={item.index} type="button" onClick={() => { addItemToSection(section.id, item); setItemSearch(''); }} className="w-full text-left px-3 py-2 text-sm text-stone-300 hover:bg-amber-900/30 hover:text-amber-500 block truncate">
                                                            {item.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                            {section.items?.map((item, i) => (
                                                <div key={item.id || i} className="flex items-center gap-2 bg-stone-900/50 p-1.5 rounded border border-stone-800">
                                                    <input type="number" value={item.count} onChange={e => {
                                                        const newItems = [...(section.items || [])]; newItems[i].count = parseInt(e.target.value); updateSection(section.id, {items: newItems});
                                                    }} className="w-12 bg-stone-800 text-center text-xs text-stone-400 rounded border border-stone-700"/>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm truncate ${item.is_magic ? 'text-amber-500' : 'text-stone-300'}`}>{item.name}</div>
                                                    </div>
                                                    <button type="button" onClick={() => {
                                                        const newItems = [...(section.items || [])]; newItems.splice(i, 1); updateSection(section.id, {items: newItems});
                                                    }} className="text-stone-600 hover:text-red-500 px-2">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-stone-800">
                    <button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all disabled:opacity-50">
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Pin'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
