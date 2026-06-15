import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Pure presentational stats overview SHELL (convention 3). Ch9 fills the real
 * competition/scoring aggregates; for now it shows the physical profile + a
 * placeholder. `mode` gates sensitive data (physical notes hidden in public).
 */
export type StatsOverviewProps = {
  physical?: {
    heightCm: number | null;
    weightKg: number | null;
    physicalNotes: string | null;
  };
  mode?: "coach" | "public";
};

export function StatsOverview({ physical, mode = "coach" }: StatsOverviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fysiek profiel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>
            Lengte: {physical?.heightCm ? `${physical.heightCm} cm` : "—"}
          </p>
          <p>
            Gewicht: {physical?.weightKg ? `${physical.weightKg} kg` : "—"}
          </p>
          {mode === "coach" && physical?.physicalNotes ? (
            <p className="pt-1 text-foreground">{physical.physicalNotes}</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistieken</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Wedstrijd- en scorekaartstatistieken komen in een latere stap.
        </CardContent>
      </Card>
    </div>
  );
}
