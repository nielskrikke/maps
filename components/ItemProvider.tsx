
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ApiItem {
    index: string;
    name: string;
    url: string;
    desc?: string[];
    rarity?: { name: string };
    equipment_category?: { name: string };
    cost?: { quantity: number, unit: string };
    is_magic?: boolean;
}

interface ItemContextType {
    items: ApiItem[];
    loading: boolean;
    loadingProgress: string;
}

const ItemContext = createContext<ItemContextType>({
    items: [],
    loading: false,
    loadingProgress: '',
});

export const useItems = () => useContext(ItemContext);

const CACHE_KEY = 'dnd_items_cache_v2';
const API_BASE = 'https://www.dnd5eapi.co';

export const ItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<ApiItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState('');

    useEffect(() => {
        const loadItems = async () => {
            // 1. Check Cache
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setItems(parsed);
                        return;
                    }
                } catch (e) {
                    console.error("Cache parse error", e);
                }
            }

            setLoading(true);
            try {
                // 2. Fetch Indexes
                setLoadingProgress("Fetching item indexes...");
                const [magicRes, equipRes] = await Promise.all([
                    fetch(`${API_BASE}/api/magic-items`),
                    fetch(`${API_BASE}/api/equipment`)
                ]);
                
                const magicData = await magicRes.json();
                const equipData = await equipRes.json();

                // 3. Process & Waterfall
                const allMagic: ApiItem[] = magicData.results.map((i: any) => ({ ...i, is_magic: true }));
                const allEquip: ApiItem[] = equipData.results.map((i: any) => ({ ...i, is_magic: false }));

                // We prioritize fetching details for magic items as they are more complex
                // Equipment details can often be inferred or are simpler, but we'll fetch them all for searchability
                
                const combined = [...allMagic, ...allEquip];
                const enrichedItems: ApiItem[] = [];
                const batchSize = 10; // Request in small batches

                for (let i = 0; i < combined.length; i += batchSize) {
                    const batch = combined.slice(i, i + batchSize);
                    setLoadingProgress(`Loading item details: ${i} / ${combined.length}`);
                    
                    const details = await Promise.all(
                        batch.map(async (item) => {
                            try {
                                const res = await fetch(`${API_BASE}${item.url}`);
                                const data = await res.json();
                                return {
                                    index: item.index,
                                    name: item.name,
                                    url: item.url,
                                    desc: data.desc,
                                    rarity: data.rarity,
                                    equipment_category: data.equipment_category,
                                    cost: data.cost,
                                    is_magic: item.is_magic
                                };
                            } catch (e) {
                                console.warn(`Failed to fetch details for ${item.name}`, e);
                                return item;
                            }
                        })
                    );
                    enrichedItems.push(...details);
                    // Small delay to be nice to the API
                    await new Promise(r => setTimeout(r, 50));
                }

                setItems(enrichedItems);
                localStorage.setItem(CACHE_KEY, JSON.stringify(enrichedItems));
            } catch (err) {
                console.error("Failed to load items", err);
            } finally {
                setLoading(false);
                setLoadingProgress('');
            }
        };

        loadItems();
    }, []);

    return (
        <ItemContext.Provider value={{ items, loading, loadingProgress }}>
            {children}
        </ItemContext.Provider>
    );
};