import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'src', 'assets', 'icongame.png');
const outputPath = path.join(__dirname, 'src', 'assets', 'icongame_cropped.png');

async function cropImage() {
    try {
        console.log('Cropping image...');
        await sharp(inputPath)
            .trim()
            .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toFile(outputPath);
        console.log('Successfully cropped image to', outputPath);
    } catch (err) {
        console.error('Error cropping image:', err);
    }
}

cropImage();
