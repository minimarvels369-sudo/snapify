"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shop, setShop] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const shopParam = searchParams.get("shop");
    if (shopParam) {
      setShop(shopParam);
      verifyAuthentication(shopParam);
    } else {
      setError("Shop parameter is missing. Please ensure you are opening this app from your Shopify Admin.");
    }
  }, [searchParams]);

  const verifyAuthentication = async (shopDomain: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop: shopDomain }),
      });
      const data = await response.json();
      if (data.authenticated) {
        router.push(`/?shop=${shopDomain}`);
      } else {
        // If not authenticated, stay on this page to show the install button
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to verify authentication. Please try again.");
      setIsLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!shop) {
        setError("Shop domain is not available.");
        return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });
      if (!response.ok) throw new Error('Failed to get installation URL');
      const { installUrl } = await response.json();
      // Redirect the top-level window to the Shopify install URL
      window.top!.location.href = installUrl;
    } catch (err: any) {
      setError(err.message || "Installation failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline">AI Fashion Studio</CardTitle>
          <CardDescription>
            {isLoading ? "Verifying your shop..." : "Welcome! Please install the app to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive mb-4">{error}</p>}
          {isLoading ? (
            <div className="flex justify-center">
              <Loader className="animate-spin" />
            </div>
          ) : (
            <Button onClick={handleInstall} className="w-full" disabled={!shop}>
              Install App
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
