"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderOpen, ArrowRight, MagnifyingGlass, FileText } from "@phosphor-icons/react";

export default function Page() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-background px-6">
      <div className="max-w-2xl text-center space-y-8">
        <div className="w-16 h-16  bg-foreground/5 flex items-center justify-center mx-auto">
          <FolderOpen size={32} weight="fill" className="text-foreground" />
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl tracking-tight text-foreground">
            Discovery Desktop
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            E-discovery document management with AI-powered semantic search.
            Upload documents, extract text, and find what you need instantly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/cases">
            <Button size="lg" variant="default">
              Get Started
              <ArrowRight size={18} />
            </Button>
          </Link>
        </div>

        <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left max-w-xl mx-auto">
          <div className="space-y-2">
            <FileText size={28} weight="light" className="text-muted-foreground" />
            <h3 className="text-foreground">Upload Documents</h3>
            <p className="text-sm text-muted-foreground">
              PDFs, images, and text files with automatic OCR
            </p>
          </div>
          <div className="space-y-2">
            <MagnifyingGlass size={28} weight="light" className="text-muted-foreground" />
            <h3 className="text-foreground">Semantic Search</h3>
            <p className="text-sm text-muted-foreground">
              Find relevant passages using natural language
            </p>
          </div>
          <div className="space-y-2">
            <FolderOpen size={28} weight="light" className="text-muted-foreground" />
            <h3 className="text-foreground">Organize by Case</h3>
            <p className="text-sm text-muted-foreground">
              Keep documents organized by matter
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          All data is stored locally in your browser. No account required.
        </p>
      </div>
    </main>
  );
}
