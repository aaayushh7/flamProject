import { ImageProcessor, ProcessingOptions } from './utils/imageProcessor';

class App {
    private canvas: HTMLCanvasElement;
    private imageProcessor: ImageProcessor;
    private currentImage: HTMLImageElement | null = null;
    private processingOptions: ProcessingOptions = {
        threshold1: 50,
        threshold2: 150,
        blurSize: 5,
        grayscale: false,
        edgeDetection: false
    };
    private isProcessing = false;
    private lastFrameTime = 0;
    private frameCount = 0;
    private fps = 0;

    constructor() {
        this.canvas = document.getElementById('imageCanvas') as HTMLCanvasElement;
        this.imageProcessor = new ImageProcessor(this.canvas);
        this.setupEventListeners();
        this.updateFPS();
    }

    private setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Toggle buttons
        const edgeDetectionBtn = document.getElementById('toggleEdgeDetection') as HTMLButtonElement;
        const grayscaleBtn = document.getElementById('toggleGrayscale') as HTMLButtonElement;

        edgeDetectionBtn.addEventListener('click', () => {
            this.processingOptions.edgeDetection = !this.processingOptions.edgeDetection;
            edgeDetectionBtn.textContent = `Edge Detection: ${this.processingOptions.edgeDetection ? 'On' : 'Off'}`;
            edgeDetectionBtn.classList.toggle('active', this.processingOptions.edgeDetection);
            this.processImage();
        });

        grayscaleBtn.addEventListener('click', () => {
            this.processingOptions.grayscale = !this.processingOptions.grayscale;
            grayscaleBtn.textContent = `Grayscale: ${this.processingOptions.grayscale ? 'On' : 'Off'}`;
            grayscaleBtn.classList.toggle('active', this.processingOptions.grayscale);
            this.processImage();
        });

        // Sliders
        const threshold1Input = document.getElementById('threshold1') as HTMLInputElement;
        const threshold2Input = document.getElementById('threshold2') as HTMLInputElement;
        const blurSizeInput = document.getElementById('blurSize') as HTMLInputElement;

        [threshold1Input, threshold2Input, blurSizeInput].forEach(input => {
            input.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const value = parseInt(target.value);
                const valueSpan = document.getElementById(`${target.id}Value`);
                if (valueSpan) valueSpan.textContent = value.toString();

                switch (target.id) {
                    case 'threshold1':
                        this.processingOptions.threshold1 = value;
                        break;
                    case 'threshold2':
                        this.processingOptions.threshold2 = value;
                        break;
                    case 'blurSize':
                        this.processingOptions.blurSize = value;
                        break;
                }

                this.processImage();
            });
        });

        // Drag and drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.canvas.classList.add('drag-over');
        });

        this.canvas.addEventListener('dragleave', () => {
            this.canvas.classList.remove('drag-over');
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.canvas.classList.remove('drag-over');

            const file = e.dataTransfer?.files[0];
            if (file && file.type.startsWith('image/')) {
                fileInput.files = e.dataTransfer?.files;
                this.handleFileSelect({ target: fileInput } as any);
            }
        });
    }

    private async handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            const fileNameSpan = document.getElementById('fileName');
            if (fileNameSpan) fileNameSpan.textContent = file.name;

            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise(resolve => img.onload = resolve);

            this.currentImage = img;
            this.canvas.width = img.width;
            this.canvas.height = img.height;

            const resolutionSpan = document.getElementById('resolution');
            if (resolutionSpan) {
                resolutionSpan.textContent = `${img.width}x${img.height}`;
            }

            this.processImage();
        }
    }

    private async processImage() {
        if (!this.currentImage || this.isProcessing) return;

        this.isProcessing = true;
        this.showLoading(true);

        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        // Draw original image
        ctx.drawImage(this.currentImage, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Process image
        const processedImageData = await this.imageProcessor.processImage(
            imageData,
            this.processingOptions
        );

        // Update canvas with processed image
        ctx.putImageData(processedImageData, 0, 0);

        // Update processing time
        const processingTimeSpan = document.getElementById('processingTime');
        if (processingTimeSpan) {
            processingTimeSpan.textContent = this.imageProcessor.getProcessingTime().toString();
        }

        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFrameTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
            this.frameCount = 0;
            this.lastFrameTime = now;
        }

        this.isProcessing = false;
        this.showLoading(false);
    }

    private showLoading(show: boolean) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('hidden', !show);
        }
    }

    private updateFPS() {
        const fpsSpan = document.getElementById('fps');
        if (fpsSpan) {
            fpsSpan.textContent = this.fps.toString();
        }
        requestAnimationFrame(this.updateFPS.bind(this));
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new App();
});