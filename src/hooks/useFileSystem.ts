export function useFileSystem() {
    const showSaveFilePicker = async (data: string) => {
        try {
            // @ts-ignore
            if (window.showSaveFilePicker) {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: `layout-${new Date().toISOString().slice(0, 10)}.json`,
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    }],
                })
                const writable = await handle.createWritable()
                await writable.write(data)
                await writable.close()
            } else {
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `layout-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
            }
        } catch (err) {
            console.error('Save canceled or failed', err)
        }
    }

    return { showSaveFilePicker }
}
