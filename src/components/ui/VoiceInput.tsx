/**
 * VoiceInput Component
 * 
 * Uses the Web Speech API (completely free, built into browsers) for voice-to-text
 * Supports multiple languages and continuous/interim results
 */

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Volume2 } from 'lucide-react';
import { Button } from './Button';
import toast from 'react-hot-toast';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  language?: string;
  continuous?: boolean;
  className?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
}

// Check if browser supports Web Speech API
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export function VoiceInput({
  onTranscript,
  onInterimTranscript,
  language = 'en-US',
  continuous = false,
  className = '',
  buttonSize = 'md',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    if (!isSpeechRecognitionSupported()) {
      setIsSupported(false);
      return;
    }

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Voice input started', { duration: 2000 });
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimText('');

      if (event.error === 'no-speech') {
        toast.error('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error('Voice input error. Please try again.');
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update interim text for UI display
      if (interimTranscript) {
        setInterimText(interimTranscript);
        onInterimTranscript?.(interimTranscript);
      }

      // Send final transcript
      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
        setInterimText('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, continuous, onTranscript, onInterimTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast.error('Failed to start voice input');
      }
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 text-sm ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Voice input not supported in this browser</span>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        onClick={toggleListening}
        variant={isListening ? 'danger' : 'secondary'}
        className={`${sizeClasses[buttonSize]} relative`}
        title={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        {isListening ? (
          <>
            <MicOff className={iconSizes[buttonSize]} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </>
        ) : (
          <Mic className={iconSizes[buttonSize]} />
        )}
      </Button>

      {/* Interim text display */}
      {interimText && (
        <div className="absolute left-0 right-0 top-full mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Volume2 className="w-4 h-4 text-blue-500" />
            <span className="italic">"{interimText}"</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Supported languages for voice input
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'ur-PK', name: 'Urdu' },
  { code: 'tr-TR', name: 'Turkish' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'sv-SE', name: 'Swedish' },
];

/**
 * Hook for voice input with custom logic
 */
export function useVoiceInput(config?: {
  language?: string;
  continuous?: boolean;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = config?.continuous ?? false;
    recognition.interimResults = true;
    recognition.lang = config?.language ?? 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (finalTranscript) {
        const newTranscript = finalTranscript.trim();
        setTranscript(newTranscript);
        config?.onTranscript?.(newTranscript);
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      config?.onError?.(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [config]);

  const start = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const reset = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSpeechRecognitionSupported(),
    start,
    stop,
    reset,
  };
}

