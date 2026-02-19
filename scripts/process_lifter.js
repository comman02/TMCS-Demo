import { Jimp } from "jimp";
import path from "path";
import fs from "fs";

async function processImage() {
    const inputPath = path.resolve("public/lifter-source.png");
    const outputPath = path.resolve("public/lifter-default.png");

    console.log(`Reading image from ${inputPath}`);

    try {
        const buffer = fs.readFileSync(inputPath);
        const image = await Jimp.read(buffer);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        console.log(`Processing image (${width}x${height}): Flood-filling external white to transparent...`);

        // Helper to check if pixel is "white"
        function isWhite(idx) {
            const r = image.bitmap.data[idx + 0];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];
            // Threshold > 240
            return r > 240 && g > 240 && b > 240;
        }

        // Helper to set pixel transparent
        function setTransparent(idx) {
            image.bitmap.data[idx + 3] = 0;
        }

        const visited = new Set();
        const queue = [];

        // Initialize queue with all boundary pixels that are white
        // Top and Bottom rows
        for (let x = 0; x < width; x++) {
            // Top
            let idx = (0 * width + x) * 4;
            if (isWhite(idx)) queue.push({ x, y: 0 });

            // Bottom
            idx = ((height - 1) * width + x) * 4;
            if (isWhite(idx)) queue.push({ x, y: height - 1 });
        }
        // Left and Right cols
        for (let y = 0; y < height; y++) {
            // Left
            let idx = (y * width + 0) * 4;
            if (isWhite(idx)) queue.push({ x: 0, y });

            // Right
            idx = (y * width + (width - 1)) * 4;
            if (isWhite(idx)) queue.push({ x: width - 1, y });
        }

        console.log(`Found ${queue.length} white pixels on boundary. Starting flood fill...`);

        let pixelsChanged = 0;

        while (queue.length > 0) {
            const { x, y } = queue.pop();
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const idx = (y * width + x) * 4;

            // Double check it's white (it should be if it came from queue, but good for safety)
            if (isWhite(idx)) {
                setTransparent(idx);
                pixelsChanged++;

                // Add neighbors
                const neighbors = [
                    { x: x + 1, y }, { x: x - 1, y },
                    { x, y: y + 1 }, { x, y: y - 1 }
                ];

                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                        const nIdx = (n.y * width + n.x) * 4;
                        const nKey = `${n.x},${n.y}`;
                        if (!visited.has(nKey) && isWhite(nIdx)) {
                            queue.push(n);
                        }
                    }
                }
            }
        }

        console.log(`Changed ${pixelsChanged} pixels to transparent (External only).`);

        await image.write(outputPath);
        console.log(`Saved new processed image to ${outputPath}`);

    } catch (err) {
        console.error("Error processing image:", err);
        process.exit(1);
    }
}

processImage();
