'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

interface VapiConfig {
  publicKey: string;
  assistantId: string;
  baseUrl?: string;
}

interface TranscriptMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

interface VapiState {
  isSessionActive: boolean;
  isLoading: boolean;
  isSpeaking: boolean;
  error: string | null;
  transcripts: TranscriptMessage[];
  volumeLevel: number;
}

interface FunctionCallData {
  name: string;
  parameters: Record<string, unknown>;
}

export const useVapi = (config: VapiConfig) => {
  const vapiRef = useRef<Vapi | null>(null);
  const [state, setState] = useState<VapiState>({
    isSessionActive: false,
    isLoading: false,
    isSpeaking: false,
    error: null,
    transcripts: [],
    volumeLevel: 0,
  });

  // Callback for when assistant extracts data via function calls
  const [extractedData, setExtractedData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!config.publicKey) return;

    const vapiInstance = new Vapi(config.publicKey);
    vapiRef.current = vapiInstance;

    const handleCallStart = () => {
      setState(prev => ({
        ...prev,
        isSessionActive: true,
        isLoading: false,
        transcripts: [],
        error: null,
      }));
      setExtractedData({});
    };

    const handleCallEnd = () => {
      setState(prev => ({
        ...prev,
        isSessionActive: false,
        isLoading: false,
        isSpeaking: false,
      }));
    };

    const handleSpeechStart = () => {
      setState(prev => ({ ...prev, isSpeaking: true }));
    };

    const handleSpeechEnd = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    };

    const handleMessage = (message: any) => {
      if (message.type === 'transcript') {
        const newTranscript: TranscriptMessage = {
          role: message.role,
          text: message.transcript,
          timestamp: new Date(),
          isFinal: message.transcriptType === 'final',
        };

        setState(prev => {
          // If it's a partial transcript, update the last message of the same role
          if (!newTranscript.isFinal) {
            const lastIndex = prev.transcripts.findLastIndex(
              t => t.role === newTranscript.role && !t.isFinal
            );
            if (lastIndex >= 0) {
              const updated = [...prev.transcripts];
              updated[lastIndex] = newTranscript;
              return { ...prev, transcripts: updated };
            }
          }
          return { ...prev, transcripts: [...prev.transcripts, newTranscript] };
        });
      }

      // Handle function calls from the assistant (for extracting intake data)
      if (message.type === 'function-call') {
        const functionData = message as unknown as { functionCall: FunctionCallData };
        if (functionData.functionCall) {
          setExtractedData(prev => ({
            ...prev,
            [functionData.functionCall.name]: functionData.functionCall.parameters,
          }));
        }
      }

      // Handle call end events from VAPI
      if (message.type === 'end-of-call-report' || message.type === 'hang') {
        console.log('Call ended by assistant or remote party');
      }
    };

    const handleVolumeLevel = (level: number) => {
      setState(prev => ({ ...prev, volumeLevel: level }));
    };

    const handleError = (error: any) => {
      console.error('Vapi error:', error);
      setState(prev => ({
        ...prev,
        error: error?.message || 'An error occurred',
        isLoading: false,
      }));
    };

    vapiInstance.on('call-start', handleCallStart);
    vapiInstance.on('call-end', handleCallEnd);
    vapiInstance.on('speech-start', handleSpeechStart);
    vapiInstance.on('speech-end', handleSpeechEnd);
    vapiInstance.on('message', handleMessage);
    vapiInstance.on('volume-level', handleVolumeLevel);
    vapiInstance.on('error', handleError);

    return () => {
      vapiInstance.off('call-start', handleCallStart);
      vapiInstance.off('call-end', handleCallEnd);
      vapiInstance.off('speech-start', handleSpeechStart);
      vapiInstance.off('speech-end', handleSpeechEnd);
      vapiInstance.off('message', handleMessage);
      vapiInstance.off('volume-level', handleVolumeLevel);
      vapiInstance.off('error', handleError);
    };
  }, [config.publicKey]);

  const startCall = useCallback(async (assistantOverrides?: Record<string, unknown>) => {
    if (!vapiRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await vapiRef.current.start(config.assistantId, assistantOverrides);
    } catch (error: any) {
      console.error('Failed to start Vapi call:', error);
      setState(prev => ({
        ...prev,
        error: error?.message || 'Failed to start call',
        isLoading: false,
      }));
    }
  }, [config.assistantId]);

  const endCall = useCallback(() => {
    if (!vapiRef.current) return;
    vapiRef.current.stop();
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (!vapiRef.current || !state.isSessionActive) return;

    // Add the message to transcripts immediately so it appears in the chat
    const newTranscript: TranscriptMessage = {
      role: 'user',
      text: message,
      timestamp: new Date(),
      isFinal: true,
    };

    setState(prev => ({
      ...prev,
      transcripts: [...prev.transcripts, newTranscript],
    }));

    // Send to VAPI
    vapiRef.current.send({
      type: 'add-message',
      message: {
        role: 'user',
        content: message,
      },
    });
  }, [state.isSessionActive]);

  const clearTranscripts = useCallback(() => {
    setState(prev => ({ ...prev, transcripts: [] }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    startCall,
    endCall,
    sendMessage,
    clearTranscripts,
    clearError,
    extractedData,
    ...state,
  };
};
