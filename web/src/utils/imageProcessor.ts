export interface ProcessingOptions {
    threshold1: number;
    threshold2: number;
    blurSize: number;
    grayscale: boolean;
    edgeDetection: boolean;
}

export class ImageProcessor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private processingTime: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context');
        }
        this.ctx = context;
    }

    public async processImage(
        imageData: ImageData,
        options: ProcessingOptions
    ): Promise<ImageData> {
        const startTime = performance.now();

        let processedData = imageData;

        if (options.grayscale || options.edgeDetection) {
            processedData = this.convertToGrayscale(processedData);
        }

        if (options.edgeDetection) {
            processedData = await this.applyGaussianBlur(processedData, options.blurSize);
            processedData = this.applySobelEdgeDetection(
                processedData,
                options.threshold1,
                options.threshold2
            );
        }

        this.processingTime = performance.now() - startTime;
        return processedData;
    }

    private convertToGrayscale(imageData: ImageData): ImageData {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
        return imageData;
    }

    private async applyGaussianBlur(
        imageData: ImageData,
        kernelSize: number
    ): Promise<ImageData> {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new ImageData(width, height);
        const sigma = kernelSize / 3;
        const kernel = this.createGaussianKernel(kernelSize, sigma);
        const radius = Math.floor(kernelSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0;
                let weightSum = 0;

                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const px = Math.min(Math.max(x + kx, 0), width - 1);
                        const py = Math.min(Math.max(y + ky, 0), height - 1);
                        const weight = kernel[ky + radius][kx + radius];
                        const idx = (py * width + px) * 4;

                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                        weightSum += weight;
                    }
                }

                const outIdx = (y * width + x) * 4;
                output.data[outIdx] = r / weightSum;
                output.data[outIdx + 1] = g / weightSum;
                output.data[outIdx + 2] = b / weightSum;
                output.data[outIdx + 3] = data[(y * width + x) * 4 + 3];
            }
        }

        return output;
    }

    private createGaussianKernel(size: number, sigma: number): number[][] {
        const kernel: number[][] = [];
        const center = Math.floor(size / 2);

        for (let y = 0; y < size; y++) {
            kernel[y] = [];
            for (let x = 0; x < size; x++) {
                const dx = x - center;
                const dy = y - center;
                kernel[y][x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            }
        }

        return kernel;
    }

    private applySobelEdgeDetection(
        imageData: ImageData,
        lowThreshold: number,
        highThreshold: number
    ): ImageData {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new ImageData(width, height);
        
        // Sobel kernels
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;

                // Apply convolution
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        
                        gx += data[idx] * sobelX[kernelIdx];
                        gy += data[idx] * sobelY[kernelIdx];
                    }
                }

                // Calculate gradient magnitude
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                // Apply double threshold
                const outIdx = (y * width + x) * 4;
                if (magnitude > highThreshold) {
                    output.data[outIdx] = output.data[outIdx + 1] = output.data[outIdx + 2] = 255;
                } else if (magnitude > lowThreshold) {
                    output.data[outIdx] = output.data[outIdx + 1] = output.data[outIdx + 2] = 128;
                } else {
                    output.data[outIdx] = output.data[outIdx + 1] = output.data[outIdx + 2] = 0;
                }
                output.data[outIdx + 3] = 255;
            }
        }

        return output;
    }

    public getProcessingTime(): number {
        return Math.round(this.processingTime);
    }
}
