"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, ServerCrash, Bot } from "lucide-react";

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

export function ProductsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const shop = searchParams.get("shop");

  useEffect(() => {
    async function loadProducts() {
      if (!shop) {
        setError("Shopify session not found. Please re-authenticate.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        await fetch("/api/products/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop }),
        });

        const response = await fetch(`/api/products?shop=${shop}`);
        if (!response.ok) {
          throw new Error("Failed to fetch products.");
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [shop]);

  const handleSelectProduct = (productId: string, isSelected: boolean) => {
    setSelectedProducts((prev) =>
      isSelected
        ? [...prev, productId]
        : prev.filter((id) => id !== productId)
    );
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter((product) =>
      product.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-lg">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Error Fetching Products</AlertTitle>
          <AlertDescription>
            {error}
            <Button onClick={() => window.location.reload()} variant="link">
              Please try again.
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (loading) {
    return (
     <div className="flex flex-col w-full gap-4">
       <div className="flex items-center justify-between">
         <h1 className="text-2xl font-headline sm:text-3xl">Select Products</h1>
         <div className="relative ml-auto flex-1 md:grow-0">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
           <Skeleton className="h-9 w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]" />
         </div>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
         {[...Array(8)].map((_, i) => (
           <Card key={i}>
             <CardContent className="p-0">
               <Skeleton className="aspect-[4/3] w-full" />
             </CardContent>
             <CardFooter className="p-4">
               <Skeleton className="h-4 w-3/4" />
             </CardFooter>
           </Card>
         ))}
       </div>
     </div>
    )
  }

  const handleNavigate = () => {
    const params = new URLSearchParams();
    selectedProducts.forEach(id => params.append('productIds', id));
    router.push(`/generate?${params.toString()}`);
  }

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline sm:text-3xl">Select Products</h1>
        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
          />
        </div>
      </div>
      
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
            <h2 className="text-xl font-semibold">No Products Found</h2>
            <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search." : "It looks like your store has no products yet."}
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader className="p-0">
                 <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={product.images.edges[0]?.node.url || "https://picsum.photos/seed/1/400/300"}
                      alt={product.images.edges[0]?.node.altText || product.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2">
                        <Checkbox 
                            id={`select-${product.id}`}
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                            className="bg-background border-2 shadow-lg"
                        />
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-base font-medium line-clamp-2">{product.title}</CardTitle>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        {selectedProducts.length > 0 && (
            <div className="sticky bottom-0 left-0 right-0 w-full bg-background/80 backdrop-blur-sm p-4 border-t flex items-center justify-center z-10">
                <Button size="lg" onClick={handleNavigate}>
                    <Bot className="mr-2"/>
                    Generate Photos for {selectedProducts.length} Product(s)
                </Button>
            </div>
        )}
    </div>
  );
}
