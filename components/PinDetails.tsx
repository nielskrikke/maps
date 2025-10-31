
import React, { useState, useEffect } from 'react';
import { Pin, Comment } from '../types';
import { useAuth } from '../App';
import { useAppContext } from './Dashboard';
import { supabase } from '../services/supabase';
import { Icon } from './Icons';

interface PinDetailsProps {
    pin: Pin | null;
    onClose: () => void;
    onEdit: (pin: Pin) => void;
    mapId: string | undefined;
}

const PinDetails: React.FC<PinDetailsProps> = ({ pin, onClose, onEdit, mapId }) => {
    const { user } = useAuth();
    const { isPlayerView, maps } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPrivateComment, setIsPrivateComment] = useState(false);

    useEffect(() => {
        const fetchComments = async () => {
            if (pin) {
                const { data, error } = await supabase
                    .from('comments')
                    .select('*, users(username)')
                    .eq('pin_id', pin.id)
                    .order('created_at', { ascending: true });
                if (data) setComments(data as any);
                if (error) console.error("Error fetching comments", error);
            } else {
                setComments([]);
            }
        };
        fetchComments();
    }, [pin]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !pin || !user) return;

        const { data, error } = await supabase
            .from('comments')
            .insert({
                pin_id: pin.id,
                user_id: user.id,
                text: newComment,
                is_private: isPrivateComment
            })
            .select('*, users(username)')
            .single();

        if (data) setComments([...comments, data as any]);
        if (error) console.error("Error adding comment", error);

        setNewComment('');
        setIsPrivateComment(false);
    };

    if (!pin) return null;

    const isDM = user?.profile.role === 'DM';
    const linkedMap = maps.find(m => m.id === pin.linked_map_id);

    return (
        <aside className={`absolute top-0 right-0 h-full w-full max-w-md transform bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-800 ${pin ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span style={{ backgroundColor: pin.pin_types?.color || '#718096' }} className="flex h-8 w-8 items-center justify-center rounded-full text-lg">
                                {pin.pin_types?.emoji || '❓'}
                            </span>
                            <div>
                                <h2 className="text-2xl font-bold">{pin.title}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{pin.pin_types?.name || 'Unknown Type'}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                        <Icon name="close" className="h-6 w-6" />
                    </button>
                </div>

                {isDM && !isPlayerView && (
                    <div className="mt-4 flex gap-2">
                        <button onClick={() => onEdit(pin)} className="flex-1 rounded-md bg-primary-500 px-3 py-1.5 text-sm text-white hover:bg-primary-600">Edit Pin</button>
                    </div>
                )}

                <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
                    {pin.data.description && <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pin.data.description}</p>}
                    
                    {linkedMap && (
                        <div>
                             <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">Linked Map</h3>
                            <p className="text-primary-500 dark:text-primary-400">{linkedMap.name}</p>
                        </div>
                    )}

                    {pin.data.sections?.map((section, index) => (
                        <div key={index}>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{section.title}</h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{section.content}</p>
                        </div>
                    ))}
                    
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">Comments</h3>
                        <div className="space-y-3">
                            {comments.map(comment => (
                                <div key={comment.id} className="text-sm">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">{comment.users.username}</p>
                                        <p className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</p>
                                        {comment.is_private && <span className="text-xs text-yellow-500">(Private)</span>}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAddComment} className="space-y-2">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                rows={2}
                            ></textarea>
                            <div className="flex justify-between items-center">
                                 <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                                    <input type="checkbox" checked={isPrivateComment} onChange={(e) => setIsPrivateComment(e.target.checked)} className="rounded text-primary-500 focus:ring-primary-500" />
                                    Private
                                </label>
                                <button type="submit" className="rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default PinDetails;