export interface Settings {
  theme: 'light' | 'dark';
  keepNavOpen: boolean;
  centerNav: boolean;
}
export interface Field {
  x: number;
  y: number;
  name: string;
  selected: boolean;
  highlighted: boolean;
  id: number;
  texture?: string;
  width: number;
  height: number;
  scale?: number;
  image?: {
    opacity: number;
    path: string;
    saturation: boolean;
  };
  rename: boolean;
}

export interface File {
  filePath: string;
  fields: Field[];
  fieldIndex: number;
}

interface Api {
  getTheme(): Promise<'light' | 'dark'>;
  defaultSettings(): Promise<void>;
  setSettings(settings: Settings): Promise<void>;
  getSettings(): Promise<Settings>;
  clearRecent(): Promise<void>;
  getRecent(): Promise<string[]>;
  setEditorRpc(): Promise<string>;
  getImage(path: string): Promise<string>;
  openItemTexture(): Promise<string | undefined>;
  open(file?: string | string[] | undefined): Promise<File | undefined>;
  save(f: File): Promise<string | undefined>;
  minmize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  getResourcePath(): Promise<string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Api = (window as any).__api as Api;
