// SIMPLE AUDIO CACHE - CLEANER IMPLEMENTATION

import type { TTSRequest, TTSResult } from './NewTTSClient';

export interface CacheKey {
  text: string;
  voice: string;
  languageCode: string;
  speed: number;
  pitch: number;
}

export interface CacheEntry {
  audioData: string; // base64
  text: string;
  duration: number;
  timestamp: number;
  size: number;
}

export interface CacheStats {
  entries: number;
  totalSizeMB: number;
  hitRate: number;
}

export class SimpleAudioCache {
  private readonly PREFIX = 'tts_cache_v2_';
  private readonly MAX_ENTRIES = 100;
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  private hits = 0;
  private misses = 0;

  /**
   * Generate cache key from TTS request
   */
  private getCacheKey(request: CacheKey): string {
    const keyData = {
      text: request.text.trim().toLowerCase(),
      voice: request.voice,
      languageCode: request.languageCode,
      speed: Math.round(request.speed * 100),
      pitch: Math.round(request.pitch * 100)
    };
    
    const keyString = JSON.stringify(keyData);
    return this.PREFIX + this.simpleHash(keyString);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 to blob
   */
  private base64ToBlob(base64: string): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    return new Blob([new Uint8Array(byteNumbers)], { type: 'audio/mpeg' });
  }

  /**
   * Check if audio is cached
   */
  async has(request: CacheKey): Promise<boolean> {
    const key = this.getCacheKey(request);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      return false;
    }

    try {
      const entry: CacheEntry = JSON.parse(cached);
      const isExpired = Date.now() - entry.timestamp > this.MAX_AGE_MS;
      
      if (isExpired) {
        localStorage.removeItem(key);
        return false;
      }
      
      return true;
    } catch (error) {
      localStorage.removeItem(key);
      return false;
    }
  }

  /**
   * Get cached audio
   */
  async get(request: CacheKey): Promise<TTSResult | null> {
    const key = this.getCacheKey(request);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      this.misses++;
      return null;
    }

    try {
      const entry: CacheEntry = JSON.parse(cached);
      const isExpired = Date.now() - entry.timestamp > this.MAX_AGE_MS;
      
      if (isExpired) {
        localStorage.removeItem(key);
        this.misses++;
        return null;
      }
      
      const audioBlob = this.base64ToBlob(entry.audioData);
      this.hits++;
      
      console.log(`💾 AudioCache: Cache HIT for "${request.text.substring(0, 30)}..."`);
      
      return {
        audioBlob,
        text: entry.text,
        duration: entry.duration
      };
    } catch (error) {
      console.error('❌ AudioCache: Failed to retrieve cached audio:', error);
      localStorage.removeItem(key);
      this.misses++;
      return null;
    }
  }

  /**
   * Cache audio result
   */
  async set(request: CacheKey, result: TTSResult): Promise<void> {
    try {
      // Clean up old entries before adding new one
      await this.cleanup();
      
      const key = this.getCacheKey(request);
      const audioData = await this.blobToBase64(result.audioBlob);
      
      const entry: CacheEntry = {
        audioData,
        text: result.text,
        duration: result.duration,
        timestamp: Date.now(),
        size: result.audioBlob.size
      };
      
      localStorage.setItem(key, JSON.stringify(entry));
      console.log(`💾 AudioCache: Cached "${request.text.substring(0, 30)}..." (${result.audioBlob.size} bytes)`);
    } catch (error) {
      console.warn('⚠️ AudioCache: Failed to cache audio (storage may be full):', error);
      // Try cleanup and retry once
      await this.cleanup();
      try {
        const key = this.getCacheKey(request);
        const audioData = await this.blobToBase64(result.audioBlob);
        
        const entry: CacheEntry = {
          audioData,
          text: result.text,
          duration: result.duration,
          timestamp: Date.now(),
          size: result.audioBlob.size
        };
        
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (retryError) {
        console.warn('⚠️ AudioCache: Failed to cache audio after cleanup');
      }
    }
  }

  /**
   * Clean up old and excess entries
   */
  async cleanup(): Promise<void> {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(this.PREFIX));
    const now = Date.now();
    
    // Remove expired entries
    const expiredKeys = cacheKeys.filter(key => {
      try {
        const entry: CacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
        return now - entry.timestamp > this.MAX_AGE_MS;
      } catch {
        return true; // Remove malformed entries
      }
    });
    
    expiredKeys.forEach(key => localStorage.removeItem(key));
    
    // If still too many entries, remove oldest
    const remainingKeys = cacheKeys.filter(key => !expiredKeys.includes(key));
    if (remainingKeys.length > this.MAX_ENTRIES) {
      const keysWithTimestamp = remainingKeys.map(key => {
        try {
          const entry: CacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: entry.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      });
      
      keysWithTimestamp.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = keysWithTimestamp.slice(0, keysWithTimestamp.length - this.MAX_ENTRIES);
      toRemove.forEach(item => localStorage.removeItem(item.key));
      
      console.log(`🧹 AudioCache: Cleaned up ${expiredKeys.length + toRemove.length} old entries`);
    }
  }

  /**
   * Clear all cached audio
   */
  async clear(): Promise<void> {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(this.PREFIX));
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    this.hits = 0;
    this.misses = 0;
    
    console.log(`🧹 AudioCache: Cleared ${cacheKeys.length} cached entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(this.PREFIX));
    
    let totalSize = 0;
    cacheKeys.forEach(key => {
      try {
        const entry: CacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
        totalSize += entry.size || 0;
      } catch {
        // Skip malformed entries
      }
    });
    
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    
    return {
      entries: cacheKeys.length,
      totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
}

// Export singleton instance
export const simpleAudioCache = new SimpleAudioCache(); 