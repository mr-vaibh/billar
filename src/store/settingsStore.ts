'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  autoSave: boolean;
  setAutoSave: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoSave: true,
      setAutoSave: (value) => set({ autoSave: value }),
    }),
    { name: 'billar-settings' }
  )
);
