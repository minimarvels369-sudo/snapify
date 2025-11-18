import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { GeneratedImage } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';

interface RecentGenerationsProps {
  generations: GeneratedImage[];
}

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  completed: "default",
  processing: "secondary",
  pending: "outline",
  failed: "destructive",
};


export function RecentGenerations({ generations }: RecentGenerationsProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Image</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {generations.map((generation) => (
          <TableRow key={generation.id}>
            <TableCell>
              <div className="flex items-center gap-4">
                <Image
                  alt="Product image"
                  className="aspect-square rounded-md object-cover"
                  height="64"
                  src={generation.generatedImageUrls[0] || generation.originalImageUrl}
                  width="64"
                  data-ai-hint="fashion model"
                />
                <div className="font-medium">{`Image for ${generation.productId}`}</div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariantMap[generation.status]}>
                {generation.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {formatDistanceToNow(new Date(generation.createdAt), { addSuffix: true })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
