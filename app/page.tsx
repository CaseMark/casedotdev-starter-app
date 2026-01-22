'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has API key in localStorage
    const apiKey = localStorage.getItem('casedev_api_key');

    if (apiKey) {
      // Already logged in - go to cases
      router.push('/cases');
    } else {
      // Not logged in - go to login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f7f5f3' }}>
      <div className="text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
