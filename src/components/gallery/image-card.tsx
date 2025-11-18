import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Download, Trash2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GeneratedImage } from "@/lib/types";
import { format } from "date-fns";

interface ImageCardProps {
  image: GeneratedImage;
}

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  completed: "default",
  processing: "secondary",
  pending: "outline",
  failed: "destructive",
};

export function ImageCard({ image }: ImageCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-medium">{image.productId}</CardTitle>
          <CardDescription>{format(new Date(image.createdAt), "PPP")}</CardDescription>
        </div>
         <Badge variant={statusVariantMap[image.status]} className="capitalize">{image.status}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="aspect-[2/3] w-full overflow-hidden">
          <Image
            alt={`Generated image for ${image.productId}`}
            className="object-cover w-full h-full transition-transform hover:scale-105"
            height={1200}
            src={image.generatedImageUrls[0] || image.originalImageUrl}
            width={800}
            data-ai-hint="fashion model"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-4">
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy ID</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
