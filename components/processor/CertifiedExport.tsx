'use client';

import React, { useState } from 'react';
import { Download, FileText, Certificate, Spinner, Check, X } from '@phosphor-icons/react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/types';

interface CertifiedExportProps {
  document: {
    id: string;
    filename: string;
    originalLanguage: LanguageCode;
    originalText: string;
    translatedText: string;
    pageCount: number;
    uploadedAt: string;
  };
  onClose: () => void;
}

export default function CertifiedExport({ document, onClose }: CertifiedExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [translatorName, setTranslatorName] = useState('');
  const [translatorCredentials, setTranslatorCredentials] = useState('');
  const [includeOriginal, setIncludeOriginal] = useState(true);
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');

  const languageInfo = SUPPORTED_LANGUAGES[document.originalLanguage];

  const generateCertifiedTranslation = async () => {
    setIsGenerating(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const certificationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const certificationStatement = `
CERTIFICATE OF TRANSLATION ACCURACY

I, ${translatorName || '[Translator Name]'}${translatorCredentials ? `, ${translatorCredentials}` : ''}, hereby certify that:

1. I am competent to translate from ${languageInfo?.name || 'the source language'} to English.

2. The attached translation of the document titled "${document.filename}" is a true and accurate translation of the original ${languageInfo?.name || ''} document.

3. This translation was completed on ${certificationDate}.

4. The original document consists of ${document.pageCount} page(s).

Document Information:
- Original Language: ${languageInfo?.name || 'Unknown'} (${languageInfo?.nativeName || ''})
- Target Language: English
- Original Filename: ${document.filename}
- Translation Date: ${certificationDate}
- Document ID: ${document.id}

I certify under penalty of perjury that the foregoing is true and correct.

_______________________________
${translatorName || '[Translator Signature]'}
${translatorCredentials || '[Credentials]'}
Date: ${certificationDate}
`;

    const fullContent = `
================================================================================
                        CERTIFIED TRANSLATION
================================================================================

${certificationStatement}

================================================================================
                        ENGLISH TRANSLATION
================================================================================

${document.translatedText}

${includeOriginal ? `
================================================================================
                        ORIGINAL ${languageInfo?.name?.toUpperCase() || 'LANGUAGE'} TEXT
================================================================================

${document.originalText}
` : ''}

================================================================================
                        END OF DOCUMENT
================================================================================
`;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `certified_translation_${document.filename.replace(/\.[^/.]+$/, '')}.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsGenerating(false);
    setIsComplete(true);

    setTimeout(() => {
      setIsComplete(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Certificate className="w-5 h-5 text-orange-600" weight="fill" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Certified Translation Export</h2>
              <p className="text-sm text-gray-500">Generate official translation certificate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">{document.filename}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {languageInfo?.flag} {languageInfo?.name} → 🇺🇸 English
                </p>
                <p className="text-sm text-gray-500">
                  {document.pageCount} page{document.pageCount !== 1 ? 's' : ''} • Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Translator Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Translator Information</h3>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Translator Name</label>
              <input
                type="text"
                value={translatorName}
                onChange={(e) => setTranslatorName(e.target.value)}
                placeholder="Enter translator's full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Credentials (optional)</label>
              <input
                type="text"
                value={translatorCredentials}
                onChange={(e) => setTranslatorCredentials(e.target.value)}
                placeholder="e.g., ATA Certified Translator, Court Interpreter"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Export Options</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeOriginal}
                onChange={(e) => setIncludeOriginal(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-600">Include original {languageInfo?.name} text</span>
            </label>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Export Format</label>
              <div className="flex gap-3">
                <label className={`
                  flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all
                  ${format === 'pdf' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-300 hover:border-gray-400'}
                `}>
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={() => setFormat('pdf')}
                    className="sr-only"
                  />
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">PDF</span>
                </label>
                <label className={`
                  flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all
                  ${format === 'docx' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-300 hover:border-gray-400'}
                `}>
                  <input
                    type="radio"
                    name="format"
                    value="docx"
                    checked={format === 'docx'}
                    onChange={() => setFormat('docx')}
                    className="sr-only"
                  />
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">DOCX</span>
                </label>
              </div>
            </div>
          </div>

          {/* Certificate Preview */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Certificate className="w-5 h-5 text-amber-600 mt-0.5" weight="fill" />
              <div>
                <p className="text-sm font-medium text-amber-800">Certificate Preview</p>
                <p className="text-sm text-amber-700 mt-1">
                  The exported document will include a certification statement, the English translation
                  {includeOriginal ? ', and the original text' : ''}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generateCertifiedTranslation}
            disabled={isGenerating}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all
              ${isComplete
                ? 'bg-green-600 text-white'
                : 'bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? (
              <>
                <Spinner className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : isComplete ? (
              <>
                <Check className="w-4 h-4" weight="bold" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Certificate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
