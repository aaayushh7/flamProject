export interface ImageStats {
    width: number;
    height: number;
    fps: number;
}

export interface ViewerOptions {
    grayscale: boolean;
    edgeDetection: boolean;
}

export interface ProcessingOptions {
    threshold1: number;
    threshold2: number;
    blurSize: number;
}