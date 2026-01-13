'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, Spinner, CheckCircle, WarningCircle, Globe } from '@phosphor-icons/react';
import { SUPPORTED_LANGUAGES, LanguageCode, ProcessingStatus } from '@/lib/types';
import { DEMO_LIMITS } from '@/lib/demo-limits/config';
import { UsageMeter } from '@/components/demo/UsageMeter';
import { LimitWarning } from '@/components/demo/LimitWarning';
import { processDocument } from '@/lib/document-processor';

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
  uploading: 'Extracting text...',
  ocr_processing: 'Extracting text...',
  cleaning_text: 'Processing document...',
  detecting_language: 'Detecting language...',
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

    // Check token limit
    if (tokensUsed >= DEMO_LIMITS.tokens.perSession) {
      setLimitReached('token');
      return;
    }

    // Validate file type - only PDF and TXT (no images)
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or text file. Image files are not supported in this demo.');
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
      // ========================================
      // STEP 1: Extract text from document (client-side)
      // ========================================
      setStatus('uploading');
      setProgress(10);

      console.log(`[Upload] Processing ${file.name} (${file.type})`);
      const extraction = await processDocument(file);

      if (!extraction.text || extraction.text.trim().length === 0) {
        throw new Error('Could not extract text from this document. Please ensure the PDF contains selectable text (not a scanned image).');
      }

      const extractedText = extraction.text;
      const pageCount = extraction.pageCount;

      console.log(`[Upload] Extracted ${extractedText.length} chars from ${pageCount} pages`);
      setProgress(20);

      // ========================================
      // STEP 2: Detect language
      // ========================================
      setStatus('detecting_language');
      setProgress(25);

      const detectResponse = await fetch('/api/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText }),
      });

      let langCode: LanguageCode = 'en';
      let langName = 'English';

      if (detectResponse.ok) {
        const detectResult = await detectResponse.json();
        langCode = (detectResult.language || 'en') as LanguageCode;
        langName = detectResult.languageName || SUPPORTED_LANGUAGES[langCode]?.name || 'Unknown';
        console.log(`[Upload] Language detected: ${langName} (${langCode})`);
      }

      // Display detected language to user
      setDetectedLanguage(langCode);
      setDetectedLanguageName(langName);
      setProgress(35);

      // ========================================
      // STEP 3: Format the original text
      // ========================================
      setStatus('cleaning_text');
      setProgress(40);

      let formattedOriginal = extractedText;
      try {
        console.log('[Upload] Formatting original text...');
        const formatResponse = await fetch('/api/format-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText }),
        });

        if (formatResponse.ok) {
          const formatResult = await formatResponse.json();
          if (formatResult.formattedText && !formatResult.skipped) {
            formattedOriginal = formatResult.formattedText;
            console.log(`[Upload] Original text formatted: ${formattedOriginal.length} chars`);
          }
        }
      } catch (formatErr) {
        console.warn('[Upload] Failed to format original text:', formatErr);
      }

      setProgress(60);

      // ========================================
      // STEP 4: Translate formatted text to English (if needed)
      // ========================================
      let translatedText = formattedOriginal;

      if (langCode !== 'en') {
        setStatus('translating');
        setProgress(70);

        console.log(`[Upload] Translating from ${langName} to English...`);
        const translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: formattedOriginal,
            sourceLanguage: langCode,
          }),
        });

        if (!translateResponse.ok) {
          const errorData = await translateResponse.json();
          throw new Error(errorData.error || 'Translation failed');
        }

        const translateResult = await translateResponse.json();
        translatedText = translateResult.translatedText;
        console.log(`[Upload] Translation complete: ${translatedText.length} chars`);
      } else {
        console.log('[Upload] Document is in English, no translation needed');
      }

      setProgress(95);

      // ========================================
      // STEP 5: Finalize
      // ========================================
      setStatus('indexing');

      // Complete!
      setStatus('completed');
      setProgress(100);

      onDocumentProcessed({
        id: generateId(),
        filename: file.name,
        originalLanguage: langCode,
        originalText: formattedOriginal,
        translatedText: translatedText,
        pageCount: pageCount,
      });

      // Reset after a moment
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
        setIsProcessing(false);
      }, 2000);

    } catch (err) {
      console.error('[Upload] Error:', err);
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
          accept=".pdf,.txt"
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
                Drag and drop a PDF or text file, or click to browse
              </p>
            )}

            {/* Language Detection Badge - Show throughout processing once detected */}
            {detectedLanguage && isProcessing && status !== 'uploading' && status !== 'ocr_processing' && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                <Globe className="w-4 h-4" weight="bold" />
                {SUPPORTED_LANGUAGES[detectedLanguage]?.flag && (
                  <span>{SUPPORTED_LANGUAGES[detectedLanguage].flag}</span>
                )}
                <span>Detected: {detectedLanguageName || SUPPORTED_LANGUAGES[detectedLanguage]?.name || 'Unknown'}</span>
              </div>
            )}

            {/* Show language on completion too */}
            {detectedLanguage && status === 'completed' && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Globe className="w-4 h-4" weight="bold" />
                {SUPPORTED_LANGUAGES[detectedLanguage]?.flag && (
                  <span>{SUPPORTED_LANGUAGES[detectedLanguage].flag}</span>
                )}
                <span>{detectedLanguageName || SUPPORTED_LANGUAGES[detectedLanguage]?.name || 'Unknown'}</span>
                {detectedLanguage !== 'en' && <span>→ English</span>}
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
          Supports 100+ languages including:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {['es', 'zh', 'ar', 'ru', 'ja', 'hi', 'fr', 'de', 'ko', 'pt'].map((code) => {
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
            +90 more
          </span>
        </div>
      </div>

      {/* File Types */}
      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> PDF
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
