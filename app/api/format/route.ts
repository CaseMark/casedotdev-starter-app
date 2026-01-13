/**
 * Document Format API Route
 * 
 * Converts documents to various formats (PDF, DOCX, HTML)
 * using Case.dev Format API.
 */

import { NextRequest, NextResponse } from 'next/server';

const CASE_API_BASE_URL = 'https://api.case.dev';

interface FormatRequestBody {
  content: string;
  format: 'pdf' | 'docx' | 'html';
  options?: {
    title?: string;
    author?: string;
    pageSize?: 'letter' | 'a4';
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key is configured
    const apiKey = process.env.CASEDEV_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Case.dev API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: FormatRequestBody = await request.json();

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!body.format || !['pdf', 'docx', 'html'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Valid format (pdf, docx, html) is required' },
        { status: 400 }
      );
    }

    // Call Case.dev Format API
    const response = await fetch(`${CASE_API_BASE_URL}/format/v1/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        content: body.content,
        input_format: 'markdown',
        output_format: body.format,
        options: body.options || {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific error codes
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (response.status === 400) {
        return NextResponse.json(
          { error: errorData.error?.message || 'Invalid request parameters' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: errorData.error?.message || 'Format API request failed' },
        { status: response.status }
      );
    }

    // For binary formats (PDF, DOCX), return the file
    if (body.format === 'pdf' || body.format === 'docx') {
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      const contentType = body.format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="document.${body.format}"`,
        },
      });
    }

    // For HTML, return JSON with the content
    const data = await response.json();
    return NextResponse.json({
      html: data.content || data.html,
      format: 'html',
    });
  } catch (error) {
    console.error('Format API Error:', error);

    // Generic error response
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
