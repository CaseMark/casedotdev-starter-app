"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/components/documents";
import { 
  FileText, 
  FolderOpen, 
  Sparkle,
  ArrowRight 
} from "@phosphor-icons/react";
import type { DocumentTemplate } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleStartGeneration = () => {
    if (selectedTemplate) {
      router.push(`/generate/${selectedTemplate.id}`);
    }
  };

  const handleViewDocuments = () => {
    router.push("/documents");
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkle size={16} weight="fill" />
              AI-Powered Document Generation
            </div>
            
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground"
              style={{ fontFamily: "'Spectral', serif" }}
            >
              Legal Document Studio
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate professional legal documents in minutes. Choose a template, 
              fill in the details with AI assistance, and export in your preferred format.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}
                className="gap-2"
              >
                <FileText size={20} />
                Start New Document
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleViewDocuments}
                className="gap-2"
              >
                <FolderOpen size={20} />
                View My Documents
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <FeatureCard
            icon={<FileText size={24} className="text-primary" />}
            title="Professional Templates"
            description="Choose from employment agreements, NDAs, contractor agreements, and more."
          />
          <FeatureCard
            icon={<Sparkle size={24} className="text-primary" />}
            title="AI-Assisted Input"
            description="Describe your needs in plain English and let AI fill in the form fields."
          />
          <FeatureCard
            icon={<FolderOpen size={24} className="text-primary" />}
            title="Local Storage"
            description="Your documents stay on your device. Export to PDF, DOCX, or HTML."
          />
        </div>
      </div>

      {/* Template Selection Section */}
      <div id="templates" className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
              Choose a Template
            </h2>
            <p className="text-muted-foreground">
              Select a document template to get started
            </p>
          </div>

          <TemplateSelector
            onSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id}
          />

          {/* Selected Template Action */}
          {selectedTemplate && (
            <div className="mt-8 p-6 rounded-lg border bg-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.sections.length} sections • {
                      selectedTemplate.sections.reduce((acc, s) => acc + s.variables.length, 0)
                    } fields
                  </p>
                </div>
                <Button onClick={handleStartGeneration} className="gap-2">
                  Continue
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>Legal Document Studio • Powered by Case.dev</p>
            <p>All documents are stored locally in your browser</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center p-6 rounded-lg border bg-card">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
