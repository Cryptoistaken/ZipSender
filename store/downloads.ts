import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Id } from '../convex/_generated/dataModel';

export interface ExtractedFile {
  filename: string;   // e.g. "True Beauty S01E01 720p.mkv"
  filePath: string;   // absolute URI on-device
  size: number;       // bytes
}

export interface DownloadedItem {
  id: Id<'parts'>;
  titleName: string;
  filename: string;       // original downloaded filename
  folderPath: string;     // private app documentDirectory folder path (for playback)
  publicFolderUri?: string; // SAF content:// URI for the public Downloads/ZipSender/<title>/ folder (for openFolder)
  size: string;           // human-readable total size
  format: 'zip' | 'video';
  downloadedAt: number;
  // populated after extraction (for zips) or immediately (for single videos)
  // optional to gracefully handle persisted data that pre-dates this field
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
