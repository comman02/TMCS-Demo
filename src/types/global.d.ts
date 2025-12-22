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
