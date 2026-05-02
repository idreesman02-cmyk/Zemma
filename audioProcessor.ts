export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private highPass: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;
  private isEnabled = false;

  async processStream(stream: MediaStream): Promise<MediaStream> {
    if (!stream.getAudioTracks().length) return stream;

    // Initialize context if needed
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Cleanup old nodes if they exist
    this.cleanup();

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.destination = this.audioContext.createMediaStreamDestination();

    // 1. High Pass Filter (Cut frequencies below 80Hz - removes hum/rumble)
    this.highPass = this.audioContext.createBiquadFilter();
    this.highPass.type = 'highpass';
    this.highPass.frequency.value = 80;

    // 2. Dynamics Compressor (Normalizes speech and reduces background noise floor)
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // 3. Gain Node for fine tuning
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    // Connect the chain
    if (this.isEnabled) {
      this.source.connect(this.highPass);
      this.highPass.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.destination);
    } else {
      this.source.connect(this.destination);
    }

    return this.destination.stream;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!this.source || !this.destination || !this.highPass || !this.compressor || !this.gainNode) return;

    // Re-route nodes based on state
    this.source.disconnect();
    this.highPass.disconnect();
    this.compressor.disconnect();
    this.gainNode.disconnect();

    if (enabled) {
      this.source.connect(this.highPass);
      this.highPass.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.destination);
    } else {
      this.source.connect(this.destination);
    }
  }

  private cleanup() {
    if (this.source) this.source.disconnect();
    if (this.highPass) this.highPass.disconnect();
    if (this.compressor) this.compressor.disconnect();
    if (this.gainNode) this.gainNode.disconnect();
  }

  async stop() {
    this.cleanup();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
