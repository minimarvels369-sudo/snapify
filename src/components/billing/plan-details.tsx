import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Subscription } from "@/lib/types";
import { format } from 'date-fns';

interface PlanDetailsProps {
    subscription: Subscription;
}

export function PlanDetails({ subscription }: PlanDetailsProps) {
  return (
    <Card className="sm:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline">Your Plan</CardTitle>
        <CardDescription className="max-w-lg text-balance leading-relaxed">
          You are currently on the <strong>{subscription.plan}</strong> plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
            <p>Status: <span className="font-medium text-foreground capitalize">{subscription.status}</span></p>
            <p>Renews on: <span className="font-medium text-foreground">{format(subscription.endDate, 'PPP')}</span></p>
        </div>
      </CardContent>
      <CardFooter>
        <Button>Upgrade Plan</Button>
        <Button variant="outline" className="ml-2">Cancel Subscription</Button>
      </CardFooter>
    </Card>
  );
}
