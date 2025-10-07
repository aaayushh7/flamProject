import { ImageStats, ViewerOptions, ProcessingOptions } from './types';

export class FrameViewer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private currentImage: HTMLImageElement | null = null;
    private originalImageData: ImageData | null = null;
    private options: ViewerOptions = {
        grayscale: false,
        edgeDetection: false
    };
    private processingOptions: ProcessingOptions = {
        threshold1: 50,
        threshold2: 150,
        blurSize: 5
    };
    private frameCount = 0;
    private lastFpsUpdate = 0;
    private fps = 0;
    private processingTime = 0;
    private isProcessing = false;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context');
        }
        this.ctx = context;
        this.setupDragAndDrop();
    }

    private setupDragAndDrop(): void {
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.canvas.style.border = '2px dashed #03dac6';
        });

        this.canvas.addEventListener('dragleave', () => {
            this.canvas.style.border = 'none';
        });

        this.canvas.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.canvas.style.border = 'none';

            const file = e.dataTransfer?.files[0];
            if (file && file.type.startsWith('image/')) {
                await this.loadImage(file);
            }
        });
    }

    public async loadImage(file: File): Promise<void> {
        this.setLoading(true);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.currentImage = img;
                    this.resizeCanvas();
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                    this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    this.render();
                    this.setLoading(false);
                    resolve();
                };
                img.onerror = (err) => {
                    this.setLoading(false);
                    reject(err);
                };
                img.src = e.target?.result as string;
            };
            reader.onerror = (err) => {
                this.setLoading(false);
                reject(err);
            };
            reader.readAsDataURL(file);
        });
    }

    private setLoading(loading: boolean): void {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (loading) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
        this.isProcessing = loading;
    }

    private resizeCanvas(): void {
        if (!this.currentImage) return;

        const maxWidth = this.canvas.parentElement?.clientWidth || 1000;
        const scale = Math.min(1, maxWidth / this.currentImage.width);

        this.canvas.width = this.currentImage.width * scale;
        this.canvas.height = this.currentImage.height * scale;
    }

    public async render(): Promise<void> {
        if (!this.currentImage || !this.originalImageData || this.isProcessing) return;

        const startTime = performance.now();
        this.setLoading(true);

        // Create a copy of the original image data
        const imageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );

        // Process the image
        await this.processImage(imageData);

        // Draw the processed image
        this.ctx.putImageData(imageData, 0, 0);

        // Update processing time
        this.processingTime = performance.now() - startTime;

        // Update FPS
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }

        this.setLoading(false);
    }

    private async processImage(imageData: ImageData): Promise<void> {
        const { data, width, height } = imageData;

        // Apply grayscale if enabled
        if (this.options.grayscale || this.options.edgeDetection) {
            for (let i = 0; i < data.length; i += 4) {
                const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
                data[i] = data[i + 1] = data[i + 2] = gray;
            }
        }

        // Apply edge detection if enabled
        if (this.options.edgeDetection) {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 100));

            const { threshold1, threshold2, blurSize } = this.processingOptions;
            
            // Apply Gaussian blur
            this.applyGaussianBlur(imageData, blurSize);
            
            // Apply Sobel operator
            const edges = this.applySobel(imageData, threshold1, threshold2);
            
            // Copy edge detection result back to image data
            for (let i = 0; i < data.length; i += 4) {
                const edgeValue = edges[i / 4];
                data[i] = data[i + 1] = data[i + 2] = edgeValue;
                data[i + 3] = 255; // Alpha
            }
        }
    }

    private applyGaussianBlur(imageData: ImageData, size: number): void {
        // Simple box blur implementation for demonstration
        const { data, width, height } = imageData;
        const temp = new Uint8ClampedArray(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let dy = -size; dy <= size; dy++) {
                    for (let dx = -size; dx <= size; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const i = (ny * width + nx) * 4;
                            r += temp[i];
                            g += temp[i + 1];
                            b += temp[i + 2];
                            count++;
                        }
                    }
                }
                
                const i = (y * width + x) * 4;
                data[i] = r / count;
                data[i + 1] = g / count;
                data[i + 2] = b / count;
            }
        }
    }

    private applySobel(imageData: ImageData, lowThreshold: number, highThreshold: number): Uint8ClampedArray {
        const { data, width, height } = imageData;
        const output = new Uint8ClampedArray(width * height);
        
        // Sobel operators
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
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
                const idx = y * width + x;
                if (magnitude > highThreshold) {
                    output[idx] = 255;
                } else if (magnitude > lowThreshold) {
                    output[idx] = 128;
                } else {
                    output[idx] = 0;
                }
            }
        }
        
        return output;
    }

    public getStats(): ImageStats {
        return {
            width: this.canvas.width,
            height: this.canvas.height,
            fps: this.fps
        };
    }

    public getProcessingTime(): number {
        return Math.round(this.processingTime);
    }

    public setOptions(options: Partial<ViewerOptions>): void {
        this.options = { ...this.options, ...options };
        this.render();
    }

    public setProcessingOptions(options: Partial<ProcessingOptions>): void {
        this.processingOptions = { ...this.processingOptions, ...options };
        if (this.options.edgeDetection) {
            this.render();
        }
    }

    public toggleGrayscale(): void {
        this.options.grayscale = !this.options.grayscale;
        this.render();
    }

    public toggleEdgeDetection(): void {
        this.options.edgeDetection = !this.options.edgeDetection;
        this.render();
    }
}