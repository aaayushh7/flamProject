import { FrameViewer } from './frameViewer';

document.addEventListener('DOMContentLoaded', () => {
    const viewer = new FrameViewer('imageCanvas');
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const fileName = document.getElementById('fileName') as HTMLSpanElement;
    const toggleEdgeDetection = document.getElementById('toggleEdgeDetection') as HTMLButtonElement;
    const toggleGrayscale = document.getElementById('toggleGrayscale') as HTMLButtonElement;
    const resolutionElement = document.getElementById('resolution') as HTMLSpanElement;
    const fpsElement = document.getElementById('fps') as HTMLSpanElement;
    const processingTimeElement = document.getElementById('processingTime') as HTMLSpanElement;

    // Threshold sliders
    const threshold1Slider = document.getElementById('threshold1') as HTMLInputElement;
    const threshold2Slider = document.getElementById('threshold2') as HTMLInputElement;
    const blurSizeSlider = document.getElementById('blurSize') as HTMLInputElement;
    const threshold1Value = document.getElementById('threshold1Value') as HTMLSpanElement;
    const threshold2Value = document.getElementById('threshold2Value') as HTMLSpanElement;
    const blurSizeValue = document.getElementById('blurSizeValue') as HTMLSpanElement;

    // Handle file input changes
    fileInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            fileName.textContent = file.name;
            await viewer.loadImage(file);
            toggleEdgeDetection.disabled = false;
            toggleGrayscale.disabled = false;
            updateStats();
        }
    });



    // Handle grayscale toggle
    toggleGrayscale.addEventListener('click', () => {
        viewer.toggleGrayscale();
        const isActive = toggleGrayscale.classList.toggle('active');
        toggleGrayscale.textContent = `Grayscale: ${isActive ? 'On' : 'Off'}`;
    });

    // Handle slider changes
    threshold1Slider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        threshold1Value.textContent = value;
        viewer.setProcessingOptions({ threshold1: parseInt(value) });
    });

    threshold2Slider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        threshold2Value.textContent = value;
        viewer.setProcessingOptions({ threshold2: parseInt(value) });
    });

    blurSizeSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        blurSizeValue.textContent = value;
        viewer.setProcessingOptions({ blurSize: parseInt(value) });
    });

    // Update stats periodically
    function updateStats() {
        const stats = viewer.getStats();
        resolutionElement.textContent = `${stats.width}x${stats.height}`;
        fpsElement.textContent = stats.fps.toString();
        processingTimeElement.textContent = viewer.getProcessingTime().toString();
        requestAnimationFrame(updateStats);
    }

    // Start stats update loop
    updateStats();
});