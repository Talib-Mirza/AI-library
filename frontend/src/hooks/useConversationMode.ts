import { useCallback, useEffect, useRef, useState } from 'react';
import sttService from '../services/STTService';
import { NewTTSClient } from '../services/NewTTSClient';
import { simpleAudioPlayer } from '../services/SimpleAudioPlayer';
import BillingService from '../services/BillingService';
import { toast } from 'react-hot-toast';

interface UseConversationModeOptions {
  onQuery: (text: string) => Promise<string>;
  language?: string;
}

interface UseConversationModeResult {
  isConversationMode: boolean;
  toggleConversationMode: () => void;
  currentTranscript: string;
  isPlayingResponse: boolean;
  // For UI animations
  audioLevel: number; // 0..1
  status: 'idle'|'listening'|'finalizing'|'transcribing'|'thinking'|'speaking';
}

// VAD params for conversation mode
const CALIBRATION_MS = 800;
const MIN_UTTERANCE_MS = 300;
const SILENCE_FINALIZE_MS = 1500;
const MAX_SESSION_MS = 15 * 60 * 1000;
const MIN_THRESHOLD = 0.008;
const MAX_THRESHOLD = 0.06;
const THRESHOLD_MULTIPLIER = 2.0;
const INTERRUPTION_SPEECH_MS = 500;

export function useConversationMode(options: UseConversationModeOptions): UseConversationModeResult {
  const { onQuery, language } = options;

  const [isConversationMode, setIsConversationMode] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0..1
  const [status, setStatus] = useState<'idle'|'listening'|'finalizing'|'transcribing'|'thinking'|'speaking'>('idle');

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const thresholdRef = useRef<number | null>(null);
  const noiseSumRef = useRef<number>(0);
  const noiseCountRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const speechMsRef = useRef<number>(0);
  const speechMsWhilePlayingRef = useRef<number>(0);

  const isProcessingRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  const ttsClientRef = useRef<NewTTSClient | null>(null);

  const resetRefs = () => {
    recordedChunksRef.current = [];
    thresholdRef.current = null;
    noiseSumRef.current = 0;
    noiseCountRef.current = 0;
    silenceStartRef.current = null;
    startTimeRef.current = performance.now();
    lastFrameTimeRef.current = 0;
    speechMsRef.current = 0;
    speechMsWhilePlayingRef.current = 0;
  };

  const cleanup = useCallback(() => {
    console.debug('[Conversation] Cleanup requested');
    setStatus('idle');
    setAudioLevel(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' && mediaRecorderRef.current.stop(); } catch {}
    try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    try { analyserRef.current?.disconnect(); } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    analyserRef.current = null;
    sourceRef.current = null;
    try { audioContextRef.current && audioContextRef.current.state !== 'closed' && audioContextRef.current.close(); } catch {}
    audioContextRef.current = null;
    try { simpleAudioPlayer.stop(); } catch {}
    isPlayingRef.current = false;
    setIsPlayingResponse(false);
    recordedChunksRef.current = [];
  }, []);

  const startRecorder = useCallback(async () => {
    console.debug('[Conversation] Starting recorder');
    setStatus('listening');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true, autoGainControl: true } });
    mediaStreamRef.current = stream;

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128_000 });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) { recordedChunksRef.current.push(e.data); console.debug('[Conversation] Chunk available size=', e.data.size); } };
    mr.onerror = (e: any) => { console.error('[Conversation] MediaRecorder error:', e?.error || e); };

    mr.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: mime });
      recordedChunksRef.current = [];
      console.debug('[Conversation] Recorder stopped; blob bytes=', blob?.size || 0, 'speechMs=', speechMsRef.current);
      if (!blob || blob.size < 1000) return;

      // Skip if no meaningful speech
      if (speechMsRef.current < MIN_UTTERANCE_MS) { console.debug('[Conversation] Skipping: too little speech'); return; }
      if (isProcessingRef.current) { console.debug('[Conversation] Skipping: already processing'); return; }

      try {
        isProcessingRef.current = true;
        setStatus('transcribing');
        console.debug('[Conversation] Sending audio to backend STT');
        const text = await sttService.transcribe(blob, language);
        console.debug('[Conversation] Received STT text:', text);
        const normalized = (text || '').trim();
        if (!normalized || !/[\p{L}\p{N}]/u.test(normalized)) {
          console.debug('[Conversation] No words detected after STT; dropping');
          isProcessingRef.current = false;
          setCurrentTranscript('');
          setStatus('listening');
          return;
        }

        setCurrentTranscript(normalized);

        // Quota check before calling onQuery
        try {
          const plan = await BillingService.getPlan().catch(() => null);
          const remaining = plan?.remaining?.ai_queries;
          if (typeof remaining === 'number' && remaining <= 0) {
            toast.error('AI chat limit reached for your plan. Please upgrade or wait for reset.');
            console.debug('[Conversation] Skipping query due to plan limit');
            isProcessingRef.current = false;
            setStatus('listening');
            return;
          }
        } catch (qe) {
          console.warn('[Conversation] Plan check failed; proceeding cautiously', qe);
        }

        setStatus('thinking');
        console.debug('[Conversation] Sending query to AI');
        const answer = await onQuery(normalized);
        console.debug('[Conversation] Received AI answer (len):', answer?.length || 0);

        // TTS playback
        setIsPlayingResponse(true);
        isPlayingRef.current = true;
        speechMsWhilePlayingRef.current = 0;

        const ttsClient = ttsClientRef.current ?? new NewTTSClient();
        ttsClientRef.current = ttsClient;
        console.debug('[Conversation] Sending answer to TTS');
        const ttsResult = await ttsClient.generateSpeech({ text: answer, voice: undefined as any, languageCode: 'en-US', speed: 1.0, pitch: 0 });
        console.debug('[Conversation] Received TTS audio blob bytes=', ttsResult.audioBlob.size);
        setStatus('speaking');
        await simpleAudioPlayer.play(ttsResult.audioBlob, {
          onStart: () => { console.debug('[Conversation] Audio playback started'); },
          onEnd: () => {
            console.debug('[Conversation] Audio playback ended');
            isPlayingRef.current = false;
            setIsPlayingResponse(false);
            setStatus('listening');
          },
          onError: (err) => {
            console.error('[Conversation] Audio playback error', err);
            isPlayingRef.current = false;
            setIsPlayingResponse(false);
            setStatus('listening');
          },
        });
      } catch (e) {
        console.error('[Conversation] Error in onstop processing:', e);
      } finally {
        isProcessingRef.current = false;
      }
    };

    mr.start(750);
    console.debug('[Conversation] MediaRecorder started');

    // Setup WebAudio graph
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;
    analyserRef.current = analyser;
    source.connect(analyser);

    // Reset VAD state
    resetRefs();
  }, [language, onQuery]);

  const stopRecorder = useCallback(() => {
    console.debug('[Conversation] Stopping recorder');
    try { mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' && mediaRecorderRef.current.stop(); } catch {}
  }, []);

  const runVadLoop = useCallback(() => {
    console.debug('[Conversation] VAD loop started');
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / data.length);
      setAudioLevel(Math.min(1, Math.max(0, rms * 4)));
      const now = performance.now();
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = now;
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      const elapsed = now - startTimeRef.current;

      // Calibration
      if (elapsed < CALIBRATION_MS) {
        noiseSumRef.current += rms;
        noiseCountRef.current += 1;
      } else if (thresholdRef.current == null && noiseCountRef.current > 0) {
        const noiseFloor = noiseSumRef.current / Math.max(1, noiseCountRef.current);
        const thr = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, noiseFloor * THRESHOLD_MULTIPLIER));
        thresholdRef.current = thr;
        console.debug('[Conversation] VAD calibrated noiseFloor=', noiseFloor.toFixed(4), 'thr=', thr.toFixed(4));
      }

      const thr = thresholdRef.current ?? 0.02;
      const isSilent = rms < thr;

      if (!isSilent) {
        // Speaking: reset silence window
        speechMsRef.current += dt;
        silenceStartRef.current = null;

        if (isPlayingRef.current) {
          // Interruption logic: if user speaks > 0.5s, stop current TTS
          speechMsWhilePlayingRef.current += dt;
          if (speechMsWhilePlayingRef.current > INTERRUPTION_SPEECH_MS) {
            console.debug('[Conversation] User speaking during playback; interrupting TTS');
            try { simpleAudioPlayer.stop(); } catch {}
            isPlayingRef.current = false;
            setIsPlayingResponse(false);
            setStatus('listening');
            speechMsWhilePlayingRef.current = 0;
          }
        } else {
          speechMsWhilePlayingRef.current = 0;
        }
      } else {
        // Silent
        if (silenceStartRef.current == null) {
          silenceStartRef.current = now;
        } else if (
          now - silenceStartRef.current > SILENCE_FINALIZE_MS &&
          performance.now() - startTimeRef.current > MIN_UTTERANCE_MS
        ) {
          console.debug('[Conversation] Silence window reached; finalizing utterance');
          setStatus('finalizing');
          // Finalize utterance
          stopRecorder();
          // Restart a new recorder for the next utterance if still in mode
          setTimeout(() => {
            if (isConversationMode) {
              console.debug('[Conversation] Restarting recorder for next utterance');
              recordedChunksRef.current = [];
              try { mediaRecorderRef.current?.start(750); } catch {}
              // Reset VAD counters for the next utterance
              thresholdRef.current = null;
              noiseSumRef.current = 0;
              noiseCountRef.current = 0;
              silenceStartRef.current = null;
              startTimeRef.current = performance.now();
              lastFrameTimeRef.current = 0;
              speechMsRef.current = 0;
              speechMsWhilePlayingRef.current = 0;
            }
          }, 50);
        }
      }

      // Safety: end session
      if (elapsed > MAX_SESSION_MS) {
        console.debug('[Conversation] Max session reached; exiting');
        // Auto-exit conversation mode after max time
        setIsConversationMode(false);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [isConversationMode, stopRecorder]);

  const startConversation = useCallback(async () => {
    if (isConversationMode) return;
    console.debug('[Conversation] Toggle ON');
    setIsConversationMode(true);
    setCurrentTranscript('');
    await startRecorder();
    runVadLoop();
  }, [isConversationMode, runVadLoop, startRecorder]);

  const stopConversation = useCallback(() => {
    console.debug('[Conversation] Toggle OFF');
    setIsConversationMode(false);
    setCurrentTranscript('');
    cleanup();
  }, [cleanup]);

  const toggleConversationMode = useCallback(() => {
    if (isConversationMode) stopConversation(); else startConversation();
  }, [isConversationMode, startConversation, stopConversation]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    isConversationMode,
    toggleConversationMode,
    currentTranscript,
    isPlayingResponse,
    // For UI animations
    audioLevel,
    status,
  };
} 