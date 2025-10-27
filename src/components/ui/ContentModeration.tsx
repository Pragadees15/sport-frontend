/**
 * ContentModeration Component
 * 
 * Shows content moderation indicators and provides translation options
 * Uses AI-powered features from the backend
 */

import { useState } from 'react';
import { Shield, AlertTriangle, Globe, Loader2, CheckCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import { Button } from './Button';
import toast from 'react-hot-toast';

interface ContentModerationProps {
  content: string;
  showTranslation?: boolean;
  autoModerate?: boolean;
  className?: string;
}

export function ContentModeration({
  content,
  showTranslation = true,
  autoModerate = false,
  className = '',
}: ContentModerationProps) {
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslationOptions, setShowTranslationOptions] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');

  const moderateContent = async () => {
    try {
      const result = await apiService.moderateContent(content);
      setModerationResult(result.moderation);
    } catch (error) {
      console.error('Moderation error:', error);
    }
  };

  const translateContent = async () => {
    setIsTranslating(true);
    try {
      // Detect language first
      const detection = await apiService.detectLanguage(content);
      setDetectedLanguage(detection.detection.languageName);

      // Translate if not already in target language
      if (detection.detection.language !== targetLanguage) {
        const translation = await apiService.translateText(
          content,
          targetLanguage,
          detection.detection.language
        );
        
        if (translation.translation) {
          setTranslatedText(translation.translation.translatedText);
        } else {
          toast.error('Translation not available');
        }
      } else {
        toast.info('Content is already in the target language');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-moderate on mount if enabled
  useState(() => {
    if (autoModerate && content) {
      moderateContent();
    }
  });

  const getSafetyColor = () => {
    if (!moderationResult) return 'text-gray-400';
    if (moderationResult.isAbusive) return 'text-red-500';
    if (!moderationResult.isSafe) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSafetyIcon = () => {
    if (!moderationResult) return Shield;
    if (moderationResult.isAbusive) return AlertTriangle;
    if (!moderationResult.isSafe) return AlertTriangle;
    return CheckCircle;
  };

  const SafetyIcon = getSafetyIcon();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Moderation Indicator */}
      {moderationResult && (
        <div className={`flex items-center gap-1 ${getSafetyColor()}`}>
          <SafetyIcon className="w-4 h-4" />
          {moderationResult.isAbusive && (
            <span className="text-xs font-medium">Content Flagged</span>
          )}
          {!moderationResult.isSafe && !moderationResult.isAbusive && (
            <span className="text-xs font-medium">Potentially Inappropriate</span>
          )}
          {moderationResult.isSafe && (
            <span className="text-xs font-medium">Safe</span>
          )}
        </div>
      )}

      {/* Translation Options */}
      {showTranslation && (
        <div className="relative">
          <button
            onClick={() => setShowTranslationOptions(!showTranslationOptions)}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
            title="Translate content"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs">Translate</span>
          </button>

          {showTranslationOptions && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-[200px]">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  Translate to:
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                  <option value="hi">Hindi</option>
                </select>
                <Button
                  onClick={translateContent}
                  disabled={isTranslating}
                  size="sm"
                  className="w-full"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    'Translate'
                  )}
                </Button>
              </div>

              {detectedLanguage && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Detected: {detectedLanguage}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Translated Text Display */}
      {translatedText && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-900 mb-1">
                Translation:
              </p>
              <p className="text-sm text-gray-700">{translatedText}</p>
            </div>
            <button
              onClick={() => setTranslatedText('')}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline Moderation Badge
 * Shows a small badge indicator for content safety
 */
interface ModerationBadgeProps {
  isSafe: boolean;
  isAbusive: boolean;
  toxicityScore: number;
  className?: string;
}

export function ModerationBadge({
  isSafe,
  isAbusive,
  toxicityScore,
  className = '',
}: ModerationBadgeProps) {
  if (isSafe) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs ${className}`}>
        <CheckCircle className="w-3 h-3" />
        <span>Verified Safe</span>
      </div>
    );
  }

  if (isAbusive) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs ${className}`}>
        <AlertTriangle className="w-3 h-3" />
        <span>Flagged</span>
      </div>
    );
  }

  if (toxicityScore > 0.6) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs ${className}`}>
        <AlertTriangle className="w-3 h-3" />
        <span>Review Needed</span>
      </div>
    );
  }

  return null;
}

/**
 * Translation Button
 * Simple button to translate content
 */
interface TranslationButtonProps {
  content: string;
  onTranslate: (translatedText: string) => void;
  className?: string;
}

export function TranslationButton({
  content,
  onTranslate,
  className = '',
}: TranslationButtonProps) {
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const detection = await apiService.detectLanguage(content);
      
      if (detection.detection.language !== 'en') {
        const translation = await apiService.translateText(content, 'en');
        if (translation.translation) {
          onTranslate(translation.translation.translatedText);
        }
      } else {
        toast.info('Content is already in English');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <button
      onClick={handleTranslate}
      disabled={isTranslating}
      className={`inline-flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors text-xs ${className}`}
    >
      {isTranslating ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Translating...</span>
        </>
      ) : (
        <>
          <Globe className="w-3 h-3" />
          <span>Translate</span>
        </>
      )}
    </button>
  );
}

