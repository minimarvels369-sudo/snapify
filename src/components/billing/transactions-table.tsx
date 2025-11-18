import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/lib/types";
import { format } from "date-fns";

interface TransactionsTableProps {
  transactions: Transaction[];
}

const typeVariantMap: { [key: string]: "default" | "secondary" | "outline" } = {
    purchase: "default",
    usage: "secondary",
    refund: "outline",
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Transaction History</CardTitle>
        <CardDescription>
          A log of all credit purchases, usage, and refunds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.description}
                </TableCell>
                <TableCell>
                  <Badge variant={typeVariantMap[transaction.type]} className="capitalize">
                    {transaction.type}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right ${transaction.credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.credits > 0 && '+'}{transaction.credits.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                    {transaction.amount > 0 ? `$${transaction.amount.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell className="text-right">
                    {format(new Date(transaction.timestamp), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
