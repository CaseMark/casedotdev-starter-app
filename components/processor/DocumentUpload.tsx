'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, Spinner, CheckCircle, WarningCircle, Globe } from '@phosphor-icons/react';
import { SUPPORTED_LANGUAGES, LanguageCode, ProcessingStatus } from '@/lib/types';
import { DEMO_LIMITS } from '@/lib/demo-limits/config';
import { UsageMeter } from '@/components/demo/UsageMeter';
import { LimitWarning } from '@/components/demo/LimitWarning';

interface DocumentUploadProps {
  onDocumentProcessed: (document: {
    id: string;
    filename: string;
    originalLanguage: LanguageCode;
    originalText: string;
    translatedText: string;
    pageCount: number;
  }) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  documentsUsed: number;
  tokensUsed: number;
}

const STATUS_MESSAGES: Record<ProcessingStatus, string> = {
  idle: 'Ready to upload',
  uploading: 'Uploading document...',
  detecting_language: 'Detecting language...',
  ocr_processing: 'Extracting text with OCR...',
  cleaning_text: 'Cleaning up text formatting...',
  translating: 'Translating to English...',
  indexing: 'Finalizing...',
  completed: 'Processing complete!',
  error: 'An error occurred',
};

export default function DocumentUpload({
  onDocumentProcessed,
  isProcessing,
  setIsProcessing,
  documentsUsed,
  tokensUsed,
}: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null);
  const [detectedLanguageName, setDetectedLanguageName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<'document' | 'token' | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file) return;

    // Check document limit
    if (documentsUsed >= DEMO_LIMITS.ocr.maxDocumentsPerSession) {
      setLimitReached('document');
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, image file (JPEG, PNG, TIFF), or text file');
      return;
    }

    // Validate file size
    if (file.size > DEMO_LIMITS.ocr.maxFileSize) {
      setError(`File too large. Maximum size is ${DEMO_LIMITS.ocr.maxFileSize / 1024 / 1024}MB`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLimitReached(null);
    setDetectedLanguage(null);
    setDetectedLanguageName(null);

    try {
      // Step 1: Upload
      setStatus('uploading');
      setProgress(10);

      const formData = new FormData();
      formData.append('file', file);

      // Step 2: Quick language detection
      setStatus('detecting_language');
      setProgress(15);

      const langResponse = await fetch('/api/detect-language', {
        method: 'POST',
        body: formData,
      });

      if (langResponse.ok) {
        const langResult = await langResponse.json();
        const detectedLang = (langResult.language || 'en') as LanguageCode;
        const langName = langResult.languageName || SUPPORTED_LANGUAGES[detectedLang]?.name || 'Unknown';
        setDetectedLanguage(detectedLang);
        setDetectedLanguageName(langName);
      }
      setProgress(25);

      // Step 3: Full processing
      const processFormData = new FormData();
      processFormData.append('file', file);

      setStatus('ocr_processing');
      setProgress(30);

      // Progress simulation
      let currentProgress = 30;
      let currentPhase = 0;
      const phases = [
        { status: 'ocr_processing' as ProcessingStatus, targetProgress: 50, duration: 15000 },
        { status: 'cleaning_text' as ProcessingStatus, targetProgress: 65, duration: 10000 },
        { status: 'translating' as ProcessingStatus, targetProgress: 85, duration: 15000 },
      ];

      const progressInterval = setInterval(() => {
        if (currentPhase < phases.length) {
          const phase = phases[currentPhase];
          if (currentProgress < phase.targetProgress) {
            currentProgress += 1;
            setProgress(currentProgress);
          } else {
            currentPhase++;
            if (currentPhase < phases.length) {
              setStatus(phases[currentPhase].status);
            }
          }
        }
      }, 500);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: processFormData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.limitReached) {
          setLimitReached('token');
          setIsProcessing(false);
          return;
        }
        throw new Error(errorData.error || 'Processing failed');
      }

      const result = await response.json();

      const finalLang = (result.detectedLanguage || 'en') as LanguageCode;
      const finalLangName = result.detectedLanguageName || SUPPORTED_LANGUAGES[finalLang]?.name || 'Unknown';
      setDetectedLanguage(finalLang);
      setDetectedLanguageName(finalLangName);
      setProgress(90);

      // Finalize
      setStatus('indexing');
      setProgress(95);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Complete
      setStatus('completed');
      setProgress(100);

      onDocumentProcessed({
        id: generateId(),
        filename: file.name,
        originalLanguage: finalLang,
        originalText: result.originalText,
        translatedText: result.translatedText,
        pageCount: result.pageCount || 1,
      });

      // Reset after a moment
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
        setIsProcessing(false);
      }, 2000);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Processing failed');
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentsUsed]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  if (limitReached) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <LimitWarning type={limitReached} />
        <button
          onClick={() => setLimitReached(null)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Try a different file
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Usage Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <UsageMeter
          label="Documents"
          used={documentsUsed}
          limit={DEMO_LIMITS.ocr.maxDocumentsPerSession}
        />
        <UsageMeter
          label="Tokens Used"
          used={tokensUsed}
          limit={DEMO_LIMITS.tokens.perSession}
        />
      </div>

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
          ${dragActive
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
          ${isProcessing ? 'pointer-events-none opacity-75' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.txt"
          onChange={handleFileInput}
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Icon */}
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${status === 'completed' ? 'bg-green-100' :
              status === 'error' ? 'bg-red-100' :
              isProcessing ? 'bg-orange-100' : 'bg-gray-100'}
          `}>
            {status === 'completed' ? (
              <CheckCircle className="w-8 h-8 text-green-600" weight="fill" />
            ) : status === 'error' ? (
              <WarningCircle className="w-8 h-8 text-red-600" weight="fill" />
            ) : isProcessing ? (
              <Spinner className="w-8 h-8 text-orange-600 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {/* Status Text */}
          <div className="text-center">
            <p className={`text-lg font-medium ${
              status === 'completed' ? 'text-green-600' :
              status === 'error' ? 'text-red-600' :
              isProcessing ? 'text-orange-600' : 'text-gray-700'
            }`}>
              {STATUS_MESSAGES[status]}
            </p>

            {!isProcessing && status === 'idle' && (
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop a document, or click to browse
              </p>
            )}

            {/* Language Detection Badge */}
            {detectedLanguage && status !== 'idle' && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                <Globe className="w-4 h-4" weight="bold" />
                {SUPPORTED_LANGUAGES[detectedLanguage]?.flag && (
                  <span>{SUPPORTED_LANGUAGES[detectedLanguage].flag}</span>
                )}
                <span>{detectedLanguageName || SUPPORTED_LANGUAGES[detectedLanguage]?.name || 'Unknown'} detected</span>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="w-full max-w-xs">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-1">{progress}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Supported Languages */}
      <div className="mt-6">
        <p className="text-sm text-gray-500 text-center mb-3">
          Supports Latin alphabet languages including:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {['es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'sv'].map((code) => {
            const lang = SUPPORTED_LANGUAGES[code as LanguageCode];
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
            );
          })}
          <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
            +16 more
          </span>
        </div>
      </div>

      {/* File Types */}
      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> PDF
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> JPEG
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> PNG
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> TXT
        </span>
      </div>
    </div>
  );
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
