/**
 * Web Audio API Engine for NOVA EDITOR AI Voice & Audio Studio
 * Handles microphone recording, real-time waveform visualization, 5-band EQ,
 * vocal compression, trimming, multi-track mixing, and 16-bit PCM WAV export.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // Playback nodes
  private activeSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private eqNodes: {
    bass: BiquadFilterNode;
    lowMid: BiquadFilterNode;
    mid: BiquadFilterNode;
    highMid: BiquadFilterNode;
    treble: BiquadFilterNode;
  } | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private highpass: BiquadFilterNode | null = null;

  public getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // --- MICROPHONE RECORDING & LIVE WAVEFORM ---

  public async startRecording(onDataAvailable?: (chunk: Blob) => void): Promise<AnalyserNode> {
    const ctx = this.getContext();
    this.recordedChunks = [];

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.sourceNode = ctx.createMediaStreamSource(this.mediaStream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.sourceNode.connect(this.analyser);

    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: mime });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
        onDataAvailable?.(e.data);
      }
    };

    this.mediaRecorder.start(100);
    return this.analyser;
  }

  public pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  public resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        resolve(blob);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });

        // Clean up tracks
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((t) => t.stop());
          this.mediaStream = null;
        }
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }

        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  // --- AUDIO PLAYBACK, EQUALIZER & EFFECTS ---

  public async decodeAudio(data: Blob | ArrayBuffer): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
    return await ctx.decodeAudioData(arrayBuffer);
  }

  public playBuffer(
    buffer: AudioBuffer,
    options: {
      offset?: number;
      duration?: number;
      volume?: number;
      eq?: { bass: number; lowMid: number; mid: number; highMid: number; treble: number };
      noiseGate?: boolean;
      vocalEnhance?: boolean;
      onEnded?: () => void;
    } = {}
  ): { stop: () => void; analyser: AnalyserNode } {
    const ctx = this.getContext();
    this.stopPlayback();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    this.activeSource = source;

    // Analyser for waveform feedback during playback
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;

    // Gain node for volume control
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(options.volume ?? 1, ctx.currentTime);
    this.gainNode = gainNode;

    // 5-Band Equalizer Nodes
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 80;
    bass.gain.value = options.eq?.bass ?? 0;

    const lowMid = ctx.createBiquadFilter();
    lowMid.type = 'peaking';
    lowMid.frequency.value = 250;
    lowMid.Q.value = 1.0;
    lowMid.gain.value = options.eq?.lowMid ?? 0;

    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1.0;
    mid.gain.value = options.eq?.mid ?? 0;

    const highMid = ctx.createBiquadFilter();
    highMid.type = 'peaking';
    highMid.frequency.value = 4000;
    highMid.Q.value = 1.0;
    highMid.gain.value = options.eq?.highMid ?? 0;

    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 12000;
    treble.gain.value = options.eq?.treble ?? 0;

    this.eqNodes = { bass, lowMid, mid, highMid, treble };

    // Highpass filter for noise rumble reduction
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = options.noiseGate ? 120 : 20;
    this.highpass = highpass;

    // Dynamics compressor for vocal presence
    const compressor = ctx.createDynamicsCompressor();
    if (options.vocalEnhance) {
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
    } else {
      compressor.threshold.setValueAtTime(0, ctx.currentTime);
    }
    this.compressor = compressor;

    // Chain: Source -> Highpass -> 5-band EQ -> Compressor -> Gain -> Analyser -> Destination
    source.connect(highpass);
    highpass.connect(bass);
    bass.connect(lowMid);
    lowMid.connect(mid);
    mid.connect(highMid);
    highMid.connect(treble);
    treble.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(ctx.destination);

    const offset = Math.max(0, options.offset || 0);
    const dur = options.duration;

    if (dur !== undefined && dur > 0) {
      source.start(0, offset, dur);
    } else {
      source.start(0, offset);
    }

    source.onended = () => {
      options.onEnded?.();
    };

    return {
      stop: () => this.stopPlayback(),
      analyser,
    };
  }

  public updateVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  public updateEq(band: 'bass' | 'lowMid' | 'mid' | 'highMid' | 'treble', gainDb: number) {
    if (this.eqNodes && this.ctx) {
      this.eqNodes[band].gain.setValueAtTime(gainDb, this.ctx.currentTime);
    }
  }

  public stopPlayback() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // already stopped
      }
      this.activeSource = null;
    }
  }

  // --- AUDIO PROCESSING & WAV EXPORT GENERATOR ---

  /**
   * Encodes AudioBuffer into an industry-standard 16-bit PCM RIFF WAV Blob.
   * Runs natively in any browser with zero dependencies.
   */
  public audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // 1 = PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const length = buffer.length * blockAlign;
    const bufferArray = new ArrayBuffer(44 + length);
    const view = new DataView(bufferArray);

    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    // RIFF identifier
    writeString(0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + length, true);
    // RIFF type
    writeString(8, 'WAVE');
    // format chunk identifier
    writeString(12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw PCM)
    view.setUint16(20, format, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * blockAlign, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, bitDepth, true);
    // data chunk identifier
    writeString(36, 'data');
    // data chunk length
    view.setUint32(40, length, true);

    // Interleave channels & write samples
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * Trims AudioBuffer from start to end (seconds)
   */
  public trimAudioBuffer(
    buffer: AudioBuffer,
    startTime: number,
    endTime: number
  ): AudioBuffer {
    const ctx = this.getContext();
    const start = Math.max(0, Math.min(buffer.duration, startTime));
    const end = Math.max(start, Math.min(buffer.duration, endTime));
    const sampleRate = buffer.sampleRate;
    const startOffset = Math.floor(start * sampleRate);
    const endOffset = Math.floor(end * sampleRate);
    const frameCount = endOffset - startOffset;

    const trimmedBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      Math.max(1, frameCount),
      sampleRate
    );

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const channelData = buffer.getChannelData(ch);
      const trimmedData = trimmedBuffer.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) {
        trimmedData[i] = channelData[startOffset + i];
      }
    }

    return trimmedBuffer;
  }

  /**
   * Generates a sample high-fidelity cinematic audio loop so users can immediately test
   */
  public generateSampleBeat(): AudioBuffer {
    const ctx = this.getContext();
    const duration = 8.0; // 8 seconds loop
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = 110;
    const beatInterval = 60 / bpm;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let val = 0;

      // Kick drum every beat
      const kickTime = t % beatInterval;
      if (kickTime < 0.25) {
        const kickFreq = 140 * Math.exp(-kickTime * 22);
        val += Math.sin(2 * Math.PI * kickFreq * kickTime) * Math.exp(-kickTime * 14) * 0.7;
      }

      // Snare on 2nd and 4th beat
      const snareBeat = (t / beatInterval) % 2;
      if (snareBeat > 0.95 && snareBeat < 1.3) {
        const sTime = (t - Math.floor(t / beatInterval) * beatInterval);
        const noise = (Math.random() * 2 - 1) * Math.exp(-sTime * 18) * 0.4;
        val += noise;
      }

      // Hi-hat on 8th notes
      const hihatTime = t % (beatInterval / 2);
      if (hihatTime < 0.05) {
        val += (Math.random() * 2 - 1) * Math.exp(-hihatTime * 60) * 0.15;
      }

      // Ambient synth chord (Am - F - C - G)
      const chordIndex = Math.floor((t / (beatInterval * 2)) % 4);
      const chordFreqs = [
        [220, 261.63, 329.63], // Am
        [174.61, 220, 261.63], // F
        [130.81, 164.81, 196], // C
        [196, 246.94, 293.66], // G
      ][chordIndex];

      let synth = 0;
      for (const f of chordFreqs) {
        synth += Math.sin(2 * Math.PI * f * t) * 0.08;
      }
      val += synth;

      left[i] = Math.max(-1, Math.min(1, val));
      right[i] = Math.max(-1, Math.min(1, val * 0.95 + synth * 0.05));
    }

    return buffer;
  }
}

export const audioEngine = new AudioEngine();
