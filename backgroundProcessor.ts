import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export type BackgroundTarget = 'none' | 'blur' | string; // string can be a URL to an image

export class VirtualBackgroundProcessor {
  private segmentation: SelfieSegmentation;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private target: BackgroundTarget = 'none';
  private customImage: HTMLImageElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;

    this.segmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      },
    });

    this.segmentation.setOptions({
      modelSelection: 1, // 0 for general, 1 for landscape (faster)
      selfieMode: false,
    });

    this.segmentation.onResults(this.onResults.bind(this));
  }

  public setTarget(target: BackgroundTarget) {
    this.target = target;
    if (target !== 'none' && target !== 'blur') {
      this.customImage = new Image();
      this.customImage.src = target;
      this.customImage.crossOrigin = 'anonymous';
    } else {
      this.customImage = null;
    }
  }

  public async processStream(inputStream: MediaStream): Promise<MediaStream> {
    this.stream = inputStream;
    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) return inputStream;

    this.videoElement.srcObject = inputStream;
    await this.videoElement.play();

    this.canvas.width = this.videoElement.videoWidth;
    this.canvas.height = this.videoElement.videoHeight;

    const processFrame = async () => {
      if (this.videoElement.paused || this.videoElement.ended) return;
      await this.segmentation.send({ image: this.videoElement });
      requestAnimationFrame(processFrame);
    };

    processFrame();

    return this.canvas.captureStream(30);
  }

  private onResults(results: any) {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the segmentation mask
    this.ctx.drawImage(results.segmentationMask, 0, 0, this.canvas.width, this.canvas.height);

    // Use the mask to draw the person
    this.ctx.globalCompositeOperation = 'source-in';
    this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

    // Set the background
    this.ctx.globalCompositeOperation = 'destination-over';

    if (this.target === 'blur') {
      this.ctx.filter = 'blur(10px)';
      this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
    } else if (this.customImage && this.customImage.complete) {
      this.ctx.drawImage(this.customImage, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      // Default fallback (can be a solid color or original if no target)
      this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.restore();
  }

  public stop() {
    this.videoElement.pause();
    this.videoElement.srcObject = null;
  }
}
