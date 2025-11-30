
"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader, AlertCircle } from 'lucide-react';
import { ProductsClient } from './products/products-client'; // Assuming this component can be reused

// The backend server URL
const API_URL = 'https://api-iiewd7uyda-uc.a.run.app';

function AuthHandler() {
    const searchParams = useSearchParams();
    const shop = searchParams.get('shop');
    const host = searchParams.get('host');
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const verifyAuth = async () => {
            if (!shop || !host) {
                setError("Missing Shopify context. Please launch the app from your Shopify admin.");
                setIsLoading(false);
                return;
            }

            try {
                // Attempt to fetch data that requires authentication.
                const response = await fetch(`${API_URL}/products?shop=${shop}`);
                
                if (response.status === 401) {
                    // NOT AUTHENTICATED: Redirect to the auth flow.
                    console.log("Not authenticated. Redirecting to backend for auth...");
                    window.location.href = `${API_URL}/auth?shop=${shop}&host=${host}`;
                    // The page will redirect, so no need to update state.
                    return;
                }
                
                if (!response.ok) {
                    // Another server-side error occurred.
                    const errorText = await response.text();
                    throw new Error(errorText || "Failed to verify authentication.");
                }

                // AUTHENTICATED: The request was successful.
                console.log("Authentication successful. Rendering app.");
                setIsAuthenticated(true);

            } catch (err: any) {
                console.error("Error during auth verification:", err);
                setError(err.message || "An unknown error occurred during authentication.");
            } finally {
                setIsLoading(false);
            }
        };

        verifyAuth();
    }, [shop, host]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="animate-spin h-10 w-10" />
                <p className="ml-4 text-lg">Verifying session...</p>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
                <AlertCircle className="h-12 w-12 mb-4" />
                <h2 className="text-xl font-semibold mb-2">An Error Occurred</h2>
                <p className="text-center max-w-md">{error}</p>
            </div>
        );
    }

    if (isAuthenticated) {
        // If authenticated, render the main application UI.
        return <ProductsClient />;
    }

    // This state should ideally not be reached, as the logic either redirects,
    // loads the app, or shows an error.
    return null; 
}


export default function HomePage() {
    // We wrap the main logic in Suspense because useSearchParams() needs it.
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="animate-spin h-10 w-10" />
            </div>
        }>
            <AuthHandler />
        </Suspense>
    );
}
