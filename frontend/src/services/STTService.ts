import api from '../utils/axiosConfig';

class STTService {
  async transcribe(audioBlob: Blob, language?: string): Promise<string> {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.webm');
    if (language) form.append('language', language);

    const response = await api.post('stt/', form);
    const text: string = response?.data?.text || '';
    if (!text) throw new Error('Empty transcription result');
    return text;
  }
}

const sttService = new STTService();
export default sttService; 