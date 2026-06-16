import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMessages } from "@/i18n/server";
import type { Category } from "@/lib/categories";

/**
 * Pure presentational athlete card (convention 3): data via props + `mode`.
 * Renders no link/edit affordances — parents wrap it (e.g. in <Link>).
 */
export type AthleteCardProps = {
  firstName: string;
  lastName: string;
  age: number;
  beltRank: string;
  categories: Category[];
  isActive?: boolean;
  mode?: "coach" | "public";
};

export async function AthleteCard({
  firstName,
  lastName,
  age,
  beltRank,
  categories,
  isActive = true,
  mode = "coach",
}: AthleteCardProps) {
  const nl = await getMessages();
  return (
    <Card className="h-full transition-colors hover:bg-accent/40">
      <CardHeader>
        <CardTitle>
          <span className="font-heading text-base">
            {firstName} {lastName}
          </span>
        </CardTitle>
        <CardDescription>
          {age} {nl.common.year} · {beltRank}
          {mode === "coach" && !isActive ? " · inactief" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1">
        {categories.map((c) => (
          <Badge key={c} variant="secondary">
            {c}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
