'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  Clock,
  Key,
  Database,
  Calculator,
  DollarSign,
  Upload,
  Calendar,
  CreditCard,
  Gavel,
  BarChart3,
  Users,
  Shield,
  Trash2,
  Phone
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatForDisplay } from '@/lib/utils/phone-validation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { initializeDatabase, hasDatabase } from '@/lib/database/provision';
import { CaseSelectorModal } from '@/components/cases/case-selector-modal';
import { IntakeCallButton } from '@/components/voice/intake-call-button';

// Feature configuration type
interface FeatureConfig {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

// P0 Feature configurations - using orange accent for case.dev branding
const P0_FEATURES: Record<string, FeatureConfig> = {
  clientIntake: {
    id: 'clientIntake',
    title: 'Client Intake',
    description: 'Manage client information and documents',
    path: '',
    icon: <Users className="w-5 h-5 text-primary" />,
  },
  documentUpload: {
    id: 'documentUpload',
    title: 'Document Upload',
    description: 'Upload and process financial documents',
    path: 'documents',
    icon: <Upload className="w-5 h-5 text-primary" />,
  },
  meansTest: {
    id: 'meansTest',
    title: 'Means Test',
    description: 'Calculate Chapter 7 eligibility',
    path: 'means-test',
    icon: <Calculator className="w-5 h-5 text-primary" />,
  },
  formGeneration: {
    id: 'formGeneration',
    title: 'Form Generation',
    description: 'Generate official bankruptcy forms',
    path: 'forms',
    icon: <FileText className="w-5 h-5 text-primary" />,
  },
  chapter13Plan: {
    id: 'chapter13Plan',
    title: 'Chapter 13 Plan',
    description: 'View and manage repayment plan',
    path: 'financial',
    icon: <DollarSign className="w-5 h-5 text-primary" />,
  },
  paymentTracking: {
    id: 'paymentTracking',
    title: 'Payment Tracking',
    description: 'Track financial data and payments',
    path: 'financial',
    icon: <CreditCard className="w-5 h-5 text-primary" />,
  },
};

export default function CasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initializingDb, setInitializingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<{ id: string; clientName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const handleCopyPhone = async () => {
    const phoneNumber = process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER || '16282440385';
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy phone number:', error);
    }
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;

    setDeleting(true);
    try {
      const connectionString = localStorage.getItem('bankruptcy_db_connection');
      if (!connectionString) {
        console.error('No database connection found');
        return;
      }

      const response = await fetch(
        `/api/cases/${caseToDelete.id}?connectionString=${encodeURIComponent(connectionString)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Remove the case from the local state
        setCases(cases.filter(c => c.id !== caseToDelete.id));
      } else {
        const data = await response.json();
        console.error('Failed to delete case:', data.error);
      }
    } catch (error) {
      console.error('Error deleting case:', error);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  };

  const openDeleteDialog = (e: React.MouseEvent, caseItem: { id: string; clientName: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setCaseToDelete(caseItem);
    setDeleteDialogOpen(true);
  };
  const [selectedFeature, setSelectedFeature] = useState<FeatureConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  const handleFeatureClick = (featureId: string) => {
    const feature = P0_FEATURES[featureId];
    if (feature) {
      setSelectedFeature(feature);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedFeature(null);
  };

  useEffect(() => {
    async function init() {
      // Check if user has API key
      const apiKey = localStorage.getItem('casedev_api_key');
      if (!apiKey) {
        router.push('/login');
        return;
      }

      // Check if database exists, create if not
      if (!hasDatabase()) {
        // Try to initialize database in background (non-blocking)
        initializeDatabase(apiKey)
          .then(() => {
            console.log('Database initialized successfully');
            setDbReady(true);
            loadCases();
          })
          .catch((error) => {
            console.warn('Database initialization skipped:', error.message);
            setDbReady(false);
            setLoading(false);
          });
      } else {
        setDbReady(true);
        loadCases();
      }
    }

    async function loadCases() {
      try {
        // Get database connection string from localStorage
        const connectionString = localStorage.getItem('bankruptcy_db_connection');
        console.log('loadCases called, connectionString:', connectionString ? `${connectionString.substring(0, 50)}...` : 'null');
        
        if (!connectionString) {
          console.log('No database connection found in localStorage');
          setCases([]);
          setLoading(false);
          return;
        }

        // Load cases from database via API
        const url = `/api/cases/list?connectionString=${encodeURIComponent(connectionString)}`;
        console.log('Fetching cases from API...');
        const response = await fetch(url);
        const data = await response.json();
        console.log('Cases loaded from API:', data.cases?.length || 0, 'cases');
        setCases(data.cases || []);
      } catch (error) {
        console.error('Failed to load cases:', error);
        setCases([]);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (loading || initializingDb) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        {initializingDb && (
          <>
            <Database className="w-12 h-12 text-primary animate-pulse" />
            <p className="text-lg font-medium">Setting up your database...</p>
            <p className="text-sm text-muted-foreground">This will only take a moment</p>
          </>
        )}
        {!initializingDb && <p className="text-muted-foreground">Loading...</p>}
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-foreground">Bankruptcy Cases</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your Chapter 7 and Chapter 13 cases</p>
            </div>
            <div className="flex items-center gap-3">
              <IntakeCallButton />
              <Button variant="outline" onClick={() => setApiKeyDialogOpen(true)}>
                <Key className="w-4 h-4 mr-2" />
                Configure API Key
              </Button>
              <Link href="/cases/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Case
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Voice Intake Info Box */}
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3 relative">
          <Phone className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            Clients can call{' '}
            <span
              onClick={handleCopyPhone}
              className="inline-flex items-center mx-1 px-2.5 py-1 bg-white border border-orange-300 rounded-md font-semibold text-orange-900 tracking-wide cursor-pointer hover:bg-orange-50 hover:border-orange-400 transition-all active:scale-95"
              title="Click to copy"
            >
              {process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER
                ? formatForDisplay(process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER)
                : '+1 (628) 244 0385'}
            </span>
            {' '}and our voice agent will begin the automated intake process.
          </p>
          {/* Copy confirmation popup */}
          {phoneCopied && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg text-sm font-medium animate-in fade-in zoom-in duration-200">
              Copied phone number
            </div>
          )}
        </div>

        {cases.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-accent rounded flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>No cases yet</CardTitle>
              <CardDescription>
                Get started by creating your first bankruptcy case
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/cases/new">
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Case
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Cases List - Enhanced Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cases.map((c) => {
              // Generate initials for avatar
              const initials = c.clientName
                ?.split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '??';
              
              // Use consistent orange-based avatar colors for case.dev branding
              const colors = [
                'bg-primary', 'bg-orange-400', 'bg-amber-500',
                'bg-orange-600', 'bg-amber-600', 'bg-orange-500',
                'bg-amber-400', 'bg-primary'
              ];
              const colorIndex = c.clientName?.charCodeAt(0) % colors.length || 0;
              const avatarColor = colors[colorIndex];

              // Format status with proper capitalization
              const formatStatus = (status: string) => {
                if (!status) return 'Intake';
                return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
              };

              // Get status color - using orange-based palette for case.dev
              const getStatusStyle = (status: string) => {
                const s = status?.toLowerCase() || 'intake';
                switch (s) {
                  case 'intake':
                    return 'bg-accent text-primary border-primary/20';
                  case 'active':
                    return 'bg-green-50 text-green-700 border-green-200';
                  case 'pending':
                    return 'bg-amber-50 text-amber-700 border-amber-200';
                  case 'filed':
                    return 'bg-orange-100 text-orange-700 border-orange-200';
                  case 'closed':
                    return 'bg-muted text-muted-foreground border-border';
                  default:
                    return 'bg-accent text-primary border-primary/20';
                }
              };

              return (
                <Link key={c.id} href={`/cases/${c.id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/50 hover:-translate-y-1 h-full">
                    <CardContent className="p-5">
                      {/* Top Section: Avatar + Name + Status */}
                      <div className="flex items-start gap-3 mb-3">
                        {/* Profile Avatar */}
                        <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <span className="text-white font-semibold text-base">{initials}</span>
                        </div>
                        
                        {/* Name and Case Type */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-foreground truncate">{c.clientName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {c.caseType === 'chapter7' ? 'Chapter 7' : 'Chapter 13'} Bankruptcy
                          </p>
                        </div>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={(e) => openDeleteDialog(e, { id: c.id, clientName: c.clientName })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border my-3" />

                      {/* Case Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {c.filingType === 'individual' ? 'Individual' : 'Joint Filing'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Section: Status Badge */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusStyle(c.status)}`}>
                          {formatStatus(c.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Case #{c.id?.slice(-6).toUpperCase() || 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Delete Case</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the case for <strong>{caseToDelete?.clientName}</strong>?
                This action cannot be undone and will permanently remove all case data, documents, and forms.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCase}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete Case'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* API Key Change Confirmation Dialog */}
        <AlertDialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Change API Key</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to change your API key?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push('/login')}>
                Proceed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Features Grid */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* P0 Features - Core - using orange accents for case.dev branding */}
            <Card
              onClick={() => handleFeatureClick('clientIntake')}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary active:scale-[0.98]"
            >
              <CardHeader className="pb-2">
                <Users className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-base">Client Intake</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Secure portal for document collection & validation
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleFeatureClick('documentUpload')}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary active:scale-[0.98]"
            >
              <CardHeader className="pb-2">
                <Upload className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-base">Document Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  OCR & AI-powered data extraction from financial docs
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleFeatureClick('meansTest')}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary active:scale-[0.98]"
            >
              <CardHeader className="pb-2">
                <Calculator className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-base">Means Test</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Automatic Chapter 7 eligibility calculation
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleFeatureClick('formGeneration')}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary active:scale-[0.98]"
            >
              <CardHeader className="pb-2">
                <FileText className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-base">Form Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Auto-generate 20+ Official Forms (101-423)
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleFeatureClick('paymentTracking')}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary active:scale-[0.98]"
            >
              <CardHeader className="pb-2">
                <CreditCard className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-base">Payment Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Monitor trustee payments over plan duration
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500 opacity-75">
              <CardHeader className="pb-2">
                <DollarSign className="w-6 h-6 text-amber-600 mb-2" />
                <CardTitle className="text-base">Chapter 13 Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Calculate 3-5 year repayment plans automatically
                </p>
                <span className="text-[10px] bg-accent text-primary px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            {/* P1 Features - Enhanced */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500 opacity-75">
              <CardHeader className="pb-2">
                <Calendar className="w-6 h-6 text-amber-600 mb-2" />
                <CardTitle className="text-base">Timeline & Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Track key dates, hearings, and filing deadlines
                </p>
                <span className="text-[10px] bg-accent text-primary px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500 opacity-75">
              <CardHeader className="pb-2">
                <Gavel className="w-6 h-6 text-amber-600 mb-2" />
                <CardTitle className="text-base">341 Meeting Prep</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Generate preparation materials for creditor meetings
                </p>
                <span className="text-[10px] bg-accent text-primary px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500 opacity-75">
              <CardHeader className="pb-2">
                <Shield className="w-6 h-6 text-amber-600 mb-2" />
                <CardTitle className="text-base">Credit Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Pull and analyze credit reports automatically
                </p>
                <span className="text-[10px] bg-accent text-primary px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500 opacity-75">
              <CardHeader className="pb-2">
                <Database className="w-6 h-6 text-amber-600 mb-2" />
                <CardTitle className="text-base">PACER eFiling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Direct integration with court filing system
                </p>
                <span className="text-[10px] bg-accent text-primary px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            {/* P2 Features - Analytics */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-muted-foreground/50 opacity-60">
              <CardHeader className="pb-2">
                <BarChart3 className="w-6 h-6 text-muted-foreground mb-2" />
                <CardTitle className="text-base">Case Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Firm-wide metrics and reporting dashboard
                </p>
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded mt-2 inline-block">Planned</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-muted-foreground/50 opacity-60">
              <CardHeader className="pb-2">
                <Clock className="w-6 h-6 text-muted-foreground mb-2" />
                <CardTitle className="text-base">Plan Modifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Streamlined Chapter 13 plan amendment workflow
                </p>
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded mt-2 inline-block">Planned</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Case Selector Modal */}
      <CaseSelectorModal
        isOpen={modalOpen}
        onClose={closeModal}
        cases={cases}
        feature={selectedFeature}
      />
    </div>
  );
}
