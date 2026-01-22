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
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { initializeDatabase, hasDatabase } from '@/lib/database/provision';

export default function CasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initializingDb, setInitializingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [cases, setCases] = useState<any[]>([]);

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#f7f5f3' }}>
        {initializingDb && (
          <>
            <Database className="w-12 h-12 text-blue-600 animate-pulse" />
            <p className="text-lg font-medium">Setting up your database...</p>
            <p className="text-sm text-muted-foreground">This will only take a moment</p>
          </>
        )}
        {!initializingDb && <p className="text-muted-foreground">Loading...</p>}
      </div>
    );
  }


  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f5f3' }}>
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bankruptcy Cases</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your Chapter 7 and Chapter 13 cases</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline">
                  <Key className="w-4 h-4 mr-2" />
                  Configure API Key
                </Button>
              </Link>
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
        {cases.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
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
          /* Cases List */
          <div className="space-y-4">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{c.clientName}</CardTitle>
                        <CardDescription>
                          {c.caseType === 'chapter7' ? 'Chapter 7' : 'Chapter 13'} • {c.filingType === 'individual' ? 'Individual' : 'Joint'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {c.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Features Grid */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* P0 Features - Core */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <CardTitle className="text-base">Client Intake</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Secure portal for document collection & validation
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <Upload className="w-6 h-6 text-blue-600 mb-2" />
                <CardTitle className="text-base">Document Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  OCR & AI-powered data extraction from financial docs
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <Calculator className="w-6 h-6 text-purple-600 mb-2" />
                <CardTitle className="text-base">Means Test</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Automatic Chapter 7 eligibility calculation
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <FileText className="w-6 h-6 text-purple-600 mb-2" />
                <CardTitle className="text-base">Form Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Auto-generate 20+ Official Forms (101-423)
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <DollarSign className="w-6 h-6 text-green-600 mb-2" />
                <CardTitle className="text-base">Chapter 13 Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Calculate 3-5 year repayment plans automatically
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CreditCard className="w-6 h-6 text-green-600 mb-2" />
                <CardTitle className="text-base">Payment Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Monitor trustee payments over plan duration
                </p>
              </CardContent>
            </Card>

            {/* P1 Features - Enhanced */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500 opacity-75">
              <CardHeader className="pb-2">
                <Calendar className="w-6 h-6 text-orange-600 mb-2" />
                <CardTitle className="text-base">Timeline & Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Track key dates, hearings, and filing deadlines
                </p>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500 opacity-75">
              <CardHeader className="pb-2">
                <Gavel className="w-6 h-6 text-orange-600 mb-2" />
                <CardTitle className="text-base">341 Meeting Prep</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Generate preparation materials for creditor meetings
                </p>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500 opacity-75">
              <CardHeader className="pb-2">
                <Shield className="w-6 h-6 text-orange-600 mb-2" />
                <CardTitle className="text-base">Credit Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Pull and analyze credit reports automatically
                </p>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500 opacity-75">
              <CardHeader className="pb-2">
                <Database className="w-6 h-6 text-orange-600 mb-2" />
                <CardTitle className="text-base">PACER eFiling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Direct integration with court filing system
                </p>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded mt-2 inline-block">Coming Soon</span>
              </CardContent>
            </Card>

            {/* P2 Features - Analytics */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-gray-400 opacity-60">
              <CardHeader className="pb-2">
                <BarChart3 className="w-6 h-6 text-gray-500 mb-2" />
                <CardTitle className="text-base">Case Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Firm-wide metrics and reporting dashboard
                </p>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-2 inline-block">Planned</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-gray-400 opacity-60">
              <CardHeader className="pb-2">
                <Clock className="w-6 h-6 text-gray-500 mb-2" />
                <CardTitle className="text-base">Plan Modifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Streamlined Chapter 13 plan amendment workflow
                </p>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-2 inline-block">Planned</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
