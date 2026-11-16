import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { itemService } from '@/services/itemService';
import { readStorage, writeStorage, STORAGE_KEYS } from '@/lib/storage';
import { seedItems } from '@/lib/seedData';

const ItemsContext = createContext(null);

export const CATEGORIES = [
  'All Categories',
  'Electronics',
  'Accessories',
  'Documents',
  'Bags',
  'Clothing',
  'Stationery',
  'Keys',
  'Other',
];

export function ItemsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(() => readStorage(STORAGE_KEYS.saved, []));

  useEffect(() => {
    writeStorage(STORAGE_KEYS.saved, savedIds);
  }, [savedIds]);

  const fetchItems = useCallback(async (params = {}) => {
    setIsLoading(true);
    try {
      const data = await itemService.getItems(params);
      if (data.items && data.items.length > 0) {
        setItems(data.items);
      } else {
        setItems(seedItems);
      }
      return data;
    } catch (err) {
      console.warn('[ITEMS] Using campus seed items fallback:', err.message);
      setItems(seedItems);
      return { items: seedItems, total: seedItems.length };
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const value = useMemo(
    () => ({
      items,
      isLoading,
      savedIds,
      fetchItems,
      async createItem(formData) {
        const newItem = await itemService.createItem(formData);
        setItems((prev) => [newItem, ...prev]);
        return newItem;
      },
      async resolveItem(id) {
        const resolved = await itemService.resolveItem(id);
        setItems((prev) => prev.map((item) => (item._id === id ? resolved : item)));
        return resolved;
      },
      async deleteItem(id) {
        await itemService.deleteItem(id);
        setItems((prev) => prev.filter((item) => item._id !== id));
      },
      getItem(id) {
        return items.find((i) => (i._id || i.id) === id) || null;
      },
      isSaved(id) {
        return savedIds.includes(id);
      },
      toggleSave(id) {
        if (!id) return;
        setSavedIds((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
      },
      getSimilarItems(targetItem, limit = 4) {
        if (!targetItem) return [];
        const targetId = targetItem._id || targetItem.id;
        return items
          .filter((item) => (item._id || item.id) !== targetId)
          .sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            if (a.category === targetItem.category) scoreA += 4;
            if (b.category === targetItem.category) scoreB += 4;
            if (a.type !== targetItem.type) scoreA += 2;
            if (b.type !== targetItem.type) scoreB += 2;
            return scoreB - scoreA;
          })
          .slice(0, limit);
      },
    }),
    [items, isLoading, savedIds, fetchItems]
  );

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems() {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
}
