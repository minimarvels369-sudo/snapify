import { Suspense } from 'react';
import { ProductsClient } from './products-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Search } from 'lucide-react';

// This is the loading fallback that will be rendered on the server.
function ProductsLoading() {
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
  );
}

// The main page is now a Server Component that uses Suspense.
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsClient />
    </Suspense>
  );
}
