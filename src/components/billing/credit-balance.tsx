import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard } from "lucide-react";

interface CreditBalanceProps {
  credits: number;
}

export function CreditBalance({ credits }: CreditBalanceProps) {
  return (
    <Card className="sm:col-span-2">
      <CardHeader className="pb-2">
        <CardDescription className="font-headline">Credit Balance</CardDescription>
        <CardTitle className="text-4xl">
          {credits.toLocaleString()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">
          +20.1% from last month
        </div>
      </CardContent>
      <CardFooter>
        <Button>
          <CreditCard className="mr-2 h-4 w-4" /> Purchase Credits
        </Button>
      </CardFooter>
    </Card>
  );
}
