import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Modal } from './Modals';
import { Icon } from './Icons';
import { Faction, FactionMatrix, FactionRelationType, FactionHistoryEntry } from '../types';

interface FactionManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FactionManagerModal: React.FC<FactionManagerModalProps> = ({ isOpen, onClose }) => {
    const { 
        factions, 
        factionMatrix, 
        updateLocalFaction, 
        updateLocalFactionMatrix, 
        removeLocalItem 
    } = useAppContext();

    const [activeTab, setActiveTab] = useState<'directory' | 'matrix' | 'create'>('directory');
    const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form states for creating a new faction
    const [newFactionName, setNewFactionName] = useState('');
    const [newFactionMin, setNewFactionMin] = useState(-100);
    const [newFactionMax, setNewFactionMax] = useState(100);
    const [newFactionStarting, setNewFactionStarting] = useState(0);

    // Form states for quick updates
    const [selectedTargetFactionId, setSelectedTargetFactionId] = useState<string | null>(null);
    const [repAdjustment, setRepAdjustment] = useState<number>(0);
    const [repDescription, setRepDescription] = useState('');
    const [repInGameDate, setRepInGameDate] = useState('');

    const relationCycle: FactionRelationType[] = ['neutral', 'positive', 'negative'];

    const getSelectedFaction = (): Faction | null => {
        return factions.find(f => f.id === selectedFactionId) || null;
    };

    const handleCreateFaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFactionName.trim()) return;

        const newId = crypto.randomUUID();
        const createdFaction: Faction = {
            id: newId,
            name: newFactionName.trim(),
            currentReputation: Math.max(newFactionMin, Math.min(newFactionMax, newFactionStarting)),
            minScale: newFactionMin,
            maxScale: newFactionMax,
            historyLog: [
                {
                    eventId: crypto.randomUUID(),
                    realWorldTimestamp: new Date().toISOString(),
                    inGameDate: 'Starting Era',
                    delta: newFactionStarting,
                    description: 'Faction founded/registered in chronicle records.',
                    isDirectTrigger: true,
                    catalystFactionId: null
                }
            ]
        };

        // Initialize relations in the matrix for this new faction symmetrically
        const updatedMatrix = { ...factionMatrix };
        if (!updatedMatrix[newId]) {
            updatedMatrix[newId] = {};
        }

        factions.forEach(f => {
            if (!updatedMatrix[f.id]) updatedMatrix[f.id] = {};
            updatedMatrix[f.id][newId] = { relation: 'neutral', weight: 1.0 };
            updatedMatrix[newId][f.id] = { relation: 'neutral', weight: 1.0 };
        });

        await updateLocalFaction(createdFaction);
        await updateLocalFactionMatrix(updatedMatrix);

        // Reset
        setNewFactionName('');
        setNewFactionMin(-100);
        setNewFactionMax(100);
        setNewFactionStarting(0);
        setSelectedFactionId(newId);
        setActiveTab('directory');
    };

    const handleDeleteFaction = async (id: string) => {
        // Symmetrically clear relation links
        const updatedMatrix = { ...factionMatrix };
        delete updatedMatrix[id];
        factions.forEach(f => {
            if (updatedMatrix[f.id]) {
                delete updatedMatrix[f.id][id];
            }
        });

        await updateLocalFactionMatrix(updatedMatrix);
        removeLocalItem('faction', id);
        if (selectedFactionId === id) setSelectedFactionId(null);
        if (selectedTargetFactionId === id) setSelectedTargetFactionId(null);
        setConfirmDeleteId(null);
    };

    // Cycle through Positive -> Negative -> Neutral for a matrix grid cell
    const toggleMatrixRelation = async (factionAId: string, factionBId: string) => {
        if (factionAId === factionBId) return;

        const currentRelObj = factionMatrix[factionAId]?.[factionBId] || { relation: 'neutral', weight: 1.0 };
        const currentIndex = relationCycle.indexOf(currentRelObj.relation);
        const nextRelation = relationCycle[(currentIndex + 1) % relationCycle.length];

        const updatedMatrix = { ...factionMatrix };
        
        if (!updatedMatrix[factionAId]) updatedMatrix[factionAId] = {};
        if (!updatedMatrix[factionBId]) updatedMatrix[factionBId] = {};

        const updatedRelation = {
            relation: nextRelation,
            weight: currentRelObj.weight || 1.0
        };

        updatedMatrix[factionAId][factionBId] = updatedRelation;
        updatedMatrix[factionBId][factionAId] = updatedRelation; // keep symmetrical

        await updateLocalFactionMatrix(updatedMatrix);
    };

    // Modify relation weightmultiplier
    const changeMatrixRelationWeight = async (factionAId: string, factionBId: string, newWeight: number) => {
        if (factionAId === factionBId) return;
        const updatedMatrix = { ...factionMatrix };

        if (!updatedMatrix[factionAId]) updatedMatrix[factionAId] = {};
        if (!updatedMatrix[factionBId]) updatedMatrix[factionBId] = {};

        const currentRelAObj = updatedMatrix[factionAId][factionBId] || { relation: 'neutral', weight: 1.0 };

        const updatedRelation = {
            ...currentRelAObj,
            weight: Number(newWeight)
        };

        updatedMatrix[factionAId][factionBId] = updatedRelation;
        updatedMatrix[factionBId][factionAId] = updatedRelation;

        await updateLocalFactionMatrix(updatedMatrix);
    };

    // The heart of the cascade math. Updates a faction directly AND triggers proxy updates based on the matrix.
    const executeFactionStandingAdjustment = async (
        targetFactionId: string,
        delta: number,
        customDescription?: string,
        customInGameDate?: string
    ) => {
        if (delta === 0) return;

        const targetFaction = factions.find(f => f.id === targetFactionId);
        if (!targetFaction) return;

        const eventId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const inGameDateStr = (customInGameDate || repInGameDate || 'Standard Era').trim();
        const descStr = (customDescription || repDescription || '').trim();

        // 1. Compute direct faction standing change
        const finalDirectRep = Math.max(targetFaction.minScale, Math.min(targetFaction.maxScale, targetFaction.currentReputation + delta));
        const actualDirectDelta = finalDirectRep - targetFaction.currentReputation;

        const directEntry: FactionHistoryEntry = {
            eventId,
            realWorldTimestamp: timestamp,
            inGameDate: inGameDateStr,
            delta: actualDirectDelta,
            description: descStr || `Direct reputation shift with ${targetFaction.name}.`,
            isDirectTrigger: true,
            catalystFactionId: null
        };

        const updatedDirectFaction: Faction = {
            ...targetFaction,
            currentReputation: finalDirectRep,
            historyLog: [directEntry, ...targetFaction.historyLog]
        };

        // Quick state map to apply database saves
        await updateLocalFaction(updatedDirectFaction);

        // 2. Cascade proxy updates globally
        for (const otherFaction of factions) {
            if (otherFaction.id === targetFactionId) continue;

            const relationship = factionMatrix[targetFactionId]?.[otherFaction.id] || factionMatrix[otherFaction.id]?.[targetFactionId];
            if (!relationship || relationship.relation === 'neutral') continue;

            let weightVal = relationship.weight ?? 1.0;
            // Legacy decimal weights fallback: convert old 0.1-5.0 scale to 10-500 percentage scale
            if (weightVal <= 5.0) {
                weightVal = weightVal * 100;
            }
            const ratioWeight = weightVal / 100;
            let rawProxyDelta = actualDirectDelta * ratioWeight;
            
            if (relationship.relation === 'negative') {
                rawProxyDelta = -rawProxyDelta;
            }

            const proxyDelta = Math.round(rawProxyDelta);
            if (proxyDelta === 0) continue;

            const finalProxyRep = Math.max(otherFaction.minScale, Math.min(otherFaction.maxScale, otherFaction.currentReputation + proxyDelta));
            const actualProxyDelta = finalProxyRep - otherFaction.currentReputation;

            if (actualProxyDelta !== 0) {
                const proxyEntry: FactionHistoryEntry = {
                    eventId: crypto.randomUUID(),
                    realWorldTimestamp: timestamp,
                    inGameDate: inGameDateStr,
                    delta: actualProxyDelta,
                    description: `Passive cascade via correlation with ${targetFaction.name}. Reason: ${descStr || 'Standing change'}`,
                    isDirectTrigger: false,
                    catalystFactionId: targetFactionId
                };

                const updatedProxyFaction: Faction = {
                    ...otherFaction,
                    currentReputation: finalProxyRep,
                    historyLog: [proxyEntry, ...otherFaction.historyLog]
                };

                await updateLocalFaction(updatedProxyFaction);
            }
        }

        // Clean form states
        setRepDescription('');
        setRepAdjustment(0);
        setSelectedTargetFactionId(null);
    };

    const getStatusTheme = (rep: number, max: number, min: number) => {
        const percentage = ((rep - min) / (max - min)) * 100;
        if (percentage >= 70) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
        if (percentage <= 30) return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
        return { bg: 'bg-dnd-gold/10', text: 'text-dnd-gold', border: 'border-dnd-gold/20' };
    };

    const currentSelectedFaction = getSelectedFaction();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Faction Reputation Engine" maxWidthClass="max-w-6xl">
            <div className="flex flex-col gap-6 h-[80vh] overflow-hidden">
                
                {/* Custom Tab Panel Navigation */}
                <div className="flex border-b border-white/5 pb-2 -mx-1 gap-2 shrink-0">
                    <button 
                        onClick={() => setActiveTab('directory')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${activeTab === 'directory' ? 'bg-dnd-gold/10 border border-dnd-gold/30 text-dnd-gold' : 'text-dnd-text/40 hover:text-white/80'}`}
                    >
                        <Icon name="list" className="w-3.5 h-3.5" /> Faction Directory
                    </button>
                    <button 
                        onClick={() => setActiveTab('matrix')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${activeTab === 'matrix' ? 'bg-dnd-gold/10 border border-dnd-gold/30 text-dnd-gold' : 'text-dnd-text/40 hover:text-white/80'}`}
                    >
                        <Icon name="globe" className="w-3.5 h-3.5" /> Inter-Relation Matrix
                    </button>
                    <button 
                        onClick={() => setActiveTab('create')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${activeTab === 'create' ? 'bg-dnd-gold/10 border border-dnd-gold/30 text-dnd-gold' : 'text-dnd-text/40 hover:text-white/80'}`}
                    >
                        <Icon name="plus" className="w-3.5 h-3.5" /> Found New Faction
                    </button>
                </div>

                {/* TAB content elements */}
                <div className="flex-1 overflow-hidden min-h-0">
                    {activeTab === 'create' && (
                        <div className="max-w-xl mx-auto py-6">
                            <div className="glass-panel p-8 border border-white/5 rounded-3xl space-y-6 shadow-2xl">
                                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                                    <div className="p-3 rounded-2xl bg-dnd-gold/15 text-dnd-gold">
                                        <Icon name="shield" className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-black text-white text-lg tracking-wide uppercase">Found New Faction</h3>
                                        <p className="text-[10px] text-dnd-text/40 font-bold uppercase tracking-[0.15em]">Register a new diplomatic power</p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateFaction} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-dnd-text/40">Faction Title</label>
                                        <input 
                                            type="text"
                                            required
                                            value={newFactionName}
                                            onChange={e => setNewFactionName(e.target.value)}
                                            placeholder="e.g. Order of the Golden Laurel"
                                            className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-xs text-white placeholder-dnd-text/20 focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner font-bold"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-dnd-text/40">Minimum Limit</label>
                                            <input 
                                                type="number"
                                                required
                                                value={newFactionMin}
                                                onChange={e => setNewFactionMin(Number(e.target.value))}
                                                className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-xs text-white focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-dnd-text/40">Maximum Limit</label>
                                            <input 
                                                type="number"
                                                required
                                                value={newFactionMax}
                                                onChange={e => setNewFactionMax(Number(e.target.value))}
                                                className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-xs text-white focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-dnd-text/40">Baseline Starting Standing</label>
                                        <input 
                                            type="number"
                                            required
                                            value={newFactionStarting}
                                            onChange={e => setNewFactionStarting(Number(e.target.value))}
                                            placeholder="Default is 0 (neutral)"
                                            className="w-full rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-xs text-white focus:outline-none focus:border-dnd-gold/50 transition-all shadow-inner text-center font-serif text-lg text-dnd-gold"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button 
                                            type="submit"
                                            className="bg-dnd-gold hover:brightness-110 text-white font-bold cursor-pointer rounded-2xl px-6 py-4 text-xs uppercase tracking-widest transition-all shadow-lg shadow-dnd-gold/20"
                                        >
                                            Found Faction
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'directory' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
                            {/* Left column faction details selection */}
                            <div className="lg:col-span-8 flex flex-col gap-4 overflow-y-auto pr-1">
                                {factions.length === 0 ? (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center my-auto flex flex-col items-center justify-center">
                                        <Icon name="shield" className="w-16 h-16 text-dnd-text/20 mb-4 animate-pulse" />
                                        <h4 className="text-white font-serif font-bold text-lg mb-1">No diplomatic factions present</h4>
                                        <p className="text-dnd-text/40 text-xs max-w-sm">Every chronicle needs its plotting courts. Use the "Found New Faction" tab to establish your world's first organization.</p>
                                    </div>
                                ) : (
                                    factions.map(f => {
                                        const theme = getStatusTheme(f.currentReputation, f.maxScale, f.minScale);
                                        const range = f.maxScale - f.minScale;
                                        const relativePosition = range === 0 ? 50 : ((f.currentReputation - f.minScale) / range) * 100;

                                        return (
                                            <div 
                                                key={f.id}
                                                onClick={() => setSelectedFactionId(f.id)}
                                                className={`group relative p-6 bg-white/[0.02] hover:bg-white/[0.04] border rounded-3xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden ${selectedFactionId === f.id ? 'border-dnd-gold/50 shadow-lg shadow-dnd-gold/5 bg-white/[0.04]' : 'border-white/5'}`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-serif font-black text-white text-base truncate group-hover:text-dnd-gold transition-colors">{f.name}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${theme.bg} ${theme.text} border ${theme.border}`}>
                                                            {f.currentReputation > 0 ? `+${f.currentReputation}` : f.currentReputation}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Slider and progress track visual */}
                                                    <div className="mt-4 flex items-center gap-4">
                                                        <span className="text-[10px] font-mono text-dnd-text/30 font-bold">{f.minScale}</span>
                                                        <div className="flex-1 h-2 relative rounded-full bg-black/40 shadow-inner">
                                                            {/* Median separator line */}
                                                            <div className="absolute left-[50%] top-0 w-[1px] h-full bg-white/20 z-0" />
                                                            {/* Range scale colored tracker */}
                                                            <div 
                                                                className={`absolute h-full rounded-full ${theme.bg.replace('/10', '')} z-10`}
                                                                style={{ 
                                                                    left: relativePosition >= 50 ? '50%' : `${relativePosition}%`, 
                                                                    width: `${Math.abs(relativePosition - 50)}%` 
                                                                }}
                                                            />
                                                            {/* Cursor element */}
                                                            <div 
                                                                className="absolute w-3.5 h-3.5 -mt-0.5 rounded-full border border-white/60 bg-dnd-dark flex items-center justify-center shadow-lg transform -translate-x-[50%] z-20 outline-none hover:scale-110 transition-transform"
                                                                style={{ left: `${relativePosition}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-mono text-dnd-text/30 font-bold">{f.maxScale}</span>
                                                    </div>
                                                </div>

                                                {/* Standing Adjustment Forms */}
                                                <div className="flex items-center gap-3 md:border-l border-white/5 md:pl-6 shrink-0" onClick={e => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedTargetFactionId(f.id);
                                                            setRepAdjustment(-5);
                                                        }}
                                                        className="w-10 h-10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active:scale-95 transition-all rounded-xl flex items-center justify-center cursor-pointer font-bold"
                                                        title="Indict Reputation (-5)"
                                                    >
                                                        <Icon name="minus" className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedTargetFactionId(f.id);
                                                            setRepAdjustment(5);
                                                        }}
                                                        className="w-10 h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 active:scale-95 transition-all rounded-xl flex items-center justify-center cursor-pointer font-bold"
                                                        title="Befriend Reputation (+5)"
                                                    >
                                                        <Icon name="plus" className="w-4 h-4" />
                                                    </button>
                                                    {confirmDeleteId === f.id ? (
                                                        <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-xl p-1 animate-pulse">
                                                            <span className="text-[9px] text-rose-400 font-black px-1.5 uppercase select-none tracking-wider">Erase?</span>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteFaction(f.id);
                                                                }}
                                                                className="p-1 px-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg cursor-pointer font-bold transition-all"
                                                                title="Confirm Dissolve"
                                                            >
                                                                <Icon name="check" className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteId(null);
                                                                }}
                                                                className="p-1 px-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg cursor-pointer font-bold transition-all"
                                                                title="Cancel"
                                                            >
                                                                <Icon name="close" className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteId(f.id);
                                                            }}
                                                            className="p-3 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-dnd-text/30 hover:text-rose-400 transition-all rounded-xl cursor-pointer"
                                                            title="Dissolve Faction"
                                                        >
                                                            <Icon name="trash" className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Right column detailed history drawer view + Manual Standings Editor */}
                            <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
                                {selectedTargetFactionId ? (
                                    <div className="glass-panel p-6 border border-white/10 rounded-2xl space-y-4 shadow-2xl shrink-0 bg-[#1c1c1c]/90 relative">
                                        <div className="flex justify-between items-start border-b border-white/5 pb-2">
                                            <div>
                                                <h4 className="font-serif font-black text-white text-base tracking-wide uppercase">Adjust Standing</h4>
                                                <p className="text-[10px] text-dnd-gold uppercase tracking-wider font-bold">
                                                    Target: {factions.find(f => f.id === selectedTargetFactionId)?.name}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedTargetFactionId(null)}
                                                className="p-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-dnd-text/50 hover:text-white transition-colors cursor-pointer"
                                            >
                                                <Icon name="close" className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="space-y-4 pt-1">
                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-dnd-text/50">Reputation Amount</label>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="number"
                                                        value={repAdjustment}
                                                        onChange={e => setRepAdjustment(Number(e.target.value))}
                                                        className="flex-1 rounded-xl border border-white/10 bg-black/40 hover:bg-black/50 focus:border-dnd-gold/60 focus:ring-1 focus:ring-dnd-gold/30 hover:border-white/20 transition-all px-4 py-3 text-xs text-center text-white focus:outline-none font-bold"
                                                    />
                                                    <span className="text-[10px] uppercase tracking-wider font-black text-dnd-text/40">Points</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-dnd-text/50">Chronicle Calendar Date</label>
                                                <input 
                                                    type="text"
                                                    value={repInGameDate}
                                                    onChange={e => setRepInGameDate(e.target.value)}
                                                    placeholder="e.g. 14th of Mirtul, 1492 DR"
                                                    className="w-full rounded-xl border border-white/10 bg-black/40 hover:bg-black/50 focus:border-dnd-gold/60 focus:ring-1 focus:ring-dnd-gold/30 hover:border-white/20 px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none transition-all font-bold"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-dnd-text/50">Sovereign Reason / Event Description</label>
                                                <textarea 
                                                    value={repDescription}
                                                    onChange={e => setRepDescription(e.target.value)}
                                                    placeholder="Describe the transaction, victory, or offense..."
                                                    className="w-full h-20 rounded-xl border border-white/10 bg-black/40 hover:bg-black/50 focus:border-dnd-gold/60 focus:ring-1 focus:ring-dnd-gold/30 hover:border-white/20 px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none transition-all font-medium resize-none"
                                                />
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    if(selectedTargetFactionId) {
                                                        executeFactionStandingAdjustment(
                                                            selectedTargetFactionId, 
                                                            repAdjustment, 
                                                            repDescription, 
                                                            repInGameDate
                                                        );
                                                    }
                                                }}
                                                className="w-full bg-dnd-gold hover:brightness-110 active:scale-[0.98] text-white font-bold cursor-pointer rounded-xl py-3 text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-dnd-gold/10 mt-2"
                                            >
                                                Authorize & Propagate
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex-1 min-h-0 glass-panel bg-[#1c1c1c]/90 border border-white/10 rounded-2xl p-6 flex flex-col shadow-2xl relative">
                                    <div className="border-b border-white/5 pb-3">
                                        <h4 className="font-serif font-black text-white text-base tracking-wide uppercase">Diplomatic Event Ledger</h4>
                                        <p className="text-[10px] text-dnd-gold uppercase tracking-wider font-bold truncate">
                                            {currentSelectedFaction ? `Logs for: ${currentSelectedFaction.name}` : 'Select a faction to view history'}
                                        </p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 custom-scrollbar">
                                        {currentSelectedFaction ? (
                                            currentSelectedFaction.historyLog.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 text-center text-dnd-text/20">
                                                    <Icon name="shield" className="w-8 h-8 opacity-40 mb-2" />
                                                    <p className="text-xs font-serif font-bold italic">No registered events recorded.</p>
                                                </div>
                                            ) : (
                                                currentSelectedFaction.historyLog.map(entry => {
                                                    const isPositive = entry.delta >= 0;
                                                    let relationTitle = isPositive ? `+${entry.delta}` : `${entry.delta}`;

                                                    return (
                                                        <div key={entry.eventId} className="p-4 bg-black/30 hover:bg-black/40 border border-white/5 hover:border-dnd-gold/15 rounded-xl relative overflow-hidden flex flex-col gap-2 transition-all">
                                                            <div className="absolute top-0 bottom-0 left-0 w-[3px]" style={{ backgroundColor: isPositive ? '#10b981' : '#f43f5e' }} />
                                                            <div className="flex items-center justify-between gap-2 pl-1.5">
                                                                <span className={`text-xs font-mono font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {relationTitle} Standing
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-dnd-text/50 font-bold font-mono tracking-wide">{entry.inGameDate || 'Standard Era'}</span>
                                                            </div>
                                                            <p className="text-xs text-dnd-text/80 leading-relaxed font-serif pl-1.5">{entry.description}</p>
                                                            <div className="flex justify-between items-center text-[8px] text-dnd-text/40 font-bold uppercase tracking-wider mt-1 border-t border-white/5 pt-1.5 pl-1.5">
                                                                <span>{entry.isDirectTrigger ? 'Direct Standing' : 'Passive Cascade'}</span>
                                                                <span>{entry.realWorldTimestamp ? new Date(entry.realWorldTimestamp).toLocaleDateString() : ''}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-16 text-center text-dnd-text/30">
                                                <Icon name="clock" className="w-8 h-8 opacity-20 mb-2" />
                                                <p className="text-xs font-serif font-bold italic">Choose an index faction on the left to review its chronicle diary</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'matrix' && (
                        <div className="h-full flex flex-col overflow-hidden">
                            <div className="bg-white/[0.02] p-4 border border-white/5 rounded-2xl flex items-center gap-3 shrink-0 mb-4">
                                <div className="text-dnd-gold p-2 bg-dnd-gold/10 rounded-xl">
                                    <Icon name="info" className="w-4 h-4" />
                                </div>
                                <div className="text-[10px] uppercase font-bold tracking-[0.1em] text-dnd-text/60 leading-normal">
                                    <span className="text-white">Inter-Relation Matrix:</span> Clicking any grid cell toggles the diplomatic alliance standing between Factions.
                                    <span className="text-emerald-400 ml-1">Positive (+)</span> propagates reputation, <span className="text-rose-400 ml-1">Negative (-)</span> opposes reputations, and <span className="text-dnd-text/30">Neutral (Blank)</span> seals them. Adjust multipliers to configure cascading standing scale.
                                </div>
                            </div>

                            {/* Table scroll box */}
                            <div className="flex-1 overflow-auto border border-white/5 rounded-2xl bg-black/10 shadow-inner">
                                {factions.length === 0 ? (
                                    <p className="text-center text-xs text-dnd-text/30 py-24 uppercase font-bold tracking-[0.1em]">Found factions inside directory to enable the matrix chart</p>
                                ) : (
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="sticky top-0 left-0 bg-dnd-dark border-b border-r border-white/5 p-4 z-50 text-left text-[9px] font-black uppercase text-dnd-text/40 tracking-widest min-w-[150px]">Faction Axis</th>
                                                {factions.map(f => (
                                                    <th key={f.id} className="sticky top-0 bg-dnd-panel border-b border-white/5 p-4 z-40 text-center text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[140px]">{f.name}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {factions.map(factionRow => (
                                                <tr key={factionRow.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="sticky left-0 bg-dnd-panel border-r border-b border-white/5 p-4 z-30 font-serif font-black text-xs text-white truncate max-w-[150px]">{factionRow.name}</td>
                                                    {factions.map(factionCol => {
                                                        const isSelf = factionRow.id === factionCol.id;
                                                        if (isSelf) {
                                                            return (
                                                                <td key={factionCol.id} className="border-b border-white/5 p-4 bg-black/40 text-center text-dnd-text/10 text-[9px] font-mono select-none">
                                                                    — Self —
                                                                </td>
                                                            );
                                                        }

                                                        const cellRelObj = factionMatrix[factionRow.id]?.[factionCol.id] || { relation: 'neutral', weight: 1.0 };
                                                        const isPos = cellRelObj.relation === 'positive';
                                                        const isNeg = cellRelObj.relation === 'negative';

                                                        return (
                                                            <td key={factionCol.id} className="border-b border-white/5 p-4 text-center">
                                                                <div className="flex flex-col items-center justify-center gap-2">
                                                                    <button 
                                                                        onClick={() => toggleMatrixRelation(factionRow.id, factionCol.id)}
                                                                        className={`w-14 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all focus:outline-none cursor-pointer ${isPos ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : isNeg ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400' : 'bg-white/[0.02] hover:bg-white/[0.05] text-dnd-text/20 border border-white/5'}`}
                                                                        title="Cycle Standing Relation Type"
                                                                    >
                                                                        {isPos ? '+' : isNeg ? '-' : 'Ø'}
                                                                    </button>

                                                                    {!isSelf && cellRelObj.relation !== 'neutral' && (
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/30 border border-white/10">
                                                                            <span className="text-[8px] font-black uppercase text-dnd-text/40 select-none">W:</span>
                                                                            <input 
                                                                                type="number"
                                                                                step="1"
                                                                                min="1"
                                                                                max="200"
                                                                                value={cellRelObj.weight ? (cellRelObj.weight <= 5.0 ? Math.round(cellRelObj.weight * 100) : cellRelObj.weight) : 100}
                                                                                onChange={e => changeMatrixRelationWeight(factionRow.id, factionCol.id, Number(e.target.value))}
                                                                                className="w-10 bg-transparent text-center border-none text-[10px] font-bold font-mono text-dnd-gold p-0 focus:outline-none focus:ring-0"
                                                                            />
                                                                            <span className="text-[8px] font-mono font-bold text-dnd-text/40 select-none">%</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
