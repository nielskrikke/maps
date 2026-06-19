
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey, uploadFile } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../App';
import { useAppContext } from '../contexts/AppContext';
import { useItems, ApiItem } from './ItemProvider';
import { Map as MapType, Pin, PinData, PinType, PinSectionType, PinSection, InventoryItem, Character, CharacterRelationship, MapTypeEnum, UserProfile, WikiPage, Clock, MapLabel } from '../types';
import { Icon } from './Icons';
import { RichTextEditor } from './RichTextEditor';
import MapViewer from './MapViewer';
import { cn } from '../lib/utils';
import { ProgressClock } from './ProgressClock';

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

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-2xl' }) => {
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
                {title !== '' && (
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 flex-shrink-0">
                        <h2 className="text-xl font-serif font-bold text-white tracking-tight">{title}</h2>
                        <button 
                            onClick={onClose} 
                            className="rounded-full p-1.5 text-dnd-text/40 transition-all hover:bg-white/5 hover:text-white"
                        >
                            <Icon name="close" className="h-5 w-5" />
                        </button>
                    </div>
                )}
                {title === '' && (
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-dnd-text/40 transition-all hover:bg-white/5 hover:text-white"
                    >
                        <Icon name="close" className="h-5 w-5" />
                    </button>
                )}
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">{children}</div>
            </div>
        </div>
    );
};

// Confirmation Modal
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, onClose, onConfirm, title, message, 
    confirmLabel = 'Confirm', cancelLabel = 'Cancel', isDanger = true 
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidthClass="max-w-md">
            <div className="space-y-6">
                <p className="text-dnd-text/60 leading-relaxed">{message}</p>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-xs uppercase tracking-widest outline-none"
                    >
                        {cancelLabel}
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={cn(
                            "px-6 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest shadow-xl outline-none",
                            isDanger ? "bg-dnd-red text-white shadow-dnd-red/20 hover:brightness-110" : "bg-dnd-gold text-white shadow-dnd-gold/20 hover:brightness-110"
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- DM TOOLS MODAL ---
interface DMToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMapManagerOpen: () => void;
    onCharacterManagerOpen: () => void;
    onPinTypeManagerOpen: () => void;
    onWikiPageManagerOpen: () => void;
    onPlayerManagerOpen: () => void;
    onClockManagerOpen: () => void;
    onFactionManagerOpen: () => void;
    onSignOut: () => void;
    onUserSettingsOpen: () => void;
}

export const DMToolsModal: React.FC<DMToolsModalProps> = ({
    isOpen, onClose, onMapManagerOpen, onCharacterManagerOpen, onPinTypeManagerOpen, onWikiPageManagerOpen, onPlayerManagerOpen, onClockManagerOpen, onFactionManagerOpen, onSignOut, onUserSettingsOpen
}) => {
    const { user } = useAuth();
    const handleAction = (action: () => void) => {
        onClose();
        action();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="DM Tools" maxWidthClass="max-w-md">
            <div className="space-y-4">
                {/* DM Profile Header */}
                {user && (
                    <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/5 shadow-md flex items-center justify-between group-hover:border-dnd-gold/10 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-dnd-dark border border-white/10 overflow-hidden text-dnd-gold shadow-xl flex-shrink-0">
                                {user.profile.image_url ? (
                                    <img src={user.profile.image_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <span className="font-serif font-bold text-sm">{user.profile.username.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-sm text-white truncate">{user.profile.username}</div>
                                <div className="text-[10px] text-dnd-gold/60 uppercase tracking-widest font-bold mt-0.5">Dungeon Master</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleAction(onUserSettingsOpen)} 
                            className="p-2 px-3 bg-white/5 hover:bg-dnd-gold/20 hover:text-dnd-gold text-dnd-text/40 rounded-xl border border-white/5 hover:border-dnd-gold/20 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                            title="Profile Settings"
                        >
                            <Icon name="settings" className="w-3.5 h-3.5" />
                            Settings
                        </button>
                    </div>
                )}

                <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/10 mb-2 px-1">Management</h3>
                    <button onClick={() => handleAction(onClockManagerOpen)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-dnd-gold/20 transition-all group text-left shadow-md">
                        <div className="p-2.5 rounded-lg bg-dnd-dark text-dnd-gold group-hover:scale-105 transition-transform">
                            <Icon name="clock" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">Progress Clocks</div>
                            <div className="text-[10px] text-dnd-text/30">Track complexity and time</div>
                        </div>
                    </button>

                    <button onClick={() => handleAction(onFactionManagerOpen)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-dnd-gold/20 transition-all group text-left shadow-md">
                        <div className="p-2.5 rounded-lg bg-dnd-dark text-dnd-gold group-hover:scale-105 transition-transform">
                            <Icon name="shield" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">Faction Reputation</div>
                            <div className="text-[10px] text-dnd-text/30">Track faction relation matrix and reputation</div>
                        </div>
                    </button>

                    <button onClick={() => handleAction(onMapManagerOpen)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-dnd-gold/20 transition-all group text-left shadow-md">
                        <div className="p-2.5 rounded-lg bg-dnd-dark text-dnd-gold group-hover:scale-105 transition-transform">
                            <Icon name="map" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">Maps</div>
                            <div className="text-[10px] text-dnd-text/30">Manage your maps and regions</div>
                        </div>
                    </button>
                    
                    <button onClick={() => handleAction(onCharacterManagerOpen)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-dnd-gold/20 transition-all group text-left shadow-md">
                        <div className="p-2.5 rounded-lg bg-dnd-dark text-dnd-gold group-hover:scale-105 transition-transform">
                            <Icon name="user" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">Characters</div>
                            <div className="text-[10px] text-dnd-text/30">Manage NPCs and legends</div>
                        </div>
                    </button>

                    <button onClick={() => handleAction(onPinTypeManagerOpen)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-dnd-gold/20 transition-all group text-left shadow-md">
                        <div className="p-2.5 rounded-lg bg-dnd-dark text-dnd-gold group-hover:scale-105 transition-transform">
                            <Icon name="tag" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">Pin Types</div>
                            <div className="text-[10px] text-dnd-text/30">Define the marks of your world</div>
                        </div>
                    </button>

                    <button onClick={() => handleAction(onWikiPageManagerOpen)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-dnd-gold/20 transition-all group text-left shadow-md">
                        <div className="p-2.5 rounded-lg bg-dnd-dark text-dnd-gold group-hover:scale-105 transition-transform">
                            <Icon name="book" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">Wiki Pages</div>
                            <div className="text-[10px] text-dnd-text/30">Manage the lore of your realm</div>
                        </div>
                    </button>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/10 mb-2 px-1">Users</h3>
                    <button onClick={() => handleAction(onPlayerManagerOpen)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-dnd-gold/20 transition-all group text-left shadow-md">
                        <div className="p-2.5 rounded-lg bg-dnd-dark text-dnd-text/20 group-hover:text-white transition-colors">
                            <Icon name="shield" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">User Manager</div>
                            <div className="text-[10px] text-dnd-text/30">Manage players and their roles</div>
                        </div>
                    </button>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button onClick={onSignOut} className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-dnd-red/10 border border-white/5 hover:border-dnd-red/20 text-dnd-text/30 hover:text-dnd-red transition-all font-bold uppercase tracking-widest text-[10px]">
                        <Icon name="logout" className="w-4 h-4" />
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
    const { user, signOut } = useAuth();
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
        <Modal isOpen={isOpen} onClose={onClose} title="User Settings">
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
                            placeholder="Image URL" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)} 
                            className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all"
                        />
                         {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="p-2 text-dnd-text/20 hover:text-dnd-red transition-colors"><Icon name="trash" className="w-4 h-4"/></button>}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                    />
                    <p className="text-[10px] text-dnd-gold/60 italic font-medium">This name will be recorded in the world's history.</p>
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

                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <button 
                        type="button" 
                        onClick={() => signOut()} 
                        className="flex items-center gap-2 text-dnd-text/20 hover:text-dnd-red transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <Icon name="logout" className="w-4 h-4" />
                        Sign Out
                    </button>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="text-dnd-text/40 hover:text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Cancel</button>
                        <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold px-8 py-3 rounded-2xl shadow-xl shadow-dnd-gold/20 disabled:opacity-50 transition-all uppercase tracking-widest text-xs">
                            {loading ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

// --- PLAYER MANAGER MODAL ---
interface PlayerManagerModalProps { isOpen: boolean; onClose: () => void; }
export const PlayerManagerModal: React.FC<PlayerManagerModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { setError } = useAppContext();
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
            setError({ message: "Error updating user", details: e });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        setLoading(true);
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) {
            setError({ message: "Error deleting user", details: error });
        } else {
            fetchUsers();
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="User Manager" maxWidthClass="max-w-4xl">
            <div className="flex gap-4 mb-8 border-b border-white/5 pb-4">
                <button 
                    onClick={() => setView('list')} 
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                        view === 'list' ? 'bg-white/10 text-white border border-white/10' : 'text-dnd-text/40 hover:text-white'
                    )}
                >
                    User List
                </button>
                <button 
                    onClick={() => setView('create')} 
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                        view === 'create' ? 'bg-white/10 text-white border border-white/10' : 'text-dnd-text/40 hover:text-white'
                    )}
                >
                    Create User
                </button>
            </div>

            {view === 'list' && (
                <div className="space-y-4">
                    {loading && users.length === 0 && <div className="text-center py-8"><Icon name="spinner" className="animate-spin h-8 w-8 mx-auto text-dnd-gold"/></div>}
                    {!loading && users.length === 0 && <p className="text-center text-dnd-text/20 py-8 italic">No users have been recorded yet.</p>}
                    
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
                            Create a new user for this realm. They will log in using only the username provided below.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                            placeholder="e.g. Elara" 
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Role</label>
                        <div className="flex gap-4">
                            <label className={cn(
                                "flex-1 cursor-pointer rounded-2xl border px-6 py-4 text-center transition-all shadow-lg",
                                role === 'Player' ? 'bg-dnd-gold/10 border-dnd-gold/30 text-dnd-gold' : 'bg-white/5 border-white/5 text-dnd-text/40 hover:bg-white/10'
                            )}>
                                <input type="radio" className="hidden" checked={role === 'Player'} onChange={() => setRole('Player')} />
                                <span className="font-bold uppercase tracking-widest text-xs">Player</span>
                            </label>
                            <label className={cn(
                                "flex-1 cursor-pointer rounded-2xl border px-6 py-4 text-center transition-all shadow-lg",
                                role === 'DM' ? 'bg-dnd-red/10 border-dnd-red/30 text-dnd-red' : 'bg-white/5 border-white/5 text-dnd-text/40 hover:bg-white/10'
                            )}>
                                <input type="radio" className="hidden" checked={role === 'DM'} onChange={() => setRole('DM')} />
                                <span className="font-bold uppercase tracking-widest text-xs">DM</span>
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
        setName(map.name || ''); setImageUrl(map.image_url || ''); setParentMapId(map.parent_map_id || '');
        setIsVisible(map.is_visible ?? true); setGridSize(map.grid_size || 50); 
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
        setLoading(true);
        const { error } = await supabase.from('maps').delete().eq('id', id);
        if (!error) {
            removeLocalItem('map', id);
            resetForm();
        } else {
            setError({ message: "Error deleting map", details: error });
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Map Manager" maxWidthClass="max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* List */}
                <div className="md:col-span-1 border-r border-white/5 pr-6 space-y-6">
                    <button onClick={resetForm} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-lg group">
                        <Icon name="plus" className="h-5 w-5 text-dnd-gold group-hover:rotate-90 transition-transform" />
                        <span className="text-xs uppercase tracking-widest">New Map</span>
                    </button>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {maps.map(map => (
                            <div key={map.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => handleEdit(map)}>
                                <span className="text-sm text-dnd-text/60 truncate font-medium group-hover:text-white">{map.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(map); }} className="p-2 hover:text-dnd-gold text-dnd-text/20 transition-colors"><Icon name="pencil" className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form */}
                <div className="md:col-span-2">
                    <h3 className="text-2xl font-serif text-white font-bold mb-8 border-b border-white/5 pb-4">{isEditing ? 'Edit Map' : 'Create Map'}</h3>
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Map Name</label>
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
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Map Type</label>
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
                                    {isEditing ? 'Replace Image' : 'Upload Image'}
                                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                                        if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setImageUrl(''); }
                                    }} />
                                </label>
                                <span className="text-[10px] text-dnd-text/20 font-bold uppercase tracking-widest">OR</span>
                                <input 
                                    type="text" 
                                    placeholder="Image URL" 
                                    value={imageUrl} 
                                    onChange={e => { setImageUrl(e.target.value); setImageFile(null); }} 
                                    className="flex-1 bg-transparent border-b border-white/5 text-xs text-dnd-text/60 py-2 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                />
                            </div>
                            {(imageUrl || (imageFile && URL.createObjectURL(imageFile))) && (
                                <div className="relative group">
                                    <img src={imageUrl || (imageFile ? URL.createObjectURL(imageFile) : '')} className="h-48 w-full object-cover rounded-2xl border border-white/10 shadow-2xl" alt="Preview" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                        <span className="text-white font-bold uppercase tracking-widest text-[10px]">Previewing Image</span>
                                    </div>
                                </div>
                            )}
                             {isEditing && (
                                <p className="text-[10px] text-dnd-text/40 mt-4 italic font-medium leading-relaxed">Note: Replacing the image will preserve all pins in their relative positions. Ensure the new image maintains the same aspect ratio.</p>
                             )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Parent Map</label>
                                <select 
                                    value={parentMapId} 
                                    onChange={e => setParentMapId(e.target.value)} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner font-bold"
                                >
                                    <option value="">(None - Root Map)</option>
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
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Pin Scale (px)</label>
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
                                    Visible to Players
                                </label>
                             </div>
                         </div>

                        <div className="flex justify-between items-center pt-8 border-t border-white/5">
                             {isEditing && (
                                 <button 
                                    type="button" 
                                    onClick={() => handleDelete(editingMap!.id!)} 
                                    className="flex items-center gap-2 text-dnd-red hover:brightness-125 transition-all font-bold uppercase tracking-widest text-xs"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                    Delete Map
                                </button>
                             )}
                             <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs ml-auto">
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
    const { pinTypes, updateLocalPinType, removeLocalItem, setError } = useAppContext();
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

        try {
            let res;
            if (isEditing && editingType?.id) {
                res = await supabase.from('pin_types').update(payload).eq('id', editingType.id).select().single();
            } else {
                payload.created_by = user.id;
                res = await supabase.from('pin_types').insert(payload).select().single();
            }

            if (res.error) {
                console.error("Error saving pin type:", res.error);
                setError({ message: "Error saving pin type", details: res.error });
            } else if (res.data) {
                updateLocalPinType(res.data as PinType);
                resetForm();
            }
        } catch (err: any) {
            console.error("Exception saving pin type:", err);
            setError({ message: "Error saving pin type", details: err });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setLoading(true);
        const { error } = await supabase.from('pin_types').delete().eq('id', id);
        if(!error) {
            removeLocalItem('pintype', id);
            resetForm();
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pin Types" maxWidthClass="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-1 border-r border-white/5 pr-6 space-y-6">
                     <button onClick={resetForm} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-lg group">
                        <Icon name="plus" className="h-5 w-5 text-dnd-gold group-hover:rotate-90 transition-transform" />
                        <span className="text-xs uppercase tracking-widest">New Type</span>
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
                    <h3 className="text-2xl font-serif text-white font-bold mb-8 border-b border-white/5 pb-4">{isEditing ? 'Edit Pin Type' : 'Create Pin Type'}</h3>
                    <form onSubmit={handleSave} className="space-y-8">
                         <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Type Name</label>
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
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Pin Color</label>
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
                            <span className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Pin Preview</span>
                            <div className="relative">
                                <div className="absolute inset-0 blur-xl opacity-40 rounded-full" style={{ backgroundColor: color }}></div>
                                <div className="relative w-20 h-20 rounded-2xl bg-dnd-dark border-2 border-white/10 flex items-center justify-center text-4xl shadow-2xl" style={{ borderColor: `${color}40` }}>
                                    {emoji}
                                </div>
                            </div>
                            <span className="text-white font-bold tracking-tight">{name || 'Unnamed Pin'}</span>
                        </div>

                         <div className="flex justify-end pt-8 border-t border-white/5">
                             <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
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
interface CharacterManagerModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    initialEditItem?: Character | null;
}
export const CharacterManagerModal: React.FC<CharacterManagerModalProps> = ({ isOpen, onClose, initialEditItem }) => {
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
        setName(c.name || '');
        setRace(c.role_details?.race || '');
        setCharClass(c.role_details?.class || '');
        setLevel(c.role_details?.level || 1);
        setAlignment(c.role_details?.alignment || '');
        setBackstory(c.backstory || '');
        setGmNotes(c.gm_notes || '');
        setImageUrl(c.image_url || '');
        setSheetUrl(c.sheet_url || '');
        setIsNpc(c.is_npc ?? true);
        setIsVisible(c.is_visible ?? true);
    };

    useEffect(() => {
        if (initialEditItem) {
            handleEdit(initialEditItem);
        }
    }, [initialEditItem]);

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
            character_json: editingChar?.character_json || null
        };

        if (!isEditing) {
            payload.created_by = user.id;
        }

        try {
            let res;
            if (isEditing && editingChar?.id) {
                res = await supabase.from('characters').update(payload).eq('id', editingChar.id).select().single();
            } else {
                res = await supabase.from('characters').insert(payload).select().single();
            }

            if (res.error) {
                console.error("Error saving character:", res.error);
                setError({ message: "Error saving character", details: res.error });
            } else if (res.data) {
                updateLocalCharacter(res.data as Character);
                resetForm();
            }
        } catch (err: any) {
            console.error("Exception saving character:", err);
            setError({ message: "Error saving character", details: err });
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        setLoading(true);
        const { error } = await supabase.from('characters').delete().eq('id', id);
        if (!error) {
            removeLocalItem('character', id);
            resetForm();
        } else {
            setError({ message: "Error deleting character", details: error });
        }
        setLoading(false);
    };

    return (
         <Modal isOpen={isOpen} onClose={onClose} title="Characters" maxWidthClass="max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="md:col-span-1 border-r border-white/5 pr-6 space-y-6">
                    <button onClick={resetForm} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-lg group">
                        <Icon name="plus" className="h-5 w-5 text-dnd-gold group-hover:rotate-90 transition-transform" />
                        <span className="text-xs uppercase tracking-widest">Create Character</span>
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
                    <h3 className="text-2xl font-serif text-white font-bold mb-8 border-b border-white/5 pb-4">{isEditing ? 'Edit Character' : 'Create Character'}</h3>
                    <form onSubmit={handleSave} className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Name</label>
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
                                    <span className="font-bold uppercase tracking-widest text-[10px]">Visible to Players</span>
                                </label>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Race</label>
                                <input type="text" value={race} onChange={e => setRace(e.target.value)} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Class</label>
                                <input type="text" value={charClass} onChange={e => setCharClass(e.target.value)} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Level</label>
                                <input type="number" value={level} onChange={e => setLevel(parseInt(e.target.value))} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Alignment</label>
                                <input type="text" value={alignment} onChange={e => setAlignment(e.target.value)} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"/>
                            </div>
                         </div> 

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Portrait Image (URL)</label>
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
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">External Link (Optional)</label>
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
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Backstory</label>
                                <RichTextEditor 
                                    content={backstory} 
                                    onChange={setBackstory} 
                                    className="w-full"
                                />
                            </div>
                             <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-red/60">DM Notes</label>
                                <RichTextEditor 
                                    content={gmNotes} 
                                    onChange={setGmNotes} 
                                    className="w-full"
                                />
                            </div>
                         </div>

                         <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-red/60">Character JSON (DM Only)</label>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-xl transition-all text-xs font-bold text-dnd-text/60">
                                    <Icon name="upload" className="w-4 h-4 text-dnd-gold" />
                                    {editingChar?.character_json ? 'Replace JSON' : 'Upload JSON'}
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const text = await file.text();
                                                try {
                                                    const json = JSON.parse(text);
                                                    setEditingChar(prev => prev ? { ...prev, character_json: json } : { character_json: json });
                                                } catch (err) {
                                                    setError({ message: "Invalid JSON file", details: err });
                                                }
                                            }
                                        }} 
                                    />
                                </label>
                                {editingChar?.character_json && (
                                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Icon name="check" className="w-3 h-3" /> JSON Attached
                                    </span>
                                )}
                            </div>
                         </div>

                         <div className="flex justify-between items-center pt-8 border-t border-white/5">
                             {isEditing && (
                                 <button 
                                    type="button" 
                                    onClick={() => handleDelete(editingChar!.id!)} 
                                    className="flex items-center gap-2 text-dnd-red hover:brightness-125 transition-all font-bold uppercase tracking-widest text-xs"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                    Delete Character
                                </button>
                             )}
                             <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs ml-auto">
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
    onSave: (savedPin?: Pin) => Promise<void>;
}

export const PinEditorModal: React.FC<PinEditorModalProps> = ({ pinData, onClose, onSave }) => {
    const { pinTypes, maps, removeLocalItem, setError } = useAppContext();
    const { user } = useAuth();
    const { items: allItems } = useItems(); // From ItemProvider
    
    // Form State
    const [title, setTitle] = useState(pinData.title || '');
    const [pinTypeId, setPinTypeId] = useState(pinData.pin_type_id || (pinTypes[0]?.id || ''));
    const [wikiPageId, setWikiPageId] = useState(pinData.wiki_page_id || '');
    const [isVisible, setIsVisible] = useState(pinData.is_visible ?? false);
    const [description, setDescription] = useState(pinData.data?.description || '');
    const [linkedMapId, setLinkedMapId] = useState(pinData.linked_map_id || '');
    const [sections, setSections] = useState<PinSection[]>(pinData.data?.sections || []);
    
    const [loading, setLoading] = useState(false);

    // Section Editor State
    const [itemSearch, setItemSearch] = useState('');

    const addSection = (type: PinSectionType) => {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        setSections(prev => [...prev, {
            id,
            type,
            title: type === 'secret' ? 'Secret Note' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
            content: '',
            is_visible: type !== 'secret' && type !== 'encounter',
            list_items: type === 'list' ? [] : undefined,
            stats: (type === 'statblock' || type === 'attribute_list') ? [] : undefined,
            items: type === 'inventory' ? [] : undefined,
            image_url: (type === 'image' || type === 'split') ? '' : undefined,
            gallery_images: type === 'gallery' ? [] : undefined,
            timeline_items: type === 'timeline' ? [] : undefined,
            quote_author: type === 'quote' ? '' : undefined,
            linked_map_id: type === 'map' ? '' : undefined,
            quests: type === 'quests' ? [] : undefined
        }]);
    };

    const updateSection = (id: string, updater: Partial<PinSection> | ((s: PinSection) => Partial<PinSection>)) => {
        setSections(prev => prev.map(s => {
            if (s.id !== id) return s;
            const updates = typeof updater === 'function' ? updater(s) : updater;
            return { ...s, ...updates };
        }));
    };
    
    const removeSection = (id: string) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };

    const moveSection = (id: string, direction: 'up' | 'down') => {
        setSections(prev => {
            const index = prev.findIndex(s => s.id === id);
            if (index === -1) return prev;
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const newSections = [...prev];
            [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
            return newSections;
        });
    };

    // Inventory Helpers
    const addItemToSection = (sectionId: string, item: ApiItem) => {
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
        
        updateSection(sectionId, (s) => ({ items: [...(s.items || []), newItem] }));
    };

    const handleSaveLocal = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload: Partial<Pin> = {
            title: title || '',
            pin_type_id: pinTypeId,
            wiki_page_id: wikiPageId || null,
            is_visible: isVisible ?? false,
            linked_map_id: linkedMapId || null,
            data: {
                ...pinData.data,
                description: description || '',
                sections: sections || [],
                images: pinData.data?.images || []
            },
            // If new pin, include coords
            ...(pinData.x_coord !== undefined ? { x_coord: pinData.x_coord, y_coord: pinData.y_coord, map_id: pinData.map_id } : {})
        };

        try {
            let result;
            if (pinData.id) {
                result = await supabase.from('pins').update(payload).eq('id', pinData.id).select().single();
            } else if (user) {
                result = await supabase.from('pins').insert({ ...payload, created_by: user.id }).select().single();
            }
            
            console.log("Pin Save Response:", result);

            if (result?.error) {
                console.error("Error saving pin:", result.error);
                setError({ message: "Error saving sigil", details: result.error });
                return; // Stop here if error
            }

            if (result?.data) {
                // Manually attach pin_types from local state
                const fullData = {
                    ...result.data,
                    pin_types: pinTypes.find(t => t.id === result.data.pin_type_id) || null
                };
                await onSave(fullData as Pin);
            } else {
                await onSave();
            }
        } catch (err: any) {
            console.error("Exception saving pin:", err);
            setError({ message: "Error saving sigil", details: err });
            await onSave();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!pinData.id) return;
        setLoading(true);
        const { error } = await supabase.from('pins').delete().eq('id', pinData.id);
        if (!error) {
            removeLocalItem('pin', pinData.id);
            onSave();
        } else {
            setError({ message: "Error deleting pin", details: error });
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={pinData.id ? "Edit Pin" : "Create Pin"} maxWidthClass="max-w-5xl">
            <form onSubmit={handleSaveLocal} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Pin Title</label>
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
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Pin Type</label>
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
                        Visible to Players
                    </label>
                    <div className="hidden md:block h-8 w-px bg-white/5"></div>
                     <div className="flex-1 flex items-center gap-4 min-w-[200px]">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 whitespace-nowrap">Link to Map:</span>
                         <select 
                            value={linkedMapId} 
                            onChange={e => setLinkedMapId(e.target.value)} 
                            className="flex-1 rounded-xl bg-black/20 border border-white/5 px-4 py-2 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all"
                        >
                            <option value="">(None)</option>
                            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                         </select>
                     </div>
                     <div className="hidden md:block h-8 w-px bg-white/5"></div>
                     <div className="flex-1 flex items-center gap-4 min-w-[200px]">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 whitespace-nowrap">Link to Wiki:</span>
                         <select 
                            value={wikiPageId} 
                            onChange={e => setWikiPageId(e.target.value)} 
                            className="flex-1 rounded-xl bg-black/20 border border-white/5 px-4 py-2 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all"
                        >
                            <option value="">(None)</option>
                            {useAppContext().wikiPages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                         </select>
                     </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Description</label>
                    <RichTextEditor 
                        content={description} 
                        onChange={setDescription} 
                        placeholder="Describe this location..."
                        className="w-full"
                    />
                </div>
                
                {/* Sections Editor */}
                <div className="space-y-6 pt-8 border-t border-white/5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Sections</h3>
                        <div className="flex flex-wrap gap-2">
                             {(['text', 'image', 'split', 'map', 'quests', 'gallery', 'timeline', 'quote', 'attribute_list', 'list', 'statblock', 'inventory', 'secret', 'encounter'] as PinSectionType[]).map(type => (
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
                                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                                        <button 
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => moveSection(section.id, 'up')}
                                            className="p-1.5 text-dnd-text/40 hover:text-dnd-gold disabled:opacity-20 transition-colors"
                                        >
                                            <Icon name="chevron-up" className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            type="button"
                                            disabled={idx === sections.length - 1}
                                            onClick={() => moveSection(section.id, 'down')}
                                            className="p-1.5 text-dnd-text/40 hover:text-dnd-gold disabled:opacity-20 transition-colors"
                                        >
                                            <Icon name="chevron-down" className="w-4 h-4"/>
                                        </button>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => removeSection(section.id)} 
                                        className="p-2 text-dnd-text/20 hover:text-dnd-red transition-colors"
                                    >
                                        <Icon name="trash" className="w-4 h-4"/>
                                    </button>
                                </div>
                                
                                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                                    <div className="bg-dnd-gold/10 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-dnd-gold self-start border border-dnd-gold/20">
                                        {section.type}
                                    </div>
                                    <label className={cn(
                                        "flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest transition-all",
                                        section.is_visible ? 'text-dnd-gold' : 'text-dnd-text/20'
                                    )}>
                                        <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                            section.is_visible ? 'bg-dnd-gold/20 border-dnd-gold' : 'bg-black/20 border-white/5'
                                        )}>
                                            {section.is_visible && <Icon name="check" className="w-3 h-3 text-dnd-gold" />}
                                        </div>
                                        <input type="checkbox" checked={section.is_visible ?? true} onChange={e => updateSection(section.id, {is_visible: e.target.checked})} className="hidden" />
                                        Visible
                                    </label>
                                    <input 
                                        type="text" 
                                        value={section.title} 
                                        onChange={e => updateSection(section.id, {title: e.target.value})} 
                                        className="bg-transparent border-b border-white/5 text-white font-serif font-bold text-xl focus:outline-none focus:border-dnd-gold/50 w-full transition-all" 
                                        placeholder="Section Title"
                                    />
                                </div>

                                {section.type === 'text' && (
                                    <RichTextEditor 
                                        content={section.content || ''} 
                                        onChange={val => updateSection(section.id, {content: val})} 
                                        placeholder="Enter content here..."
                                        className="w-full"
                                    />
                                )}
                                
                                {section.type === 'secret' && (
                                    <RichTextEditor 
                                        content={section.content || ''} 
                                        onChange={val => updateSection(section.id, {content: val})} 
                                        placeholder="Whispers for the Weaver's ears only..."
                                        className="w-full"
                                    />
                                )}

                                {section.type === 'encounter' && (
                                    <div className="space-y-4">
                                        <RichTextEditor 
                                            content={section.content || ''} 
                                            onChange={val => updateSection(section.id, {content: val})} 
                                            placeholder="Encounter description..."
                                            className="w-full"
                                        />
                                        <div className="flex items-center gap-4">
                                            <label className="cursor-pointer flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-xl transition-all text-xs font-bold text-dnd-text/60">
                                                <Icon name="upload" className="w-4 h-4 text-dnd-gold" />
                                                {section.json_data ? 'Replace JSON' : 'Upload JSON'}
                                                <input 
                                                    type="file" 
                                                    accept=".json" 
                                                    className="hidden" 
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const text = await file.text();
                                                            updateSection(section.id, { json_data: text });
                                                        }
                                                    }} 
                                                />
                                            </label>
                                            {section.json_data && (
                                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                    <Icon name="check" className="w-3 h-3" /> JSON Attached
                                                </span>
                                            )}
                                        </div>
                                    </div>
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

                                {section.type === 'attribute_list' && (
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

                                {section.type === 'split' && (
                                    <div className="space-y-4">
                                        <RichTextEditor 
                                            content={section.content || ''} 
                                            onChange={val => updateSection(section.id, {content: val})} 
                                            placeholder="Text content..."
                                            className="w-full"
                                        />
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="text" 
                                                value={section.image_url || ''} 
                                                onChange={e => updateSection(section.id, {image_url: e.target.value})} 
                                                className="flex-1 bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                placeholder="Image URL..."
                                            />
                                            <label className="cursor-pointer p-3 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 transition-all shadow-md group">
                                                <Icon name="upload" className="w-4 h-4 text-dnd-gold group-hover:scale-110 transition-transform"/>
                                                <input type="file" className="hidden" accept="image/*" onChange={async e => {
                                                    if(e.target.files?.[0] && user) {
                                                        const file = e.target.files[0];
                                                        const fileExt = file.name.split('.').pop();
                                                        const fileName = `split_${Date.now()}.${fileExt}`;
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
                                    </div>
                                )}

                                {section.type === 'map' && (
                                    <div className="space-y-4">
                                        <RichTextEditor 
                                            content={section.content || ''} 
                                            onChange={val => updateSection(section.id, {content: val})} 
                                            placeholder="Text content..."
                                            className="w-full"
                                        />
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Linked Map</label>
                                            <select 
                                                value={section.linked_map_id || ''} 
                                                onChange={e => updateSection(section.id, {linked_map_id: e.target.value})}
                                                className="w-full bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all"
                                            >
                                                <option value="">Select a map...</option>
                                                {maps.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {section.type === 'quests' && (
                                    <div className="space-y-4">
                                        <button 
                                            type="button" 
                                            onClick={() => updateSection(section.id, (s) => ({ quests: [...(s.quests || []), { id: crypto.randomUUID(), title: '', description: '', icon: '📜', image_url: '' }] }))}
                                            className="w-full py-2 bg-dnd-gold/10 hover:bg-dnd-gold/20 text-dnd-gold rounded-xl text-[10px] font-bold uppercase tracking-widest border border-dnd-gold/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Icon name="plus" className="w-3 h-3" />
                                            Add Quest
                                        </button>
                                        <div className="space-y-2">
                                            {section.quests?.map((quest, qIdx) => (
                                                <div key={quest.id} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 relative group/quest">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => updateSection(section.id, (s) => ({ quests: s.quests?.filter((_, i) => i !== qIdx) }))}
                                                        className="absolute top-2 right-2 p-1 text-dnd-text/20 hover:text-dnd-red transition-colors opacity-0 group-hover/quest:opacity-100"
                                                    >
                                                        <Icon name="close" className="w-3 h-3" />
                                                    </button>
                                                    <div className="grid grid-cols-[auto,1fr] gap-3">
                                                        <input 
                                                            type="text" 
                                                            value={quest.icon} 
                                                            onChange={e => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, icon: e.target.value } : q) }))}
                                                            className="w-10 bg-black/20 rounded-lg p-2 text-center text-lg border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                            placeholder="Icon"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={quest.title} 
                                                            onChange={e => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, title: e.target.value } : q) }))}
                                                            className="w-full bg-black/20 rounded-lg p-2 text-xs text-white font-bold border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                            placeholder="Quest Title"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Quest Description</label>
                                                        <RichTextEditor 
                                                            content={quest.description || ''} 
                                                            onChange={val => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, description: val } : q) }))} 
                                                            placeholder="Full quest details..."
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={quest.image_url} 
                                                        onChange={e => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, image_url: e.target.value } : q) }))}
                                                        className="w-full bg-black/20 rounded-lg p-2 text-[10px] text-dnd-text/40 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                        placeholder="Optional Image URL"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {section.type === 'gallery' && (
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Gallery Images (One per line)</p>
                                        <textarea 
                                            value={section.gallery_images?.join('\n') || ''} 
                                            onChange={e => updateSection(section.id, {gallery_images: e.target.value.split('\n')})} 
                                            rows={4} 
                                            className="w-full bg-black/20 rounded-2xl p-4 text-sm text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all custom-scrollbar" 
                                            placeholder="https://...&#10;https://..."
                                        />
                                    </div>
                                )}

                                {section.type === 'timeline' && (
                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            {section.timeline_items?.map((item, i) => (
                                                <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 relative group/item">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newItems = [...(section.timeline_items || [])]; newItems.splice(i, 1); updateSection(section.id, {timeline_items: newItems});
                                                        }} 
                                                        className="absolute top-2 right-2 text-dnd-text/20 hover:text-dnd-red transition-colors"
                                                    >
                                                        <Icon name="close" className="w-4 h-4" />
                                                    </button>
                                                    <input 
                                                        type="text" 
                                                        value={item.date} 
                                                        onChange={e => {
                                                            const newItems = [...(section.timeline_items || [])]; newItems[i].date = e.target.value; updateSection(section.id, {timeline_items: newItems});
                                                        }} 
                                                        className="w-full bg-transparent border-b border-white/5 text-dnd-gold font-bold text-xs uppercase tracking-widest focus:outline-none focus:border-dnd-gold/50 pb-1"
                                                        placeholder="Date/Era"
                                                    />
                                                    <RichTextEditor 
                                                        content={item.content} 
                                                        onChange={val => {
                                                            const newItems = [...(section.timeline_items || [])]; newItems[i].content = val; updateSection(section.id, {timeline_items: newItems});
                                                        }} 
                                                        placeholder="Event description..."
                                                        className="w-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => updateSection(section.id, {timeline_items: [...(section.timeline_items || []), {date: '', content: ''}]})} 
                                            className="text-[10px] text-dnd-gold hover:brightness-110 font-bold uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <Icon name="plus" className="w-3 h-3" />
                                            Add Timeline Entry
                                        </button>
                                    </div>
                                )}

                                {section.type === 'quote' && (
                                    <div className="space-y-4">
                                        <RichTextEditor 
                                            content={section.content || ''} 
                                            onChange={val => updateSection(section.id, {content: val})} 
                                            placeholder="The spoken word..."
                                            className="w-full"
                                        />
                                        <input 
                                            type="text" 
                                            value={section.quote_author || ''} 
                                            onChange={e => updateSection(section.id, {quote_author: e.target.value})} 
                                            className="w-full bg-black/20 rounded-xl p-3 text-xs text-dnd-gold font-bold border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all font-serif italic" 
                                            placeholder="— Author"
                                        />
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
                                                placeholder="Search for items..."
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

                <div className="flex justify-between items-center pt-8 border-t border-white/5">
                    {pinData.id && (
                        <button 
                            type="button" 
                            onClick={handleDelete} 
                            className="flex items-center gap-2 text-dnd-red hover:brightness-125 transition-all font-bold uppercase tracking-widest text-xs"
                        >
                            <Icon name="trash" className="w-4 h-4" />
                            Delete Pin
                        </button>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs ml-auto"
                    >
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Pin'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- WIKI PAGE MANAGER MODAL ---
interface WikiPageManagerModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    initialEditItem?: WikiPage | null;
}
export const WikiPageManagerModal: React.FC<WikiPageManagerModalProps> = ({ isOpen, onClose, initialEditItem }) => {
    const { maps, wikiPages, pinTypes, updateLocalWikiPage, removeLocalItem, setError } = useAppContext();
    const { user } = useAuth();
    const [editingPage, setEditingPage] = useState<Partial<WikiPage> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form fields
    const [title, setTitle] = useState('');
    const [typeId, setTypeId] = useState('');
    const [parentId, setParentId] = useState<string>('');
    const [content, setContent] = useState('');
    const [sections, setSections] = useState<PinSection[]>([]);
    const [headerImageUrl, setHeaderImageUrl] = useState('');
    const [isVisible, setIsVisible] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (pinTypes.length > 0 && !typeId) {
            setTypeId(pinTypes[0].id);
        }
    }, [pinTypes]);

    const resetForm = () => {
        setEditingPage(null); setIsEditing(false);
        setTitle(''); setTypeId(pinTypes[0]?.id || ''); setParentId('');
        setContent(''); setSections([]); setHeaderImageUrl(''); setIsVisible(true);
    };

    const handleEdit = (p: WikiPage) => {
        setEditingPage(p); setIsEditing(true);
        setTitle(p.title || ''); setTypeId(p.type_id || ''); setParentId(p.parent_id || '');
        setContent(p.content || ''); setSections(p.sections || []); 
        setHeaderImageUrl(p.header_image_url || '');
        setIsVisible(p.is_visible ?? true);
    };

    useEffect(() => {
        if (initialEditItem) {
            handleEdit(initialEditItem);
        }
    }, [initialEditItem]);

    const updateSection = (id: string, updater: Partial<PinSection> | ((s: PinSection) => Partial<PinSection>)) => {
        setSections(prev => prev.map(s => {
            if (s.id !== id) return s;
            const updates = typeof updater === 'function' ? updater(s) : updater;
            return { ...s, ...updates };
        }));
    };

    const removeSection = (id: string) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };

    const moveSection = (id: string, direction: 'up' | 'down') => {
        setSections(prev => {
            const index = prev.findIndex(s => s.id === id);
            if (index === -1) return prev;
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const newSections = [...prev];
            [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
            return newSections;
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            console.error("Cannot save: No user session found");
            return;
        }
        
        if (!title.trim()) {
            setError({ message: "Validation Error", details: "Page title is required" });
            return;
        }

        setLoading(true);
        console.log("Saving wiki page...", { isEditing, title, typeId });

        const payload: any = {
            title: title.trim(),
            type_id: typeId || null,
            parent_id: parentId || null,
            content: content || '',
            sections: sections || [],
            header_image_url: headerImageUrl || null,
            is_visible: isVisible,
        };

        if (!isEditing) {
            payload.created_by = user.id;
        }

        try {
            let res;
            if (isEditing && editingPage?.id) {
                res = await supabase.from('wiki_pages').update(payload).eq('id', editingPage.id).select().single();
            } else {
                res = await supabase.from('wiki_pages').insert(payload).select().single();
            }

            console.log("Wiki Page Save Response:", res);

            if (res.error) {
                console.error("Error saving wiki page:", res.error);
                setError({ message: "Error saving wiki page", details: res.error });
            } else {
                const data = res.data;
                if (data) {
                    // Manually attach pin_types from local state to match WikiPage type
                    const fullData = {
                        ...data,
                        pin_types: pinTypes.find(t => t.id === data.type_id) || null
                    };
                    updateLocalWikiPage(fullData as WikiPage);
                    resetForm();
                }
            }
        } catch (err: any) {
            console.error("Exception saving wiki page:", err);
            setError({ message: "Error saving wiki page", details: err });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingPage?.id) return;
        setLoading(true);
        const { error } = await supabase.from('wiki_pages').delete().eq('id', editingPage.id);
        if (!error) {
            removeLocalItem('wikipage', editingPage.id);
            resetForm();
        } else {
            setError({ message: "Error deleting wiki page", details: error });
        }
        setLoading(false);
        setIsDeleting(false);
    };

    const addSection = (type: PinSectionType) => {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        setSections(prev => [...prev, {
            id,
            type,
            title: type === 'secret' ? 'Secret Note' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
            content: '',
            is_visible: type !== 'secret' && type !== 'encounter',
            list_items: type === 'list' ? [] : undefined,
            stats: (type === 'statblock' || type === 'attribute_list') ? [] : undefined,
            items: type === 'inventory' ? [] : undefined,
            image_url: (type === 'image' || type === 'split') ? '' : undefined,
            gallery_images: type === 'gallery' ? [] : undefined,
            timeline_items: type === 'timeline' ? [] : undefined,
            quote_author: type === 'quote' ? '' : undefined,
            linked_map_id: type === 'map' ? '' : undefined,
            quests: type === 'quests' ? [] : undefined
        }]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Wiki Manager" maxWidthClass="max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="md:col-span-1 border-r border-white/5 pr-6 space-y-6">
                    <button onClick={resetForm} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-lg group">
                        <Icon name="plus" className="h-5 w-5 text-dnd-gold group-hover:rotate-90 transition-transform" />
                        <span className="text-xs uppercase tracking-widest">New Page</span>
                    </button>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                        {wikiPages.map(p => (
                            <div key={p.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => handleEdit(p)}>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{p.pin_types?.emoji || '📄'}</span>
                                    <div className="text-left">
                                        <div className="text-sm text-white font-bold tracking-tight">{p.title}</div>
                                        <div className="text-[10px] text-dnd-gold/60 uppercase tracking-widest font-bold">{p.pin_types?.name}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-3">
                    <h3 className="text-2xl font-serif text-white font-bold mb-8 border-b border-white/5 pb-4">{isEditing ? 'Edit Page' : 'Create Page'}</h3>
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Page Title</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    required 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Header Background Image (URL)</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        value={headerImageUrl} 
                                        onChange={e => setHeaderImageUrl(e.target.value)} 
                                        placeholder="Optional full-width image..."
                                        className="flex-1 rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-xs text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner" 
                                    />
                                    <label className="cursor-pointer p-4 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all shadow-lg">
                                        <Icon name="upload" className="w-5 h-5 text-dnd-gold"/>
                                        <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                            if(e.target.files?.[0] && user) {
                                                const file = e.target.files[0];
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `wiki_header_${Date.now()}.${fileExt}`;
                                                try {
                                                    const url = await uploadFile('assets', `${user.id}/${fileName}`, file);
                                                    setHeaderImageUrl(url);
                                                } catch (err) {
                                                    setError({ message: "Upload failed", details: err });
                                                }
                                            }
                                        }} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Page Type</label>
                                <select 
                                    value={typeId} 
                                    onChange={e => setTypeId(e.target.value)} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-4 text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner font-bold"
                                >
                                    {pinTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.emoji} {pt.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Parent Page (Nesting)</label>
                                <select 
                                    value={parentId} 
                                    onChange={e => setParentId(e.target.value)} 
                                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-4 text-dnd-text/60 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner font-bold"
                                >
                                    <option value="">(None - Top Level)</option>
                                    {wikiPages.filter(p => p.id !== editingPage?.id).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center">
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
                                Visible to Players
                            </label>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Content</label>
                            <RichTextEditor 
                                content={content} 
                                onChange={setContent} 
                                placeholder="Write the content for this page..."
                                className="w-full"
                            />
                        </div>

                        {/* Sections Editor */}
                        <div className="space-y-6 pt-8 border-t border-white/5">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Sections</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(['text', 'image', 'split', 'map', 'quests', 'gallery', 'timeline', 'quote', 'attribute_list', 'list', 'statblock', 'inventory', 'secret', 'encounter'] as PinSectionType[]).map(type => (
                                        <button 
                                            key={type} 
                                            type="button" 
                                            onClick={() => addSection(type)} 
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-dnd-text/60 font-bold uppercase tracking-widest border border-white/5 transition-all"
                                        >
                                            + {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {sections.map((section, idx) => (
                                    <div key={section.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 relative group">
                                        <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
                                                <button 
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => moveSection(section.id, 'up')}
                                                    className="p-1 text-dnd-text/40 hover:text-dnd-gold disabled:opacity-10 transition-colors"
                                                >
                                                    <Icon name="chevron-up" className="w-3.5 h-3.5"/>
                                                </button>
                                                <button 
                                                    type="button"
                                                    disabled={idx === sections.length - 1}
                                                    onClick={() => moveSection(section.id, 'down')}
                                                    className="p-1 text-dnd-text/40 hover:text-dnd-gold disabled:opacity-10 transition-colors"
                                                >
                                                    <Icon name="chevron-down" className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => removeSection(section.id)} 
                                                className="p-1 text-dnd-text/20 hover:text-dnd-red transition-colors"
                                            >
                                                <Icon name="close" className="w-4 h-4"/>
                                            </button>
                                        </div>
                                        <div className="flex gap-4 mb-4">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-dnd-gold/60">{section.type}</div>
                                            <label className={cn(
                                                "flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest transition-all",
                                                section.is_visible ? 'text-dnd-gold' : 'text-dnd-text/20'
                                            )}>
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                    section.is_visible ? 'bg-dnd-gold/20 border-dnd-gold' : 'bg-black/20 border-white/5'
                                                )}>
                                                    {section.is_visible && <Icon name="check" className="w-3 h-3 text-dnd-gold" />}
                                                </div>
                                                <input type="checkbox" checked={section.is_visible ?? true} onChange={e => updateSection(section.id, {is_visible: e.target.checked})} className="hidden" />
                                                Visible
                                            </label>
                                            <input 
                                                type="text" 
                                                value={section.title} 
                                                onChange={e => updateSection(section.id, {title: e.target.value})} 
                                                className="bg-transparent border-b border-white/5 text-white font-bold text-sm focus:outline-none focus:border-dnd-gold/50 w-full" 
                                                placeholder="Section Title"
                                            />
                                        </div>
                                        {section.type === 'text' && (
                                            <RichTextEditor 
                                                content={section.content || ''} 
                                                onChange={val => updateSection(section.id, {content: val})} 
                                                placeholder="Enter content here..."
                                                className="w-full"
                                            />
                                        )}
                                        {section.type === 'secret' && (
                                            <RichTextEditor 
                                                content={section.content || ''} 
                                                onChange={val => updateSection(section.id, {content: val})} 
                                                placeholder="Enter secret content here..."
                                                className="w-full"
                                            />
                                        )}
                                        {section.type === 'encounter' && (
                                            <div className="space-y-4">
                                                <RichTextEditor 
                                                    content={section.content || ''} 
                                                    onChange={val => updateSection(section.id, {content: val})} 
                                                    placeholder="Encounter description..."
                                                    className="w-full"
                                                />
                                                <div className="flex items-center gap-4">
                                                    <label className="cursor-pointer flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-xl transition-all text-xs font-bold text-dnd-text/60">
                                                        <Icon name="upload" className="w-4 h-4 text-dnd-gold" />
                                                        {section.json_data ? 'Replace JSON' : 'Upload JSON'}
                                                        <input 
                                                            type="file" 
                                                            accept=".json" 
                                                            className="hidden" 
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const text = await file.text();
                                                                    updateSection(section.id, { json_data: text });
                                                                }
                                                            }} 
                                                        />
                                                    </label>
                                                    {section.json_data && (
                                                        <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                            <Icon name="check" className="w-3 h-3" /> JSON Attached
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {section.type === 'image' && (
                                            <input 
                                                type="text" 
                                                value={section.image_url} 
                                                onChange={e => updateSection(section.id, {image_url: e.target.value})} 
                                                className="w-full bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                placeholder="Image URL..."
                                            />
                                        )}
                                        {section.type === 'list' && (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        id={`new-list-item-${section.id}`}
                                                        className="flex-1 bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                        placeholder="Add item..."
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const val = (e.target as HTMLInputElement).value;
                                                                if (val) {
                                                                    updateSection(section.id, (s) => ({ list_items: [...(s.list_items || []), val] }));
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {section.list_items?.map((item, i) => (
                                                        <div key={i} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 group/item">
                                                            <span className="text-xs text-dnd-text/60">{item}</span>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => updateSection(section.id, (s) => ({ list_items: s.list_items?.filter((_, j) => i !== j) }))}
                                                                className="text-dnd-text/20 hover:text-dnd-red transition-colors"
                                                            >
                                                                <Icon name="close" className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {section.type === 'statblock' && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input type="text" id={`stat-label-${section.id}`} placeholder="Label" className="bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50" />
                                                    <input type="text" id={`stat-value-${section.id}`} placeholder="Value" className="bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50" />
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const label = (document.getElementById(`stat-label-${section.id}`) as HTMLInputElement).value;
                                                        const value = (document.getElementById(`stat-value-${section.id}`) as HTMLInputElement).value;
                                                        if (label && value) {
                                                            updateSection(section.id, (s) => ({ stats: [...(s.stats || []), {label, value}] }));
                                                            (document.getElementById(`stat-label-${section.id}`) as HTMLInputElement).value = '';
                                                            (document.getElementById(`stat-value-${section.id}`) as HTMLInputElement).value = '';
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-dnd-gold/10 hover:bg-dnd-gold/20 text-dnd-gold rounded-xl text-[10px] font-bold uppercase tracking-widest border border-dnd-gold/20 transition-all"
                                                >
                                                    Add Stat
                                                </button>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {section.stats?.map((stat, i) => (
                                                        <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5 relative group/stat">
                                                            <div className="text-[8px] uppercase tracking-widest text-dnd-gold/60 font-bold">{stat.label}</div>
                                                            <div className="text-sm text-white font-bold">{stat.value}</div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => updateSection(section.id, (s) => ({ stats: s.stats?.filter((_, j) => i !== j) }))}
                                                                className="absolute top-1 right-1 text-dnd-text/20 hover:text-dnd-red opacity-0 group-hover/stat:opacity-100 transition-all"
                                                            >
                                                                <Icon name="close" className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {section.type === 'attribute_list' && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input type="text" id={`attr-label-${section.id}`} placeholder="Label" className="bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50" />
                                                    <input type="text" id={`attr-value-${section.id}`} placeholder="Value" className="bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50" />
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const label = (document.getElementById(`attr-label-${section.id}`) as HTMLInputElement).value;
                                                        const value = (document.getElementById(`attr-value-${section.id}`) as HTMLInputElement).value;
                                                        if (label && value) {
                                                            updateSection(section.id, (s) => ({ stats: [...(s.stats || []), {label, value}] }));
                                                            (document.getElementById(`attr-label-${section.id}`) as HTMLInputElement).value = '';
                                                            (document.getElementById(`attr-value-${section.id}`) as HTMLInputElement).value = '';
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-dnd-gold/10 hover:bg-dnd-gold/20 text-dnd-gold rounded-xl text-[10px] font-bold uppercase tracking-widest border border-dnd-gold/20 transition-all"
                                                >
                                                    Add Attribute
                                                </button>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {section.stats?.map((stat, i) => (
                                                        <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5 relative group/stat">
                                                            <div className="text-[8px] uppercase tracking-widest text-dnd-gold/60 font-bold">{stat.label}</div>
                                                            <div className="text-sm text-white font-bold">{stat.value}</div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => updateSection(section.id, (s) => ({ stats: s.stats?.filter((_, j) => i !== j) }))}
                                                                className="absolute top-1 right-1 text-dnd-text/20 hover:text-dnd-red opacity-0 group-hover/stat:opacity-100 transition-all"
                                                            >
                                                                <Icon name="close" className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {section.type === 'split' && (
                                            <div className="space-y-4">
                                                <RichTextEditor 
                                                    content={section.content || ''} 
                                                    onChange={val => updateSection(section.id, {content: val})} 
                                                    placeholder="Text content..."
                                                    className="w-full"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={section.image_url} 
                                                    onChange={e => updateSection(section.id, {image_url: e.target.value})} 
                                                    className="w-full bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                    placeholder="Image URL..."
                                                />
                                            </div>
                                        )}

                                        {section.type === 'map' && (
                                            <div className="space-y-4">
                                                <RichTextEditor 
                                                    content={section.content || ''} 
                                                    onChange={val => updateSection(section.id, {content: val})} 
                                                    placeholder="Text content..."
                                                    className="w-full"
                                                />
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Linked Map</label>
                                                    <select 
                                                        value={section.linked_map_id || ''} 
                                                        onChange={e => updateSection(section.id, {linked_map_id: e.target.value})}
                                                        className="w-full bg-black/20 rounded-xl p-3 text-xs text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all"
                                                    >
                                                        <option value="">Select a map...</option>
                                                        {maps.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {section.type === 'quests' && (
                                            <div className="space-y-4">
                                                <button 
                                                    type="button" 
                                                    onClick={() => updateSection(section.id, (s) => ({ quests: [...(s.quests || []), { id: crypto.randomUUID(), title: '', description: '', icon: '📜', image_url: '' }] }))}
                                                    className="w-full py-2 bg-dnd-gold/10 hover:bg-dnd-gold/20 text-dnd-gold rounded-xl text-[10px] font-bold uppercase tracking-widest border border-dnd-gold/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Icon name="plus" className="w-3 h-3" />
                                                    Add Quest
                                                </button>
                                                <div className="space-y-2">
                                                    {section.quests?.map((quest, qIdx) => (
                                                        <div key={quest.id} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 relative group/quest">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => updateSection(section.id, (s) => ({ quests: s.quests?.filter((_, i) => i !== qIdx) }))}
                                                                className="absolute top-2 right-2 p-1 text-dnd-text/20 hover:text-dnd-red transition-colors opacity-0 group-hover/quest:opacity-100"
                                                            >
                                                                <Icon name="close" className="w-3 h-3" />
                                                            </button>
                                                            <div className="grid grid-cols-[auto,1fr] gap-3">
                                                                <input 
                                                                    type="text" 
                                                                    value={quest.icon} 
                                                                    onChange={e => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, icon: e.target.value } : q) }))}
                                                                    className="w-10 bg-black/20 rounded-lg p-2 text-center text-lg border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                                    placeholder="Icon"
                                                                />
                                                                <input 
                                                                    type="text" 
                                                                    value={quest.title} 
                                                                    onChange={e => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, title: e.target.value } : q) }))}
                                                                    className="w-full bg-black/20 rounded-lg p-2 text-xs text-white font-bold border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                                    placeholder="Quest Title"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Quest Description</label>
                                                                <RichTextEditor 
                                                                    content={quest.description || ''} 
                                                                    onChange={val => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, description: val } : q) }))} 
                                                                    placeholder="Full quest details..."
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                value={quest.image_url} 
                                                                onChange={e => updateSection(section.id, (s) => ({ quests: s.quests?.map((q, i) => i === qIdx ? { ...q, image_url: e.target.value } : q) }))}
                                                                className="w-full bg-black/20 rounded-lg p-2 text-[10px] text-dnd-text/40 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all" 
                                                                placeholder="Optional Image URL"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {section.type === 'gallery' && (
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-dnd-text/20">Gallery Images (One per line)</p>
                                                <textarea 
                                                    value={section.gallery_images?.join('\n') || ''} 
                                                    onChange={e => updateSection(section.id, {gallery_images: e.target.value.split('\n')})} 
                                                    rows={4} 
                                                    className="w-full bg-black/20 rounded-2xl p-4 text-sm text-dnd-text/60 border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all custom-scrollbar" 
                                                    placeholder="https://...&#10;https://..."
                                                />
                                            </div>
                                        )}

                                        {section.type === 'timeline' && (
                                            <div className="space-y-4">
                                                <div className="space-y-4">
                                                    {section.timeline_items?.map((item, i) => (
                                                        <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 relative group/item">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const newItems = [...(section.timeline_items || [])]; newItems.splice(i, 1); updateSection(section.id, {timeline_items: newItems});
                                                                }} 
                                                                className="absolute top-2 right-2 text-dnd-text/20 hover:text-dnd-red transition-colors"
                                                            >
                                                                <Icon name="close" className="w-4 h-4" />
                                                            </button>
                                                            <input 
                                                                type="text" 
                                                                value={item.date} 
                                                                onChange={e => {
                                                                    const newItems = [...(section.timeline_items || [])]; newItems[i].date = e.target.value; updateSection(section.id, {timeline_items: newItems});
                                                                }} 
                                                                className="w-full bg-transparent border-b border-white/5 text-dnd-gold font-bold text-xs uppercase tracking-widest focus:outline-none focus:border-dnd-gold/50 pb-1"
                                                                placeholder="Date/Era"
                                                            />
                                                            <RichTextEditor 
                                                                content={item.content} 
                                                                onChange={val => {
                                                                    const newItems = [...(section.timeline_items || [])]; newItems[i].content = val; updateSection(section.id, {timeline_items: newItems});
                                                                }} 
                                                                placeholder="Event description..."
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => updateSection(section.id, {timeline_items: [...(section.timeline_items || []), {date: '', content: ''}]})} 
                                                    className="text-[10px] text-dnd-gold hover:brightness-110 font-bold uppercase tracking-widest flex items-center gap-2"
                                                >
                                                    <Icon name="plus" className="w-3 h-3" />
                                                    Add Timeline Entry
                                                </button>
                                            </div>
                                        )}

                                        {section.type === 'quote' && (
                                            <div className="space-y-4">
                                                <RichTextEditor 
                                                    content={section.content || ''} 
                                                    onChange={val => updateSection(section.id, {content: val})} 
                                                    placeholder="The spoken word..."
                                                    className="w-full"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={section.quote_author || ''} 
                                                    onChange={e => updateSection(section.id, {quote_author: e.target.value})} 
                                                    className="w-full bg-black/20 rounded-xl p-3 text-xs text-dnd-gold font-bold border border-white/5 focus:outline-none focus:border-dnd-gold/50 transition-all font-serif italic" 
                                                    placeholder="— Author"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-8 border-t border-white/5">
                             {isEditing && editingPage?.id && (
                                 <button 
                                    type="button" 
                                    onClick={() => setIsDeleting(true)} 
                                    className="flex items-center gap-2 text-dnd-red hover:brightness-125 transition-all font-bold uppercase tracking-widest text-xs"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                    Delete Page
                                </button>
                             )}
                             <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs ml-auto">
                                {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Page'}
                             </button>
                        </div>
                    </form>

                    <ConfirmModal 
                        isOpen={isDeleting}
                        onClose={() => setIsDeleting(false)}
                        onConfirm={handleDelete}
                        title="Delete Wiki Page"
                        message={`Are you sure you want to delete "${title}"? This action cannot be undone and will remove all nested information.`}
                        confirmLabel="Delete Page"
                        isDanger={true}
                    />
                </div>
            </div>
        </Modal>
    );
};

// --- LABEL EDITOR MODAL ---
interface LabelEditorModalProps {
    labelData: Partial<MapLabel>;
    onClose: () => void;
    onSave: (label?: MapLabel) => void;
}

export const LabelEditorModal: React.FC<LabelEditorModalProps> = ({ labelData, onClose, onSave }) => {
    const { user } = useAuth();
    const { removeLocalItem, setError } = useAppContext();
    const [text, setText] = useState(labelData.text || '');
    const [fontSize, setFontSize] = useState(labelData.font_size || 24);
    const [color, setColor] = useState(labelData.color || '#e5c983');
    const [fontFamily, setFontFamily] = useState(labelData.font_family || 'Cinzel, serif');
    const [isVisible, setIsVisible] = useState(labelData.is_visible ?? true);
    const [loading, setLoading] = useState(false);

    const isEditing = !!labelData.id;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        const payload = {
            map_id: labelData.map_id,
            text,
            x_coord: labelData.x_coord,
            y_coord: labelData.y_coord,
            font_size: fontSize,
            color,
            font_family: fontFamily,
            is_visible: isVisible,
            created_by: labelData.created_by || user.id
        };

        try {
            let res;
            if (isEditing) {
                res = await supabase.from('map_labels').update(payload).eq('id', labelData.id).select().single();
            } else {
                res = await supabase.from('map_labels').insert(payload).select().single();
            }

            if (res.data) {
                onSave(res.data as MapLabel);
            } else if (res.error) {
                if (res.error.code === '42P01') {
                     throw new Error("The 'map_labels' table is missing. Please check your database setup.");
                }
                throw res.error;
            }
        } catch (err: any) {
            console.error(err);
            setError({ message: "Error saving label", details: err });
            onSave();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!labelData.id) return;
        setLoading(true);
        const { error } = await supabase.from('map_labels').delete().eq('id', labelData.id);
        if (!error) {
            removeLocalItem('label', labelData.id);
            onSave();
        } else {
            setError({ message: "Error deleting label", details: error });
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={isEditing ? 'Edit Label' : 'Add Label'} maxWidthClass="max-w-md">
            <form onSubmit={handleSave} className="space-y-6">
                 <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Label Text</label>
                    <input 
                        type="text" 
                        value={text} 
                        onChange={e => setText(e.target.value)} 
                        required 
                        className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-white font-bold focus:outline-none focus:border-dnd-gold/50 transition-all font-serif italic" 
                        placeholder="City Name"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Font Size</label>
                        <input 
                            type="number" 
                            value={fontSize} 
                            onChange={e => setFontSize(parseInt(e.target.value))} 
                            className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none" 
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Color</label>
                        <div className="flex gap-2">
                             <input 
                                type="color" 
                                value={color} 
                                onChange={e => setColor(e.target.value)} 
                                className="w-12 h-12 rounded-xl bg-black/20 border border-white/5 overflow-hidden cursor-pointer" 
                            />
                            <input 
                                type="text" 
                                value={color} 
                                onChange={e => setColor(e.target.value)} 
                                className="flex-1 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-xs text-white font-mono" 
                            />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-dnd-text/40">Font Style</label>
                    <select 
                        value={fontFamily} 
                        onChange={e => setFontFamily(e.target.value)}
                        className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-white font-bold focus:outline-none capitalize"
                    >
                        <option value="Cinzel, serif">Cinzel (Classic Royal)</option>
                        <option value="MedievalSharp, cursive">Medieval Sharp (Gothic)</option>
                        <option value="Almendra, serif">Almendra (Ethereal)</option>
                        <option value="'Georgia', serif">Standard Serif</option>
                    </select>
                 </div>

                 <label className="flex items-center gap-3 cursor-pointer text-xs text-dnd-text/60 font-bold uppercase tracking-widest group">
                    <div className={cn(
                        "w-5 h-5 rounded border border-white/10 flex items-center justify-center transition-all",
                        isVisible ? 'bg-dnd-gold border-dnd-gold' : 'bg-black/20'
                    )}>
                        {isVisible && <Icon name="check" className="w-3 h-3 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} />
                    Visible to Players
                </label>

                 <div className="flex justify-between items-center pt-8 border-t border-white/5">
                     {isEditing && (
                         <button 
                            type="button" 
                            onClick={handleDelete} 
                            className="flex items-center gap-2 text-dnd-red hover:brightness-125 transition-all font-bold uppercase tracking-widest text-xs"
                        >
                            <Icon name="trash" className="w-4 h-4" />
                            Remove
                        </button>
                     )}
                     <button type="submit" disabled={loading} className="bg-dnd-gold hover:brightness-110 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs ml-auto">
                        {loading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Save Label'}
                     </button>
                </div>
            </form>
        </Modal>
    );
};

// --- CLOCK MANAGER MODAL ---
interface ClockManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ClockManagerModal: React.FC<ClockManagerModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { clocks, updateLocalClock, removeLocalItem, setError } = useAppContext();
    const [title, setTitle] = useState('');
    const [segments, setSegments] = useState(4);
    const [clockCount, setClockCount] = useState(1);
    const [loading, setLoading] = useState(false);

    const handleCreateClock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        const newClock = {
            title,
            segments,
            clock_count: clockCount,
            filled: 0,
            is_visible: false,
            created_by: user.id
        };

        try {
            const { data, error } = await supabase.from('progress_clocks').insert(newClock).select().single();
            if (error) throw error;
            if (data) {
                updateLocalClock(data as Clock);
                setTitle('');
                setSegments(4);
                setClockCount(1);
            }
        } catch (err: any) {
            console.error(err);
            setError({ message: "Error creating clock", details: err });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateClock = async (clock: Clock, newFilled: number) => {
        const { error } = await supabase.from('progress_clocks').update({ filled: newFilled }).eq('id', clock.id);
        if (!error) {
            updateLocalClock({ ...clock, filled: newFilled });
        } else {
            setError({ message: "Error updating clock", details: error });
        }
    };

    const handleDeleteClock = async (id: string) => {
        const { error } = await supabase.from('progress_clocks').delete().eq('id', id);
        if (!error) {
            removeLocalItem('clock', id);
        } else {
            setError({ message: "Error deleting clock", details: error });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Progress Clocks" maxWidthClass="max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Section */}
                <div className="lg:col-span-1 glass-panel p-6 border-white/5 space-y-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-dnd-gold mb-4 flex items-center gap-2">
                        <Icon name="plus" className="w-3 h-3" />
                        Create New Clock
                    </h3>
                    
                    <form onSubmit={handleCreateClock} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-dnd-text/40 font-bold">Purpose</label>
                            <input 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dnd-gold/50 transition-all font-serif"
                                placeholder="Gaurds Alerted..."
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-dnd-text/40 font-bold">Size (Segments)</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[4, 6, 8, 12].map(size => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => setSegments(size)}
                                        className={cn(
                                            "py-2 rounded-lg border text-xs font-bold transition-all",
                                            segments === size 
                                                ? "bg-dnd-gold/20 border-dnd-gold text-dnd-gold shadow-[0_0_10px_rgba(201,173,106,0.1)]" 
                                                : "bg-white/5 border-white/5 text-dnd-text/40 hover:bg-white/10"
                                        )}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase tracking-widest text-dnd-text/40 font-bold">Clock Circles</label>
                                <span className="text-xs font-bold text-dnd-gold">{clockCount}</span>
                            </div>
                            <input 
                                type="range"
                                min="1"
                                max="12"
                                step="1"
                                value={clockCount}
                                onChange={e => setClockCount(parseInt(e.target.value))}
                                className="w-full accent-dnd-gold"
                            />
                            <div className="flex justify-between text-[8px] text-dnd-text/20 font-bold uppercase tracking-tighter">
                                <span>Simple</span>
                                <span>World Event</span>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !title}
                            className="w-full py-4 bg-dnd-gold hover:brightness-110 text-white font-bold rounded-xl shadow-lg shadow-dnd-gold/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                            {loading ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <><Icon name="plus" className="w-4 h-4" /> Create Clock</>}
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {clocks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-dnd-text/20 p-12 text-center">
                            <Icon name="clock" className="w-16 h-16 opacity-10 mb-4" />
                            <p className="text-sm font-medium italic">No active clocks. The thread of fate remains unspooled.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clocks.map(clock => (
                                <div key={clock.id} className="glass-panel p-5 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group relative overflow-hidden">
                                     <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-serif font-bold text-white text-lg leading-tight truncate" title={clock.title}>
                                                {clock.title}
                                            </h4>
                                            <p className="text-[10px] text-dnd-text/40 uppercase tracking-widest font-bold mt-1">
                                                {clock.segments} Segments • {clock.clock_count} {clock.clock_count === 1 ? 'Pie' : 'Pies'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteClock(clock.id)}
                                            className="p-2 rounded-lg bg-dnd-red/10 text-dnd-red opacity-0 group-hover:opacity-100 transition-all hover:bg-dnd-red/20"
                                        >
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                     </div>

                                     <div className="flex flex-col items-center gap-6 py-4">
                                        <ProgressClock 
                                            segments={clock.segments} 
                                            clockCount={clock.clock_count}
                                            filled={clock.filled}
                                            size={60}
                                            onClick={() => {
                                                const maxFilled = clock.segments * clock.clock_count;
                                                const next = (clock.filled + 1) % (maxFilled + 1);
                                                handleUpdateClock(clock, next);
                                            }}
                                        />
                                        
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleUpdateClock(clock, Math.max(0, clock.filled - 1))}
                                                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-20"
                                                disabled={clock.filled === 0}
                                            >
                                                <Icon name="minus" className="w-4 h-4" />
                                            </button>
                                            <div className="w-16 text-center">
                                                <span className="text-2xl font-black text-dnd-gold font-serif">{clock.filled}</span>
                                                <span className="text-sm text-dnd-text/20 font-bold"> / {clock.segments * clock.clock_count}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleUpdateClock(clock, Math.min(clock.segments * clock.clock_count, clock.filled + 1))}
                                                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-20"
                                                disabled={clock.filled === clock.segments * clock.clock_count}
                                            >
                                                <Icon name="plus" className="w-4 h-4" />
                                            </button>
                                        </div>
                                     </div>

                                     {/* Background decoration */}
                                     <div className="absolute -bottom-4 -right-4 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                                         <Icon name="clock" className="w-24 h-24" />
                                     </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};


