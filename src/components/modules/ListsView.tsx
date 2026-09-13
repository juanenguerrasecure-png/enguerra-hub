import React, { useState, useEffect } from 'react';
import { FamilyList, FamilyListItem } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Package,
  Layers
} from 'lucide-react';

export const ListsView: React.FC = () => {
  const { session } = useAuth();
  const [lists, setLists] = useState<FamilyList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [items, setItems] = useState<FamilyListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Item
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  // Add List Modal
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const fetchLists = async () => {
    try {
      setLoading(true);
      const data = await api.getLists();
      setLists(data);
      if (data.length > 0 && !selectedListId) {
        setSelectedListId(data[0].List_ID);
      }
    } catch (err) {
      console.error('Failed to load lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (listId: string) => {
    try {
      const data = await api.getListItems(listId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load list items:', err);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (selectedListId) {
      fetchItems(selectedListId);
    }
  }, [selectedListId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle || !selectedListId) return;

    try {
      await api.addListItem(selectedListId, newItemTitle, newItemQty);
      setNewItemTitle('');
      setNewItemQty('');
      fetchItems(selectedListId);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleToggle = async (itemId: string, current: boolean) => {
    // Optimistic update
    setItems(prev =>
      prev.map(i => (i.Item_ID === itemId ? { ...i, Completed: !current } : i))
    );
    try {
      await api.toggleListItem(itemId, !current);
    } catch (err) {
      console.error('Toggle error:', err);
      if (selectedListId) fetchItems(selectedListId);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setItems(prev => prev.filter(i => i.Item_ID !== itemId));
    try {
      await api.deleteListItem(itemId);
    } catch (err) {
      console.error('Delete error:', err);
      if (selectedListId) fetchItems(selectedListId);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle) return;

    try {
      await api.createList({
        Title: newListTitle,
        Category: 'GENERAL',
        Visibility: 'FAMILY',
      });
      setIsNewListModalOpen(false);
      setNewListTitle('');
      fetchLists();
    } catch (err) {
      console.error('Failed to create list:', err);
    }
  };

  const currentList = lists.find(l => l.List_ID === selectedListId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-orange-700" />
            <span>Groceries & Family Lists</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Instant family synchronization • Sheets-persisted grocery requests
          </p>
        </div>

        <button
          onClick={() => setIsNewListModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-medium text-xs shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New List</span>
        </button>
      </div>

      {/* List Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {lists.map(list => (
          <button
            key={list.List_ID}
            onClick={() => setSelectedListId(list.List_ID)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
              selectedListId === list.List_ID
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{list.Title}</span>
          </button>
        ))}
      </div>

      {/* Main Checklist Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        {/* Quick Add Bar */}
        <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
          <input
            type="text"
            required
            placeholder={`Add item to ${currentList?.Title || 'list'}...`}
            value={newItemTitle}
            onChange={e => setNewItemTitle(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
          />
          <input
            type="text"
            placeholder="Qty (e.g. 2 gal, 1 box)"
            value={newItemQty}
            onChange={e => setNewItemQty(e.target.value)}
            className="w-28 sm:w-36 px-3 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* Item Rows */}
        {items.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs">
            No items in this list yet. Type above to add!
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {items.map(item => (
              <div
                key={item.Item_ID}
                className="py-3 flex items-center justify-between group hover:bg-stone-50/50 px-2 rounded-xl transition-colors"
              >
                <div
                  onClick={() => handleToggle(item.Item_ID, item.Completed)}
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                >
                  {item.Completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-stone-300 hover:text-stone-500 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      item.Completed ? 'line-through text-stone-400' : 'font-medium text-stone-800'
                    }`}
                  >
                    {item.Title}
                  </span>
                  {item.Quantity && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                      {item.Quantity}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteItem(item.Item_ID)}
                  className="p-1.5 text-stone-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New List Modal */}
      {isNewListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 pb-3 border-b border-stone-100">
              Create New Family List
            </h3>
            <form onSubmit={handleCreateList} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">List Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Costco Trip, Summer Camping, School Gear"
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewListModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-xs font-medium shadow-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
