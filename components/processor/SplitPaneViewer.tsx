'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Translate,
  ArrowsOutSimple,
  ArrowsInSimple,
  Copy,
  Check,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/types';

interface SplitPaneViewerProps {
  originalText: string;
  translatedText: string;
  originalLanguage: LanguageCode;
  filename: string;
  searchQuery?: string;
  highlightedChunks?: {
    original: string[];
    translated: string[];
  };
}

export default function SplitPaneViewer({
  originalText,
  translatedText,
  originalLanguage,
  filename,
  searchQuery,
  highlightedChunks,
}: SplitPaneViewerProps) {
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedSide, setCopiedSide] = useState<'original' | 'translated' | null>(null);
  const [syncScroll, setSyncScroll] = useState(true);
  const [expandedSide, setExpandedSide] = useState<'original' | 'translated' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<HTMLDivElement>(null);
  const translatedRef = useRef<HTMLDivElement>(null);

  const languageInfo = SUPPORTED_LANGUAGES[originalLanguage];

  // Handle synchronized scrolling
  useEffect(() => {
    if (!syncScroll) return;

    const originalEl = originalRef.current;
    const translatedEl = translatedRef.current;

    if (!originalEl || !translatedEl) return;

    let scrollingPane: 'original' | 'translated' | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleOriginalScroll = () => {
      if (scrollingPane === 'translated') return;

      scrollingPane = 'original';

      const maxScroll = originalEl.scrollHeight - originalEl.clientHeight;
      if (maxScroll <= 0) return;

      const scrollRatio = originalEl.scrollTop / maxScroll;
      const targetScroll = scrollRatio * (translatedEl.scrollHeight - translatedEl.clientHeight);
      translatedEl.scrollTop = targetScroll;

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => { scrollingPane = null; }, 50);
    };

    const handleTranslatedScroll = () => {
      if (scrollingPane === 'original') return;

      scrollingPane = 'translated';

      const maxScroll = translatedEl.scrollHeight - translatedEl.clientHeight;
      if (maxScroll <= 0) return;

      const scrollRatio = translatedEl.scrollTop / maxScroll;
      const targetScroll = scrollRatio * (originalEl.scrollHeight - originalEl.clientHeight);
      originalEl.scrollTop = targetScroll;

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => { scrollingPane = null; }, 50);
    };

    originalEl.addEventListener('scroll', handleOriginalScroll);
    translatedEl.addEventListener('scroll', handleTranslatedScroll);

    return () => {
      originalEl.removeEventListener('scroll', handleOriginalScroll);
      translatedEl.removeEventListener('scroll', handleTranslatedScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [syncScroll]);

  // Handle drag to resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.min(Math.max(newPosition, 20), 80));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Copy text to clipboard
  const copyToClipboard = async (text: string, side: 'original' | 'translated') => {
    await navigator.clipboard.writeText(text);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
  };

  // Highlight search matches in text
  const highlightText = (text: string, query?: string, chunks?: string[]) => {
    if (!query && (!chunks || chunks.length === 0)) {
      return text.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ));
    }

    const highlights: { start: number; end: number; isChunk: boolean }[] = [];

    // Find query matches
    if (query) {
      const regex = new RegExp(escapeRegex(query), 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        highlights.push({ start: match.index, end: match.index + match[0].length, isChunk: false });
      }
    }

    // Find chunk matches
    if (chunks) {
      for (const chunk of chunks) {
        const index = text.indexOf(chunk);
        if (index !== -1) {
          highlights.push({ start: index, end: index + chunk.length, isChunk: true });
        }
      }
    }

    highlights.sort((a, b) => a.start - b.start);

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const highlight of highlights) {
      if (highlight.start > lastIndex) {
        parts.push(text.slice(lastIndex, highlight.start));
      }
      parts.push(
        <mark
          key={highlight.start}
          className={highlight.isChunk ? 'bg-orange-200' : 'bg-yellow-200'}
        >
          {text.slice(highlight.start, highlight.end)}
        </mark>
      );
      lastIndex = highlight.end;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return part.split('\n').map((line, j) => (
          <React.Fragment key={`${i}-${j}`}>
            {line}
            {j < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        ));
      }
      return part;
    });
  };

  // Toggle expanded view
  const toggleExpand = (side: 'original' | 'translated') => {
    if (expandedSide === side) {
      setExpandedSide(null);
    } else {
      setExpandedSide(side);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <Translate className="w-5 h-5 text-orange-600" weight="bold" />
          <span className="font-medium text-gray-700">{filename}</span>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            Sync scroll
          </label>
        </div>
      </div>

      {/* Split Pane Content */}
      <div
        ref={containerRef}
        className="flex-1 flex relative overflow-hidden"
        style={{ cursor: isDragging ? 'col-resize' : 'default' }}
      >
        {/* Original Language Pane */}
        <div
          className={`flex flex-col transition-all duration-300 ${
            expandedSide === 'translated' ? 'w-0 overflow-hidden' :
            expandedSide === 'original' ? 'w-full' : ''
          }`}
          style={{
            width: expandedSide ? undefined : `${splitPosition}%`,
            minWidth: expandedSide === 'translated' ? 0 : undefined
          }}
        >
          {/* Pane Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-orange-50 border-b">
            <div className="flex items-center gap-2">
              <span className="text-lg">{languageInfo?.flag || '🌐'}</span>
              <span className="font-medium text-orange-800">{languageInfo?.name || 'Unknown'}</span>
              <span className="text-sm text-orange-600">({languageInfo?.nativeName || 'Original'})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(originalText, 'original')}
                className="p-1.5 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                title="Copy original text"
              >
                {copiedSide === 'original' ? (
                  <Check className="w-4 h-4" weight="bold" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => toggleExpand('original')}
                className="p-1.5 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                title={expandedSide === 'original' ? 'Collapse' : 'Expand'}
              >
                {expandedSide === 'original' ? (
                  <ArrowsInSimple className="w-4 h-4" />
                ) : (
                  <ArrowsOutSimple className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Pane Content */}
          <div
            ref={originalRef}
            className="flex-1 overflow-auto p-4 text-gray-800 leading-relaxed"
          >
            <div className="whitespace-pre-wrap">
              {highlightText(originalText, searchQuery, highlightedChunks?.original)}
            </div>
          </div>
        </div>

        {/* Resizer */}
        {!expandedSide && (
          <div
            className="w-2 bg-gray-200 hover:bg-orange-400 cursor-col-resize flex items-center justify-center transition-colors"
            onMouseDown={handleMouseDown}
          >
            <div className="flex flex-col gap-1">
              <CaretLeft className="w-3 h-3 text-gray-400" />
              <CaretRight className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        )}

        {/* Translated (English) Pane */}
        <div
          className={`flex flex-col transition-all duration-300 ${
            expandedSide === 'original' ? 'w-0 overflow-hidden' :
            expandedSide === 'translated' ? 'w-full' : ''
          }`}
          style={{
            width: expandedSide ? undefined : `${100 - splitPosition}%`,
            minWidth: expandedSide === 'original' ? 0 : undefined
          }}
        >
          {/* Pane Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-green-50 border-b">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <span className="font-medium text-green-800">English</span>
              <span className="text-sm text-green-600">(Translation)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(translatedText, 'translated')}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Copy translated text"
              >
                {copiedSide === 'translated' ? (
                  <Check className="w-4 h-4" weight="bold" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => toggleExpand('translated')}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                title={expandedSide === 'translated' ? 'Collapse' : 'Expand'}
              >
                {expandedSide === 'translated' ? (
                  <ArrowsInSimple className="w-4 h-4" />
                ) : (
                  <ArrowsOutSimple className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Pane Content */}
          <div
            ref={translatedRef}
            className="flex-1 overflow-auto p-4 text-gray-800 leading-relaxed"
          >
            <div className="whitespace-pre-wrap">
              {highlightText(translatedText, searchQuery, highlightedChunks?.translated)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
