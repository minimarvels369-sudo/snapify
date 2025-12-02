"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader } from 'lucide-react';

// The backend server URL
const API_URL = 'https://api-iiewd7uyda-uc.a.run.app';

function AuthRedirector() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');
  const host = searchParams.get('host'); // Shopify also provides the host parameter

  useEffect(() => {
    if (shop && host) {
      // If we have a shop parameter, redirect to the backend's auth endpoint.
      // The backend will handle the OAuth process and then redirect back to this frontend.
      window.location.href = `${API_URL}/auth?shop=${shop}&host=${host}`;
    }
  }, [shop, host]);

  // Display a loading indicator while redirecting.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader className="animate-spin h-10 w-10" />
      <p className="ml-4 text-lg">Connecting to your Shopify store...</p>
    </div>
  );
}

// We need to wrap the component in Suspense because useSearchParams() requires it.
export default function RedirectPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader className="animate-spin h-10 w-10" /></div>}>
            <AuthRedirector />
        </Suspense>
    )
}
