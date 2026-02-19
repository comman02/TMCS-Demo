export { };

declare global {
    interface Window {
        showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
    }

    interface FileSystemFileHandle {
        createWritable(): Promise<FileSystemWritableFileStream>;
    }

    interface FileSystemWritableFileStream extends WritableStream {
        write(data: unknown): Promise<void>;
        close(): Promise<void>;
    }
}

interface ImportMetaEnv {
    readonly VITE_DWG_CONVERTER_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
