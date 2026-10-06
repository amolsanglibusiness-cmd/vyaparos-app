declare module '@capacitor-community/speech-recognition' {
  export const SpeechRecognition: {
    available(): Promise<{ available: boolean }>;
    checkPermissions(): Promise<{ speechRecognition: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' }>;
    requestPermissions(): Promise<{ speechRecognition: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' }>;
    start(options: { language: string; maxResults?: number; partialResults?: boolean; popup?: boolean }): Promise<void>;
    stop(): Promise<void>;
    addListener(event: 'partialResults', listener: (data: { matches: string[] }) => void): Promise<{ remove(): Promise<void> }>;
    addListener(event: 'listeningState', listener: (data: { status: 'started' | 'stopped' }) => void): Promise<{ remove(): Promise<void> }>;
  };
}
