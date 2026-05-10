import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExtractedFile {
  filename: string;   // e.g. "True Beauty S01E01 720p.mkv"
  filePath: string;   // absolute URI on-device
  size: number;       // bytes
}

export interface DownloadedItem {
  id: string;
  titleName: string;
  filename: string;       // original downloaded filename
  folderPath: string;     // absolute folder URI, e.g. .../Downloads/ZipSender/True Beauty season 01/
  size: string;           // human-readable total size
  format: 'zip' | 'video';
  downloadedAt: number;
  // populated after extraction (for zips) or immediately (for single videos)
  extractedFiles: ExtractedFile[];
}

interface DownloadsState {
  items: DownloadedItem[];
  add: (item: DownloadedItem) => void;
  remove: (id: string) => void;
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
