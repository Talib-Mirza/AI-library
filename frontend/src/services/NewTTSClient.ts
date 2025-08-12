// NEW TTS CLIENT - SIMPLE BACKEND COMMUNICATION

import api from '../utils/axiosConfig';

export class QuotaError extends Error { constructor(message: string){ super(message); this.name='QuotaError'; } }

export interface TTSRequest {
  text: string;
  voice: string;
  languageCode: string;
  speed: number;
  pitch: number;
}

export interface TTSResult {
  audioBlob: Blob;
  text: string;
  duration: number;
}

export interface VoiceInfo {
  name: string;
  gender: string;
  description: string;
}

export class NewTTSClient {
  private readonly baseURL = '/tts';

  /**
   * Generate single TTS audio
   */
  async generateSpeech(request: TTSRequest): Promise<TTSResult> {
    try {
      console.log(`🔊 TTSClient: Starting generateSpeech...`);
      console.log(`🔊 TTSClient: Request details:`, {
        textLength: request.text.length,
        text: request.text.substring(0, 100) + (request.text.length > 100 ? '...' : ''),
        voice: request.voice,
        languageCode: request.languageCode,
        speed: request.speed,
        pitch: request.pitch
      });
      
      const requestPayload = {
        text: request.text,
        voice: request.voice,
        language_code: request.languageCode,
        speed: request.speed,
        pitch: request.pitch
      };
      
      console.log(`🔊 TTSClient: Sending request to ${this.baseURL}/synthesize...`);
      const response = await api.post(`${this.baseURL}/synthesize`, requestPayload);
      
      console.log(`✅ TTSClient: Got response from backend:`, {
        status: response.status,
        statusText: response.statusText,
        hasAudioUrl: !!response.data.audio_url,
        audioUrlStart: response.data.audio_url?.substring(0, 30),
        duration: response.data.duration,
        text: response.data.text
      });

      // Convert data URL to blob
      console.log(`🔊 TTSClient: Converting data URL to blob...`);
      const audioBlob = await this.dataURLToBlob(response.data.audio_url);
      
      console.log(`✅ TTSClient: Audio blob created:`, {
        size: audioBlob.size,
        type: audioBlob.type,
        isValidBlob: audioBlob instanceof Blob,
        sizeKB: Math.round(audioBlob.size / 1024)
      });
      
      if (audioBlob.size === 0) {
        throw new Error('Generated audio blob is empty');
      }
      
      // Validate audio blob type
      if (!audioBlob.type || !audioBlob.type.startsWith('audio/')) {
        console.warn(`⚠️ TTSClient: Audio blob has unexpected MIME type: ${audioBlob.type}`);
        // Don't throw error, but log warning - some valid audio might have empty MIME type
      }
      
      // Additional validation - try to create a URL to ensure blob is valid
      try {
        const testUrl = URL.createObjectURL(audioBlob);
        URL.revokeObjectURL(testUrl);
        console.log(`✅ TTSClient: Audio blob URL validation passed`);
      } catch (blobError) {
        throw new Error(`Audio blob is corrupted and cannot create URL: ${blobError}`);
      }
      
      const result = {
        audioBlob,
        text: response.data.text,
        duration: response.data.duration
      };
      
      console.log(`✅ TTSClient: Returning TTS result:`, {
        blobSize: result.audioBlob.size,
        duration: result.duration,
        textLength: result.text.length
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTSClient: Generation failed:', error);
      console.error('❌ TTSClient: Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack
      });
      const status = error.response?.status;
      if (status === 402) {
        const detail = error.response?.data?.detail || 'TTS limit reached.';
        throw new QuotaError(detail);
      }
      throw new Error(
        error.response?.data?.detail || 
        `Failed to generate speech: ${error.message}`
      );
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<{ voices: VoiceInfo[]; provider: string }> {
    try {
      const response = await api.get(`${this.baseURL}/voices`);
      return response.data;
    } catch (error: any) {
      console.error('❌ TTSClient: Failed to get voices:', error);
      throw new Error(
        error.response?.data?.detail || 
        'Failed to get available voices'
      );
    }
  }

  /**
   * Test TTS service connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testResult = await this.generateSpeech({
        text: 'Test',
        voice: 'en-US-Standard-A',
        languageCode: 'en-US',
        speed: 1.0,
        pitch: 0.0
      });
      return testResult.audioBlob.size > 0;
    } catch (error) {
      console.error('❌ TTSClient: Connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert data URL to Blob
   */
  private async dataURLToBlob(dataURL: string): Promise<Blob> {
    const response = await fetch(dataURL);
    if (!response.ok) {
      throw new Error(`Failed to convert data URL to blob: ${response.statusText}`);
    }
    return response.blob();
  }

  /**
   * Estimate duration based on text length (fallback)
   */
  estimateDuration(text: string): number {
    // Average speaking rate: 150 words per minute
    const wordsPerMinute = 150;
    const wordCount = text.split(' ').length;
    return Math.max(1, (wordCount / wordsPerMinute) * 60);
  }

  /**
   * Switch TTS provider (Only Google TTS supported)
   */
  async switchProvider(provider: 'google'): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 TTSClient: Google TTS is the only supported provider`);
      
      return {
        success: true,
        message: 'Google TTS provider active'
      };
    } catch (error) {
      console.error('❌ TTSClient: Error with provider:', error);
      return {
        success: false,
        message: `Provider error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const newTTSClient = new NewTTSClient(); 