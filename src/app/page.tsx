import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentGenerations } from "@/components/dashboard/recent-generations";
import { recentGenerations } from "@/lib/data";

export default function Dashboard() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard
          title="Total Credits"
          value="4,520"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          description="+20.1% from last month"
        />
        <StatCard
          title="Images Generated"
          value="1,250"
          icon={<Images className="h-4 w-4 text-muted-foreground" />}
          description="+180.1% from last month"
        />
        <StatCard
          title="Active Subscriptions"
          value="23"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          description="+19% from last month"
        />
        <StatCard
          title="Revenue"
          value="$12,145.00"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="+2 since last hour"
        />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle className="font-headline">Recent Generations</CardTitle>
              <CardDescription>
                A log of the most recently generated product images.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/gallery">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentGenerations generations={recentGenerations.slice(0, 5)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
