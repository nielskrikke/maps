
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey, uploadFile } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../App';
import { useAppContext } from '../contexts/AppContext';
import { useItems, ApiItem } from './ItemProvider';
import { Map as MapType, Pin, PinData, PinType, PinSectionType, PinSection, InventoryItem, Character, CharacterRelationship, MapTypeEnum, UserProfile } from '../types';
import { Icon } from './Icons';
import MapViewer from './MapViewer';
import { cn } from '../lib/utils';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div 
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <div 
                className={cn(
                    "w-full rounded-2xl bg-dnd-panel/90 backdrop-blur-2xl border border-white/10 p-5 shadow-2xl flex flex-col max-h-[90vh] relative z-10",
                    maxWidthClass
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 flex-shrink-0">
                    <h2 className="text-xl font-serif font-bold text-white tracking-tight">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="rounded-full p-1.5 text-dnd-text/40 transition-all hover:bg-white/5 hover:text-white"
                    >
                        <Icon name="close" className="h-5 w-5" />
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
        <Modal isOpen={isOpen} onClose={onClose} title="Sanctum Controls" maxWidthClass="max-w-md">
            <div className="space-y-6">
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20 mb-4">World Weaver</h3>
                    <button onClick={() => handleAction(onMapManagerOpen)} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-dnd-gold/30 transition-all group text-left shadow-lg">
                        <div className="p-3 rounded-xl bg-dnd-dark text-dnd-gold group-hover:scale-110 transition-transform">
                            <Icon name="map" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-white">Cartography</div>
                            <div className="text-xs text-dnd-text/40">Forge and refine your realms</div>
                        </div>
                    </button>
                    
                    <button onClick={() => handleAction(onCharacterManagerOpen)} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-dnd-gold/30 transition-all group text-left shadow-lg">
                        <div className="p-3 rounded-xl bg-dnd-dark text-dnd-gold group-hover:scale-110 transition-transform">
                            <Icon name="user" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-white">Souls & Shadows</div>
                            <div className="text-xs text-dnd-text/40">Manifest NPCs and legends</div>
                        </div>
                    </button>

                    <button onClick={() => handleAction(onPinTypeManagerOpen)} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-dnd-gold/30 transition-all group text-left shadow-lg">
                        <div className="p-3 rounded-xl bg-dnd-dark text-dnd-gold group-hover:scale-110 transition-transform">
                            <Icon name="tag" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-white">Sigil Mastery</div>
                            <div className="text-xs text-dnd-text/40">Define the marks of your world</div>
                        </div>
                    </button>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20 mb-4">The Covenant</h3>
                    <button onClick={() => handleAction(onPlayerManagerOpen)} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-dnd-gold/30 transition-all group text-left shadow-lg">
                        <div className="p-3 rounded-xl bg-dnd-dark text-dnd-text/40 group-hover:text-white transition-colors">
                            <Icon name="shield" className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-white">Seeker Registry</div>
                            <div className="text-xs text-dnd-text/40">Manage players and their fates</div>
                        </div>
                    </button>
                </div>

                <div className="pt-6 border-t border-white/5">
                    <button onClick={onSignOut} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-dnd-red/10 hover:bg-dnd-red/20 border border-dnd-red/20 text-dnd-red hover:brightness-125 transition-all font-bold uppercase tracking-widest text-xs shadow-xl shadow-dnd-red/10">
                        <Icon name="logout" className="w-5 h-5" />
                        Sever Connection
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
            
            setMsg({ type: 'success', text: "Essence updated. Manifesting changes..." });
            
            setTimeout(() => {
                 window.location.reload(); 
            }, 1000);

        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Soul Resonance">
            <form onSubmit={handleSave} className="space-y-8">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-dnd-dark border-2 border-white/10 flex items-center justify-center overflow-hidden relative group shadow-2xl ring-4 ring-white/5">
                        {imageUrl ? <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="font-serif text-5xl text-dnd-text/20">{username.charAt(0)}</span>}
                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                            <Icon name="upload" className="w-8 h-8 text-white"/>
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                if(e.target.files?.[0]) setImageUrl(await fileToBase64(e.target.files[0]));
                            }}/>
                        </label>
                    </div>
                    <div className="flex gap-3 w-full max-w-sm">
                         <input 
                            type="text" 
                            placeholder="Portrait URL" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)} 
                            className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all"
                        />
                         {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="p-2 text-dnd-text/20 hover:text-dnd-red transition-colors"><Icon name="trash" className="w-4 h-4"/></button>}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Manifested Name</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                    />
                    <p className="text-[10px] text-dnd-gold/60 italic font-medium">This name will be chronicled in the world's history.</p>
                </div>

                {msg && (
                    <div 
                        className={cn(
                            "p-4 rounded-2xl text-sm font-bold border",
                            msg.type === 'success' ? 'bg-green-900/10 border-green-500/20 text-green-400' : 'bg-dnd-red/10 border-dnd-red/20 text-dnd-red'
                        )}
                    >
                        {msg.text}
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                    <button type="button" onClick={onClose} className="text-dnd-text/40 hover:text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Cancel</button>
                    <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold px-8 py-3 rounded-2xl shadow-xl shadow-dnd-gold/20 disabled:opacity-50 transition-all uppercase tracking-widest text-xs">
                        {loading ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : 'Commit Changes'}
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
        <Modal isOpen={isOpen} onClose={onClose} title="Seeker Registry" maxWidthClass="max-w-4xl">
            <div className="flex gap-4 mb-8 border-b border-white/5 pb-4">
                <button 
                    onClick={() => setView('list')} 
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                        view === 'list' ? 'bg-white/10 text-white border border-white/10' : 'text-dnd-text/40 hover:text-white'
                    )}
                >
                    Registry List
                </button>
                <button 
                    onClick={() => setView('create')} 
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                        view === 'create' ? 'bg-white/10 text-white border border-white/10' : 'text-dnd-text/40 hover:text-white'
                    )}
                >
                    Manifest Seeker
                </button>
            </div>

            {view === 'list' && (
                <div className="space-y-4">
                    {loading && users.length === 0 && <div className="text-center py-8"><Icon name="spinner" className="animate-spin h-8 w-8 mx-auto text-dnd-gold"/></div>}
                    {!loading && users.length === 0 && <p className="text-center text-dnd-text/20 py-8 italic">No seekers have been chronicled yet.</p>}
                    
                    <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {users.map(u => (
                            <div key={u.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-dnd-gold/20 transition-all shadow-lg">
                                {editingUser?.id === u.id ? (
                                    <div className="flex items-center gap-4 flex-1">
                                        <input 
                                            type="text" 
                                            value={editingUser.username} 
                                            onChange={e => setEditingUser({...editingUser, username: e.target.value})} 
                                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex-1 focus:outline-none focus:border-dnd-gold/50"
                                        />
                                        <select 
                                            value={editingUser.role} 
                                            onChange={e => setEditingUser({...editingUser, role: e.target.value as any})} 
                                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white w-32 focus:outline-none focus:border-dnd-gold/50"
                                        >
                                            <option value="Player">Player</option>
                                            <option value="DM">DM</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button onClick={handleUpdateUser} className="text-green-500 hover:brightness-125 p-2 bg-white/5 rounded-lg transition-all"><Icon name="check" className="w-5 h-5"/></button>
                                            <button onClick={() => setEditingUser(null)} className="text-dnd-red hover:brightness-125 p-2 bg-white/5 rounded-lg transition-all"><Icon name="close" className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-dnd-dark overflow-hidden flex-shrink-0 ring-2 ring-white/5 shadow-lg">
                                                {u.image_url ? <img src={u.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-dnd-text/20 font-bold text-lg">{u.username.charAt(0)}</div>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-base">{u.username}</p>
                                                <p className="text-[10px] text-dnd-gold/60 uppercase tracking-widest font-bold mt-1">{u.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => setEditingUser(u)} className="p-2.5 bg-white/5 hover:bg-dnd-gold/20 rounded-xl text-dnd-text/40 hover:text-dnd-gold transition-all"><Icon name="pencil" className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 bg-white/5 hover:bg-dnd-red/20 rounded-xl text-dnd-text/40 hover:text-dnd-red transition-all" disabled={u.id === user?.id}><Icon name="trash" className="w-4 h-4"/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'create' && (
                 <form onSubmit={handleCreateSubmit} className="space-y-8">
                    <div className="bg-dnd-gold/5 p-6 rounded-2xl border border-dnd-gold/10 mb-4 shadow-inner">
                        <p className="text-sm text-dnd-text/60 leading-relaxed">
                            Manifest a new seeker in this realm. They will log in using only the name provided below.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Seeker Name</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                            placeholder="e.g. Elara" 
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Destiny (Role)</label>
                        <div className="flex gap-4">
                            <label className={cn(
                                "flex-1 cursor-pointer rounded-2xl border px-6 py-4 text-center transition-all shadow-lg",
                                role === 'Player' ? 'bg-dnd-gold/10 border-dnd-gold/30 text-dnd-gold' : 'bg-white/5 border-white/5 text-dnd-text/40 hover:bg-white/10'
                            )}>
                                <input type="radio" className="hidden" checked={role === 'Player'} onChange={() => setRole('Player')} />
                                <span className="font-bold uppercase tracking-widest text-xs">Seeker</span>
                            </label>
                            <label className={cn(
                                "flex-1 cursor-pointer rounded-2xl border px-6 py-4 text-center transition-all shadow-lg",
                                role === 'DM' ? 'bg-dnd-red/10 border-dnd-red/30 text-dnd-red' : 'bg-white/5 border-white/5 text-dnd-text/40 hover:bg-white/10'
                            )}>
                                <input type="radio" className="hidden" checked={role === 'DM'} onChange={() => setRole('DM')} />
                                <span className="font-bold uppercase tracking-widest text-xs">Weaver</span>
                            </label>
                        </div>
                    </div>

                    {status && (
                        <div 
                            className={cn(
                                "p-4 rounded-2xl border text-sm font-bold",
                                status.type === 'success' ? 'bg-green-900/10 border-green-500/20 text-green-400' : 'bg-dnd-red/10 border-dnd-red/20 text-dnd-red'
                            )}
                        >
                            {status.msg}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin mx-auto"/> : 'Manifest Seeker'}
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
    const { maps, updateLocalMap, removeLocalItem, setError } = useAppContext();
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
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `map_${Date.now()}.${fileExt}`;
                finalImageUrl = await uploadFile('assets', `${user.id}/${fileName}`, imageFile);
            }

            const payload: any = {
                name,
                image_url: finalImageUrl,
                parent_map_id: parentMapId || null,
                is_visible: isVisible,
                grid_size: gridSize,
                pin_scale: pinScale,
                is_grid_visible: isGridVisible,
                map_type: mapType,
            };

            if (!isEditing) {
                payload.created_by = user.id;
            }

            let data;
            let res;
            if (isEditing && editingMap?.id) {
                res = await supabase.from('maps').update(payload).eq('id', editingMap.id).select().single();
                data = res.data;
            } else {
                res = await supabase.from('maps').insert(payload).select().single();
                data = res.data;
            }

            if (data) {
                updateLocalMap(data as MapType);
            } else if (res.error) {
                setError({ message: "Error saving map", details: res.error });
            }

            resetForm();
        } catch (error: any) {
            console.error(error);
            setError({ message: "Error saving map", details: error });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This will delete the map and all its pins.")) return;
        setLoading(true);
        const { error } = await supabase.from('maps').delete().eq('id', id);
        if (!error) {
            removeLocalItem('map', id);
        } else {
            setError({ message: "Error deleting map", details: error });
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cartography Sanctum" maxWidthClass="max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* List */}
                <div className="md:col-span-1 border-r border-white/5 pr-6 space-y-6">
                    <button onClick={resetForm} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-lg group">
                        <Icon name="plus" className="h-5 w-5 text-dnd-gold group-hover:rotate-90 transition-transform" />
                        <span className="text-xs uppercase tracking-widest">New Realm</span>
                    </button>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {maps.map(map => (
                            <div key={map.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                                <span className="text-sm text-dnd-text/60 truncate font-medium group-hover:text-white">{map.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleEdit(map)} className="p-2 hover:text-dnd-gold text-dnd-text/20 transition-colors"><Icon name="pencil" className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(map.id)} className="p-2 hover:text-dnd-red text-dnd-text/20 transition-colors"><Icon name="trash" className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form */}
                <div className="md:col-span-2">
                    <h3 className="text-2xl font-serif text-white font-bold mb-8 border-b border-white/5 pb-4">{isEditing ? 'Refine Realm' : 'Forge New Realm'}</h3>
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Realm Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. The Whispering Woods" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    required 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                />
                             </div>
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Realm Type</label>
                                <select 
                                    value={mapType} 
                                    onChange={e => setMapType(e.target.value as MapTypeEnum)} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-4 text-dnd-text/60 capitalize focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner font-bold"
                                >
                                    <option value="world">World Map</option>
                                    <option value="region">Region Map</option>
                                    <option value="city">City/Settlement</option>
                                    <option value="dungeon">Dungeon/Interior</option>
                                    <option value="battlemap">Battlemap</option>
                                </select>
                             </div>
                        </div>
                        
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 shadow-inner">
                             <div className="flex items-center gap-4 mb-6">
                                <label className={cn(
                                    "cursor-pointer px-6 py-3 rounded-xl text-[10px] text-white font-bold uppercase tracking-widest transition-all shadow-lg",
                                    isEditing ? 'bg-dnd-gold/80 hover:brightness-110' : 'bg-white/10 hover:bg-white/20'
                                )}>
                                    {isEditing ? 'Replace Visage' : 'Upload Visage'}
                                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                                        if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setImageUrl(''); }
                                    }} />
                                </label>
                                <span className="text-[10px] text-dnd-text/20 font-bold uppercase tracking-widest">OR</span>
                                <input 
                                    type="text" 
                                    placeholder="Visage URL" 
                                    value={imageUrl} 
                                    onChange={e => { setImageUrl(e.target.value); setImageFile(null); }} 
                                    className="flex-1 bg-transparent border-b border-white/5 text-xs text-dnd-text/60 py-2 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                />
                            </div>
                            {(imageUrl || (imageFile && URL.createObjectURL(imageFile))) && (
                                <div className="relative group">
                                    <img src={imageUrl || (imageFile ? URL.createObjectURL(imageFile) : '')} className="h-48 w-full object-cover rounded-2xl border border-white/10 shadow-2xl" alt="Preview" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                        <span className="text-white font-bold uppercase tracking-widest text-[10px]">Previewing Visage</span>
                                    </div>
                                </div>
                            )}
                             {isEditing && (
                                <p className="text-[10px] text-dnd-text/40 mt-4 italic font-medium leading-relaxed">Note: Replacing the visage will preserve all sigils in their relative positions. Ensure the new visage maintains the same aspect ratio.</p>
                             )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Parent Realm</label>
                                <select 
                                    value={parentMapId} 
                                    onChange={e => setParentMapId(e.target.value)} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner font-bold"
                                >
                                    <option value="">(None - Top Level)</option>
                                    {maps.filter(m => m.id !== editingMap?.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                             </div>
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Grid Density (px)</label>
                                <input 
                                    type="number" 
                                    value={gridSize} 
                                    onChange={e => setGridSize(parseInt(e.target.value))} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                />
                             </div>
                        </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Sigil Scale (px)</label>
                                <input 
                                    type="number" 
                                    value={pinScale} 
                                    onChange={e => setPinScale(parseInt(e.target.value))} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                />
                             </div>
                             <div className="flex flex-col justify-end gap-3">
                                <label className="flex items-center gap-3 cursor-pointer text-xs text-dnd-text/60 font-bold uppercase tracking-widest group">
                                    <div className={cn(
                                        "w-5 h-5 rounded border border-white/10 flex items-center justify-center transition-all",
                                        isGridVisible ? 'bg-dnd-gold border-dnd-gold' : 'bg-black/20'
                                    )}>
                                        {isGridVisible && <Icon name="check" className="w-3 h-3 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={isGridVisible} onChange={e => setIsGridVisible(e.target.checked)} />
                                    Show Grid Overlay
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer text-xs text-dnd-text/60 font-bold uppercase tracking-widest group">
                                    <div className={cn(
                                        "w-5 h-5 rounded border border-white/10 flex items-center justify-center transition-all",
                                        isVisible ? 'bg-dnd-gold border-dnd-gold' : 'bg-black/20'
                                    )}>
                                        {isVisible && <Icon name="check" className="w-3 h-3 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} />
                                    Visible to Seekers
                                </label>
                             </div>
                         </div>

                        <div className="flex justify-end pt-8 border-t border-white/5">
                             <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Commit Realm'}
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
    const { pinTypes, updateLocalPinType, removeLocalItem } = useAppContext();
    const { user } = useAuth();
    const [editingType, setEditingType] = useState<Partial<PinType> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📍');
    const [color, setColor] = useState('#c9ad6a');
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setEditingType(null); setIsEditing(false);
        setName(''); setEmoji('📍'); setColor('#c9ad6a');
    };

    const handleEdit = (pt: PinType) => {
        setEditingType(pt); setIsEditing(true);
        setName(pt.name); setEmoji(pt.emoji || '📍'); setColor(pt.color);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        const payload: any = { name, emoji, color };
        let data;

        if (isEditing && editingType?.id) {
            const res = await supabase.from('pin_types').update(payload).eq('id', editingType.id).select().single();
            data = res.data;
        } else {
            payload.created_by = user.id;
            const res = await supabase.from('pin_types').insert(payload).select().single();
            data = res.data;
        }

        if (data) updateLocalPinType(data as PinType);

        setLoading(false);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Sever this sigil type? Existing sigils will remain but their essence may fade.")) return;
        setLoading(true);
        const { error } = await supabase.from('pin_types').delete().eq('id', id);
        if(!error) removeLocalItem('pintype', id);
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sigil Weaver" maxWidthClass="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-1 border-r border-white/5 pr-6 space-y-6">
                     <button onClick={resetForm} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-lg group">
                        <Icon name="plus" className="h-5 w-5 text-dnd-gold group-hover:rotate-90 transition-transform" />
                        <span className="text-xs uppercase tracking-widest">New Sigil</span>
                    </button>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {pinTypes.map(pt => (
                            <div key={pt.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => handleEdit(pt)}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl" style={{color: pt.color}}>{pt.emoji}</span>
                                    <span className="text-sm text-dnd-text/60 font-medium group-hover:text-white">{pt.name}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(pt); }} className="p-2 hover:text-dnd-gold text-dnd-text/20 transition-colors"><Icon name="pencil" className="w-4 h-4"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(pt.id); }} className="p-2 hover:text-dnd-red text-dnd-text/20 transition-colors"><Icon name="trash" className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-2">
                    <h3 className="text-2xl font-serif text-white font-bold mb-8 border-b border-white/5 pb-4">{isEditing ? 'Refine Sigil' : 'Forge New Sigil'}</h3>
                    <form onSubmit={handleSave} className="space-y-8">
                         <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Sigil Name</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                required 
                                className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                placeholder="e.g. Ancient Ruin"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Icon (Emoji)</label>
                                <input 
                                    type="text" 
                                    value={emoji} 
                                    onChange={e => setEmoji(e.target.value)} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-4 text-2xl text-center focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                />
                            </div>
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Aura Color</label>
                                <div className="flex gap-4 items-center">
                                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/5">
                                        <input 
                                            type="color" 
                                            value={color} 
                                            onChange={e => setColor(e.target.value)} 
                                            className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer" 
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={color} 
                                        onChange={e => setColor(e.target.value)} 
                                        className="flex-1 rounded-2xl border border-white/5 bg-black/20 px-4 py-4 text-xs text-dnd-text/60 font-mono focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-inner flex flex-col items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Sigil Preview</span>
                            <div className="relative">
                                <div className="absolute inset-0 blur-xl opacity-40 rounded-full" style={{ backgroundColor: color }}></div>
                                <div className="relative w-20 h-20 rounded-2xl bg-dnd-dark border-2 border-white/10 flex items-center justify-center text-4xl shadow-2xl" style={{ borderColor: `${color}40` }}>
                                    {emoji}
                                </div>
                            </div>
                            <span className="text-white font-bold tracking-tight">{name || 'Unnamed Sigil'}</span>
                        </div>

                         <div className="flex justify-end pt-8 border-t border-white/5">
                             <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Bind Sigil'}
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
    const { characters, updateLocalCharacter, removeLocalItem, setError } = useAppContext();
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
    const [isVisible, setIsVisible] = useState(true);
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setEditingChar(null); setIsEditing(false);
        setName(''); setRace(''); setCharClass(''); setLevel(1); setAlignment('');
        setBackstory(''); setGmNotes(''); setImageUrl(''); setSheetUrl(''); setIsNpc(true); setIsVisible(true);
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

        const payload: any = {
            name,
            role_details: { race, class: charClass, level, alignment },
            backstory,
            gm_notes: gmNotes,
            image_url: imageUrl,
            sheet_url: sheetUrl,
            is_npc: isNpc,
            is_visible: isVisible,
        };

        if (!isEditing) {
            payload.created_by = user.id;
        }

        let data;
        if (isEditing && editingChar?.id) {
            const res = await supabase.from('characters').update(payload).eq('id', editingChar.id).select().single();
            data = res.data;
        } else {
            const res = await supabase.from('characters').insert(payload).select().single();
            data = res.data;
        }

        if (data) updateLocalCharacter(data as Character);

        setLoading(false);
        resetForm();
    };
    
    const handleDelete = async (id: string) => {
        if(!confirm("Sever the thread of this soul? This action is irreversible.")) return;
        setLoading(true);
        const { error } = await supabase.from('characters').delete().eq('id', id);
        if (!error) removeLocalItem('character', id);
        setLoading(false);
    };

    return (
         <Modal isOpen={isOpen} onClose={onClose} title="Souls & Shadows" maxWidthClass="max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="md:col-span-1 border-r border-white/5 pr-6 space-y-6">
                    <button onClick={resetForm} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-lg group">
                        <Icon name="plus" className="h-5 w-5 text-dnd-gold group-hover:rotate-90 transition-transform" />
                        <span className="text-xs uppercase tracking-widest">Manifest Soul</span>
                    </button>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                        {characters.map(c => (
                            <div key={c.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => handleEdit(c)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-dnd-dark overflow-hidden ring-2 ring-white/5 shadow-lg">
                                        {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-dnd-text/20 font-bold">{c.name.charAt(0)}</div>}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm text-white font-bold tracking-tight">{c.name}</div>
                                        <div className="text-[10px] text-dnd-gold/60 uppercase tracking-widest font-bold">{c.is_npc ? 'NPC' : 'PC'}</div>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-2 text-dnd-text/20 hover:text-dnd-red transition-colors opacity-0 group-hover:opacity-100"><Icon name="trash" className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-3">
                    <h3 className="text-2xl font-serif text-white font-bold mb-8 border-b border-white/5 pb-4">{isEditing ? 'Refine Soul' : 'Forge New Soul'}</h3>
                    <form onSubmit={handleSave} className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">True Name</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    required 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                />
                            </div>
                             <div className="flex gap-4 items-end">
                                <label className={cn(
                                    "flex-1 flex items-center justify-center gap-3 cursor-pointer rounded-2xl border px-4 py-4 transition-all shadow-lg",
                                    isNpc ? 'bg-dnd-gold/10 border-dnd-gold/30 text-dnd-gold' : 'bg-white/5 border-white/5 text-dnd-text/40'
                                )}>
                                    <input type="checkbox" checked={isNpc} onChange={e => setIsNpc(e.target.checked)} className="hidden" />
                                    <Icon name={isNpc ? 'check' : 'close'} className="w-4 h-4" />
                                    <span className="font-bold uppercase tracking-widest text-[10px]">NPC</span>
                                </label>
                                <label className={cn(
                                    "flex-1 flex items-center justify-center gap-3 cursor-pointer rounded-2xl border px-4 py-4 transition-all shadow-lg",
                                    isVisible ? 'bg-dnd-gold/10 border-dnd-gold/30 text-dnd-gold' : 'bg-white/5 border-white/5 text-dnd-text/40'
                                )}>
                                    <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="hidden" />
                                    <Icon name={isVisible ? 'check' : 'close'} className="w-4 h-4" />
                                    <span className="font-bold uppercase tracking-widest text-[10px]">Visible to Seekers</span>
                                </label>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Ancestry</label>
                                <input type="text" value={race} onChange={e => setRace(e.target.value)} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Calling</label>
                                <input type="text" value={charClass} onChange={e => setCharClass(e.target.value)} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Essence Level</label>
                                <input type="number" value={level} onChange={e => setLevel(parseInt(e.target.value))} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Moral Sigil</label>
                                <input type="text" value={alignment} onChange={e => setAlignment(e.target.value)} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Portrait Visage (URL)</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        value={imageUrl} 
                                        onChange={e => setImageUrl(e.target.value)} 
                                        className="flex-1 rounded-2xl border border-white/5 bg-black/20 px-5 py-3 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"
                                    />
                                    <label className="cursor-pointer p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all shadow-lg">
                                        <Icon name="upload" className="w-5 h-5 text-dnd-gold"/>
                                        <input type="file" className="hidden" onChange={async (e) => {
                                            if(e.target.files?.[0] && user) {
                                                const file = e.target.files[0];
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `char_${Date.now()}.${fileExt}`;
                                                try {
                                                    const url = await uploadFile('assets', `${user.id}/${fileName}`, file);
                                                    setImageUrl(url);
                                                } catch (err) {
                                                    setError({ message: "Upload failed", details: err });
                                                }
                                            }
                                        }} />
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Chronicle Link (Optional)</label>
                                <input 
                                    type="text" 
                                    value={sheetUrl} 
                                    onChange={e => setSheetUrl(e.target.value)} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-3 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"
                                    placeholder="e.g. D&D Beyond URL"
                                />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">The Chronicle (Backstory)</label>
                                <textarea 
                                    value={backstory} 
                                    onChange={e => setBackstory(e.target.value)} 
                                    rows={6} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-sm text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner custom-scrollbar"
                                />
                            </div>
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-red/60">Weaver's Secrets (DM Notes)</label>
                                <textarea 
                                    value={gmNotes} 
                                    onChange={e => setGmNotes(e.target.value)} 
                                    rows={6} 
                                    className="w-full rounded-2xl border border-dnd-red/20 bg-dnd-red/5 px-5 py-4 text-sm text-dnd-text/60 focus:outline-none focus:border-dnd-red/50 transition-all shadow-inner custom-scrollbar"
                                />
                            </div>
                         </div>

                         <div className="flex justify-end pt-8 border-t border-white/5">
                             <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Commit Soul'}
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
    onSave: (savedPin?: Pin) => Promise<void>;
}

export const PinEditorModal: React.FC<PinEditorModalProps> = ({ pinData, onClose, onSave }) => {
    const { pinTypes, maps, setError } = useAppContext();
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

        let result;
        try {
            if (pinData.id) {
                result = await supabase.from('pins').update(payload).eq('id', pinData.id).select('*, pin_types(*)').single();
            } else if (user) {
                result = await supabase.from('pins').insert({ ...payload, created_by: user.id }).select('*, pin_types(*)').single();
            }
            
            if (result?.error) {
                setError({ message: "Error saving sigil", details: result.error });
            }

            if (result?.data) {
                await onSave(result.data as Pin);
            } else {
                await onSave();
            }
        } catch (err: any) {
            setError({ message: "Error saving sigil", details: err });
            await onSave();
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={pinData.id ? "Refine Sigil" : "Forge Sigil"} maxWidthClass="max-w-5xl">
            <form onSubmit={handleSaveLocal} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Sigil Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            required 
                            className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                            autoFocus 
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Sigil Essence (Type)</label>
                        <select 
                            value={pinTypeId} 
                            onChange={e => setPinTypeId(e.target.value)} 
                            className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-4 text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner font-bold"
                        >
                            {pinTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.emoji} {pt.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-8 bg-white/5 p-6 rounded-3xl border border-white/5 shadow-inner">
                    <label className={cn(
                        "flex items-center gap-3 cursor-pointer text-[10px] font-bold uppercase tracking-widest transition-all",
                        isVisible ? 'text-dnd-gold' : 'text-dnd-text/20'
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                            isVisible ? 'bg-dnd-gold/20 border-dnd-gold' : 'bg-black/20 border-white/5'
                        )}>
                            {isVisible && <Icon name="check" className="w-4 h-4 text-dnd-gold" />}
                        </div>
                        <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="hidden" />
                        Visible to Seekers
                    </label>
                    <div className="hidden md:block h-8 w-px bg-white/5"></div>
                     <div className="flex-1 flex items-center gap-4 min-w-[200px]">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 whitespace-nowrap">Link to Realm:</span>
                         <select 
                            value={linkedMapId} 
                            onChange={e => setLinkedMapId(e.target.value)} 
                            className="flex-1 rounded-xl bg-black/20 border border-white/5 px-4 py-2 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all"
                        >
                            <option value="">(None)</option>
                            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                         </select>
                     </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">The Primal Description</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        rows={4} 
                        className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-sm text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner custom-scrollbar"
                        placeholder="Describe the essence of this point in the weave..."
                    />
                </div>
                
                {/* Sections Editor */}
                <div className="space-y-6 pt-8 border-t border-white/5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Chronicle Sections</h3>
                        <div className="flex flex-wrap gap-2">
                             {(['text', 'image', 'list', 'statblock', 'inventory', 'secret'] as PinSectionType[]).map(type => (
                                 <button 
                                    key={type} 
                                    type="button" 
                                    onClick={() => addSection(type)} 
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] text-dnd-text/60 font-bold uppercase tracking-widest border border-white/5 transition-all shadow-sm flex items-center gap-2 group"
                                >
                                     <Icon name="plus" className="w-3 h-3 text-dnd-gold group-hover:rotate-90 transition-transform" />
                                     {type}
                                 </button>
                             ))}
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="bg-white/5 border border-white/5 rounded-3xl p-6 relative group shadow-lg backdrop-blur-sm">
                                <button 
                                    type="button" 
                                    onClick={() => removeSection(section.id)} 
                                    className="absolute top-4 right-4 p-2 text-dnd-text/20 hover:text-dnd-red transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Icon name="trash" className="w-4 h-4"/>
                                </button>
                                
                                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                                    <div className="bg-dnd-gold/10 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-dnd-gold self-start border border-dnd-gold/20">
                                        {section.type}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={section.title} 
                                        onChange={e => updateSection(section.id, {title: e.target.value})} 
                                        className="bg-transparent border-b border-white/5 text-white font-serif font-bold text-xl focus:outline-none focus:border-dnd-gold/50 w-full transition-all" 
                                        placeholder="Section Title"
                                    />
                                </div>

                                {section.type === 'text' && (
                                    <textarea 
                                        value={section.content} 
                                        onChange={e => updateSection(section.id, {content: e.target.value})} 
                                        rows={3} 
                                        className="w-full bg-black/20 rounded-2xl p-4 text-sm text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all custom-scrollbar" 
                                        placeholder="Weave your words here..."
                                    />
                                )}
                                
                                {section.type === 'secret' && (
                                    <textarea 
                                        value={section.content} 
                                        onChange={e => updateSection(section.id, {content: e.target.value})} 
                                        rows={3} 
                                        className="w-full bg-dnd-red/5 rounded-2xl p-4 text-sm text-dnd-text/60 border border-dnd-red/20 focus:outline-none focus:border-dnd-red/50 transition-all custom-scrollbar" 
                                        placeholder="Whispers for the Weaver's ears only..."
                                    />
                                )}

                                {section.type === 'list' && (
                                     <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Items of Note (One per line)</p>
                                        <textarea 
                                            value={section.list_items?.join('\n') || ''} 
                                            onChange={e => updateSection(section.id, {list_items: e.target.value.split('\n')})} 
                                            rows={4} 
                                            className="w-full bg-black/20 rounded-2xl p-4 text-sm text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all custom-scrollbar" 
                                            placeholder="Item I&#10;Item II&#10;Item III"
                                        />
                                    </div>
                                )}
                                
                                {section.type === 'image' && (
                                    <div className="space-y-4">
                                        <div className="flex gap-4 items-center">
                                             <input 
                                                type="text" 
                                                value={section.image_url || ''} 
                                                onChange={e => updateSection(section.id, {image_url: e.target.value})} 
                                                className="flex-1 bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                placeholder="Visage URL..."
                                            />
                                             <label className="cursor-pointer p-3 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 transition-all shadow-md group">
                                                <Icon name="upload" className="w-4 h-4 text-dnd-gold group-hover:scale-110 transition-transform"/>
                                                <input type="file" className="hidden" accept="image/*" onChange={async e => {
                                                    if(e.target.files?.[0] && user) {
                                                        const file = e.target.files[0];
                                                        const fileExt = file.name.split('.').pop();
                                                        const fileName = `pin_${Date.now()}.${fileExt}`;
                                                        try {
                                                            const url = await uploadFile('assets', `${user.id}/${fileName}`, file);
                                                            updateSection(section.id, {image_url: url});
                                                        } catch (err) {
                                                            setError({ message: "Upload failed", details: err });
                                                        }
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                        {section.image_url && (
                                            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                                <img src={section.image_url} className="max-h-60 w-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {section.type === 'statblock' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {section.stats?.map((stat, i) => (
                                                <div key={i} className="flex gap-2 group/stat">
                                                    <input 
                                                        type="text" 
                                                        value={stat.label} 
                                                        onChange={e => {
                                                            const newStats = [...(section.stats || [])]; newStats[i].label = e.target.value; updateSection(section.id, {stats: newStats});
                                                        }} 
                                                        className="w-1/3 bg-dnd-gold/5 rounded-xl p-2 text-[10px] text-dnd-gold font-bold uppercase tracking-widest border border-dnd-gold/20 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                        placeholder="Label"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={stat.value} 
                                                        onChange={e => {
                                                            const newStats = [...(section.stats || [])]; newStats[i].value = e.target.value; updateSection(section.id, {stats: newStats});
                                                        }} 
                                                        className="flex-1 bg-black/20 rounded-xl p-2 text-xs text-white font-bold border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                        placeholder="Value"
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newStats = [...(section.stats || [])]; newStats.splice(i, 1); updateSection(section.id, {stats: newStats});
                                                        }} 
                                                        className="text-dnd-text/20 hover:text-dnd-red px-2 transition-colors"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => updateSection(section.id, {stats: [...(section.stats || []), {label: '', value: ''}]})} 
                                            className="text-[10px] text-dnd-gold hover:brightness-110 font-bold uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <Icon name="plus" className="w-3 h-3" />
                                            Add Attribute
                                        </button>
                                    </div>
                                )}

                                {section.type === 'inventory' && (
                                    <div className="space-y-6">
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dnd-text/20">
                                                <Icon name="search" className="w-4 h-4" />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={itemSearch} 
                                                onChange={e => setItemSearch(e.target.value)} 
                                                className="w-full bg-black/20 rounded-2xl pl-12 pr-6 py-4 text-sm text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                                placeholder="Search the Great Archives for items..."
                                            />
                                            {itemSearch && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-dnd-panel border border-white/10 rounded-2xl max-h-60 overflow-y-auto z-20 shadow-2xl backdrop-blur-xl custom-scrollbar">
                                                    {allItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 15).map(item => (
                                                        <button 
                                                            key={item.index} 
                                                            type="button" 
                                                            onClick={() => { addItemToSection(section.id, item); setItemSearch(''); }} 
                                                            className="w-full text-left px-6 py-3 text-sm text-dnd-text/60 hover:bg-dnd-gold/10 hover:text-dnd-gold transition-all border-b border-white/5 last:border-0"
                                                        >
                                                            {item.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                            {section.items?.map((item, i) => (
                                                <div key={item.id || i} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 group/item hover:border-dnd-gold/20 transition-all">
                                                    <input 
                                                        type="number" 
                                                        value={item.count} 
                                                        onChange={e => {
                                                            const newItems = [...(section.items || [])]; newItems[i].count = parseInt(e.target.value); updateSection(section.id, {items: newItems});
                                                        }} 
                                                        className="w-12 bg-black/40 text-center text-xs text-dnd-gold font-bold rounded-lg border border-white/5 py-1"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className={cn(
                                                            "text-sm font-bold truncate tracking-tight",
                                                            item.is_magic ? 'text-dnd-gold' : 'text-white'
                                                        )}>{item.name}</div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newItems = [...(section.items || [])]; newItems.splice(i, 1); updateSection(section.id, {items: newItems});
                                                        }} 
                                                        className="text-dnd-text/20 hover:text-dnd-red px-2 transition-colors"
                                                    >
                                                        <Icon name="close" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-white/5">
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                    >
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Commit Sigil'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
