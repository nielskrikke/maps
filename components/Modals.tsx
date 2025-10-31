import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { Map as MapType, Pin, PinData, PinType } from '../types';
import { Icon } from './Icons';

// Reusable Modal Wrapper
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100">
                        <Icon name="close" className="h-6 w-6" />
                    </button>
                </div>
                <div className="mt-6 max-h-[70vh] overflow-y-auto pr-2">{children}</div>
            </div>
        </div>
    );
};

// MapManagerModal
interface MapManagerModalProps { isOpen: boolean; onClose: () => void; }
export const MapManagerModal: React.FC<MapManagerModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { maps, refreshData } = useAppContext();
    const [mapName, setMapName] = useState('');
    const [mapFile, setMapFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mapFile || !mapName || !user) return;
        setUploading(true);
        setError('');

        const fileExt = mapFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('maps').upload(fileName, mapFile);
        if (uploadError) {
            setError(uploadError.message);
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('maps').getPublicUrl(fileName);
        
        const { error: dbError } = await supabase.from('maps').insert({ name: mapName, image_url: publicUrl, created_by: user.id, is_visible: false, parent_map_id: null });
        if (dbError) {
            console.error("Database insert error:", dbError);
            let detailedError = `Database error: ${dbError.message}.`;
            
            if (dbError.message.includes('violates row-level security policy')) {
                detailedError = `Error: Cannot create map. This is likely an issue with your database's Row Level Security (RLS) policies.\n\nPlease check that the 'maps' table has an INSERT policy that allows authenticated users to add maps. A common policy for this is to check if 'auth.uid() = created_by'.`;
                
                console.log("--- RLS DEBUGGING ---");
                console.log("Attempted to insert into 'maps' table.");
                console.log("Authenticated User ID:", user?.id);
                console.log("Authenticated User Role:", user?.profile?.role);
                console.log("Data for insert:", { name: mapName, image_url: publicUrl, created_by: user.id, is_visible: false, parent_map_id: null });
                console.log("--- END RLS DEBUGGING ---");
            }
            setError(detailedError);
        } else {
            setMapName('');
            setMapFile(null);
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
            await refreshData();
        }
        setUploading(false);
    };

    const handleDelete = async (map: MapType) => {
        if (!window.confirm(`Are you sure you want to delete "${map.name}"? This action cannot be undone.`)) return;
        
        const filePath = new URL(map.image_url).pathname.split('/maps/')[1];
        await supabase.storage.from('maps').remove([filePath]);
        await supabase.from('maps').delete().eq('id', map.id);
        await refreshData();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Maps">
            <form onSubmit={handleUpload} className="space-y-4">
                <input type="text" placeholder="New Map Name" value={mapName} onChange={e => setMapName(e.target.value)} required className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setMapFile(e.target.files ? e.target.files[0] : null)} required className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 transition-colors hover:file:bg-primary-200 dark:text-gray-400 dark:file:bg-primary-900/50 dark:file:text-primary-300 dark:hover:file:bg-primary-900" />
                <button type="submit" disabled={uploading} className="flex w-full items-center justify-center rounded-lg border border-transparent bg-primary-600 px-4 py-3 text-base font-medium text-white shadow-sm transition-all hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800">{uploading ? <Icon name="spinner" className="h-5 w-5 animate-spin"/> : 'Upload New Map'}</button>
                {error && <p className="text-sm text-red-500 whitespace-pre-wrap">{error}</p>}
            </form>
            <div className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Existing Maps</h3>
                {maps.map(map => (
                    <div key={map.id} className="flex items-center justify-between rounded-lg bg-gray-100 p-3 dark:bg-gray-700/50">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{map.name}</span>
                        <button onClick={() => handleDelete(map)} className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"><Icon name="trash" className="h-5 w-5" /></button>
                    </div>
                ))}
            </div>
        </Modal>
    );
};


// PinTypeManagerModal
interface PinTypeManagerProps { isOpen: boolean; onClose: () => void; }
export const PinTypeManagerModal: React.FC<PinTypeManagerProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { pinTypes, refreshData } = useAppContext();
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('');
    const [color, setColor] = useState('#3B82F6');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !user) return;
        await supabase.from('pin_types').insert({ name, emoji, color, created_by: user.id });
        setName(''); setEmoji(''); setColor('#3B82F6');
        await refreshData();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this pin type? This may affect existing pins.')) return;
        await supabase.from('pin_types').delete().eq('id', id);
        await refreshData();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Pin Types">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <input type="text" placeholder="Type Name (e.g., City)" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 sm:col-span-2" />
                    <input type="text" placeholder="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-center text-xl text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
                </div>
                <div className="relative">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Pin Color</label>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute h-12 w-full cursor-pointer opacity-0" />
                    <div className="pointer-events-none flex h-12 w-full items-center justify-between rounded-lg px-4" style={{ backgroundColor: color }}>
                        <span className="font-mono text-lg text-white mix-blend-difference">{color.toUpperCase()}</span>
                        <Icon name="brush" className="h-5 w-5 text-white mix-blend-difference" />
                    </div>
                </div>
                <button type="submit" className="flex w-full items-center justify-center rounded-lg border border-transparent bg-primary-600 px-4 py-3 text-base font-medium text-white shadow-sm transition-all hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800">Add New Pin Type</button>
            </form>
            <div className="mt-6 space-y-2">
                 <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Existing Types</h3>
                {pinTypes.map(pt => (
                    <div key={pt.id} className="flex items-center justify-between rounded-lg bg-gray-100 p-3 dark:bg-gray-700/50">
                        <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full text-xl" style={{ backgroundColor: pt.color }}>{pt.emoji}</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{pt.name}</span>
                        </div>
                        {pt.created_by && <button onClick={() => handleDelete(pt.id)} className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"><Icon name="trash" className="h-5 w-5" /></button>}
                    </div>
                ))}
            </div>
        </Modal>
    );
};

// PinEditorModal
interface PinEditorModalProps { pinData: Partial<Pin>; onClose: () => void; onSave: () => void; }
export const PinEditorModal: React.FC<PinEditorModalProps> = ({ pinData, onClose, onSave }) => {
    const { user } = useAuth();
    const { pinTypes, maps } = useAppContext();
    const [pin, setPin] = useState<Partial<Pin>>(pinData);
    const [data, setData] = useState<PinData>(pinData.data || { description: '', images: [], sections: [] });

    const handleSave = async () => {
        if (!user || !pin.title || !pin.pin_type_id) {
            alert("Please provide a title and select a pin type.");
            return;
        }

        const pinToSave = { ...pin, data };
        if (pin.id) {
            await supabase.from('pins').update(pinToSave).eq('id', pin.id);
        } else {
            await supabase.from('pins').insert({ ...pinToSave, created_by: user.id });
        }
        onSave();
    };
    
    const addSection = () => {
        setData(d => ({ ...d, sections: [...(d.sections || []), {title: 'New Section', content: ''}] }));
    };

    const updateSection = (index: number, field: 'title' | 'content', value: string) => {
        const newSections = [...(data.sections || [])];
        newSections[index][field] = value;
        setData(d => ({...d, sections: newSections}));
    };
    
    const removeSection = (index: number) => {
      setData(d => ({...d, sections: (d.sections || []).filter((_, i) => i !== index)}));
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={pin.id ? 'Edit Pin' : 'Create Pin'}>
            <div className="space-y-4">
                <input type="text" placeholder="Pin Title" value={pin.title || ''} onChange={e => setPin({ ...pin, title: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required/>
                <select value={pin.pin_type_id || ''} onChange={e => setPin({ ...pin, pin_type_id: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required>
                    <option value="" disabled>Select a pin type</option>
                    {pinTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
                <textarea placeholder="Description" value={data.description} onChange={e => setData({ ...data, description: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" rows={4} />
                 
                <select value={pin.linked_map_id || ''} onChange={e => setPin({ ...pin, linked_map_id: e.target.value || null })} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400">
                    <option value="">Link to another map (optional)</option>
                    {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Additional Sections</h3>
                        <button onClick={addSection} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800">Add Section</button>
                    </div>
                     {(data.sections || []).map((section, i) => (
                        <div key={i} className="relative space-y-2 rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
                             <button onClick={() => removeSection(i)} className="absolute top-2 right-2 rounded-full p-2 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40">
                                <Icon name="trash" className="h-4 w-4" />
                            </button>
                            <input type="text" value={section.title} onChange={e => updateSection(i, 'title', e.target.value)} placeholder="Section Title" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
                            <textarea value={section.content} onChange={e => updateSection(i, 'content', e.target.value)} placeholder="Section Content" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" rows={3}/>
                        </div>
                    ))}
                </div>
                
                <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-gray-700/50">
                    <span className="font-medium text-gray-800 dark:text-gray-200">Visible to Players</span>
                    <button
                        type="button"
                        onClick={() => setPin({ ...pin, is_visible: !pin.is_visible })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${pin.is_visible ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pin.is_visible ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </label>
                <button onClick={handleSave} className="flex w-full items-center justify-center rounded-lg border border-transparent bg-primary-600 px-4 py-3 text-base font-medium text-white shadow-sm transition-all hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800">Save Pin</button>
            </div>
        </Modal>
    );
};