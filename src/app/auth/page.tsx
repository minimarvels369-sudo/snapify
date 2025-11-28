"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

function AuthComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shop, setShop] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const shopParam = searchParams.get("shop");
    if (shopParam) {
      setShop(shopParam);
    } else {
      setError("Shop parameter is missing. Please ensure you are opening this app from your Shopify Admin.");
    }
  }, [searchParams]);

  const handleInstall = () => {
    if (!shop) {
        setError("Shop domain is not available.");
        return;
    }
    // The installation URL is now built on the server, so we redirect directly.
    // The server-side /api/auth endpoint will handle the OAuth logic.
    window.top!.location.href = `/api/auth?shop=${shop}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline">AI Fashion Studio</CardTitle>
          <CardDescription>
            Welcome! Please install the app to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive mb-4">{error}</p>}
          {isLoading ? (
            <div className="flex justify-center">
              <Loader className="animate-spin" />
            </div>
          ) : (
            <Button onClick={handleInstall} className="w-full" disabled={!shop || isLoading}>
              Install App
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader className="animate-spin" /></div>}>
            <AuthComponent />
        </Suspense>
    )
}
