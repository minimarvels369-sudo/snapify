"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define a type for our product data to use in the component
interface Product {
  id: string;
  title: string;
  images: {
    edges: {
      node: {
        url: string;
        altText: string | null;
      };
    }[];
  };
}

function ProductManager() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchProducts = async () => {
    if (!shop) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products?shop=${shop}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products.');
      }
      const data = await response.json();
      setProducts(data.products || []);
      if(data.products.length === 0){
         toast({
            title: "No products found",
            description: "Click 'Sync Products' to fetch them from Shopify.",
          });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not fetch products from your store.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncProducts = async () => {
    if (!shop) {
        toast({
            title: "Error",
            description: "Shop domain is not available.",
            variant: "destructive",
          });
        return;
    };
    setIsSyncing(true);
    try {
        const response = await fetch('/api/products/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shop }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to sync products.');
        }
        const data = await response.json();
        toast({
            title: "Sync Successful",
            description: data.message,
        });
        // Refresh the product list after syncing
        await fetchProducts();
    } catch (error: any) {
        console.error(error);
        toast({
            title: "Sync Failed",
            description: error.message || "An unknown error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsSyncing(false);
    }
  };
  
  // Fetch products on initial component load
  useEffect(() => {
    if(shop) {
        fetchProducts();
    }
  }, [shop]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline">Product Image Manager</CardTitle>
                <CardDescription>
                    Sync and manage AI-generated images for your products.
                </CardDescription>
            </div>
            <Button onClick={handleSyncProducts} disabled={isSyncing || !shop}>
                {isSyncing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSyncing ? 'Syncing...' : 'Sync Products'}
            </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader className="animate-spin" />
            </div>
          ) : products.length > 0 ? (
            <ul className="divide-y divide-gray-200">
                {products.map((product) => (
                    <li key={product.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <img 
                                // Use a placeholder if no image exists
                                src={product.images.edges[0]?.node.url || 'https://placehold.co/600x400/EEE/31343C?text=No+Image'} 
                                alt={product.title} 
                                className="w-16 h-16 object-cover rounded-md mr-4"
                            />
                            <span className="font-medium">{product.title}</span>
                        </div>
                        {/* The link will navigate to a page to generate an image for that specific product */}
                        <Button asChild>
                            <Link href={`/generate?product_id=${product.id.split('/').pop()}&shop=${shop}`}>
                                Generate Image
                            </Link>
                        </Button>
                    </li>
                ))}
            </ul>
          ) : (
            <div className="text-center py-10">
                <p>No products found.</p>
                <p className="text-sm text-muted-foreground">Click the "Sync Products" button to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// We need to wrap the component in Suspense because useSearchParams() requires it for Client Components.
export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader className="animate-spin" /></div>}>
            <ProductManager />
        </Suspense>
    )
}
