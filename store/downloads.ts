import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Id } from '../convex/_generated/dataModel';

export interface ExtractedFile {
  filename: string;
  filePath: string;
  size: number;
}

export interface DownloadedItem {
  id: Id<'parts'>;
  titleName: string;
  filename: string;
  folderPath: string;
  publicFolderUri?: string;
  size: string;
  format: 'zip' | 'video';
  downloadedAt: number;
  extractedFiles?: ExtractedFile[];
}

interface DownloadsState {
  items: DownloadedItem[];
  add: (item: DownloadedItem) => void;
  remove: (id: Id<'parts'>) => void;
  clear: () => void;
}

export const useDownloadsStore = create<DownloadsState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => ({
          items: [item, ...state.items.filter((i) => i.id !== item.id)],
        })),
      remove: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'zipsender-downloads-v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);