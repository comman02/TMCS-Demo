import { Jimp } from "jimp";
import path from "path";
import fs from "fs";

async function processImage() {
    const inputPath = path.resolve("public/oht-source-v2.png");
    const outputPath = path.resolve("public/oht-processed-v2.png");

    console.log(`Reading image from ${inputPath}`);

    try {
        const buffer = fs.readFileSync(inputPath);
        const image = await Jimp.read(buffer);

        console.log("Processing image: Removing white background...");

        let pixelsChanged = 0;

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            const a = this.bitmap.data[idx + 3];

            // If somewhat opaque
            if (a > 50) {
                // If pixel is White or extremely Light Grey
                // The image looks cleaner, so strict white threshold might be okay, but let's be safe with > 240
                if (r > 240 && g > 240 && b > 240) {
                    // Set to transparent
                    this.bitmap.data[idx + 3] = 0;
                    pixelsChanged++;
                }
            }
        });

        console.log(`Changed ${pixelsChanged} pixels to transparent.`);

        await image.write(outputPath);
        console.log(`Saved new processed image to ${outputPath}`);

    } catch (err) {
        console.error("Error processing image:", err);
        process.exit(1);
    }
}

processImage();
