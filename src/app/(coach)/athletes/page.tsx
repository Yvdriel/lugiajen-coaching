import Link from "next/link";
import { AthleteFilters } from "@/components/athletes/athlete-filters";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AthleteListFilters,
  type AthleteSort,
  getAthletesList,
  getDistinctBelts,
} from "@/lib/queries/athletes";
import { nl } from "@/messages/nl";

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? sp[k] : undefined);

  const [athletes, belts] = await Promise.all([
    getAthletesList({
      q: str("q"),
      active: str("active") as AthleteListFilters["active"],
      belt: str("belt"),
      category: str("category"),
      sort: str("sort") as AthleteSort | undefined,
    }),
    getDistinctBelts(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">
          {nl.athletes.title}
        </h1>
        <Link href="/athletes/new" className={buttonVariants()}>
          {nl.athlete.new}
        </Link>
      </header>

      <AthleteFilters belts={belts} />

      {athletes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{nl.athletes.empty}</p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{nl.athletes.columns.name}</TableHead>
                <TableHead>{nl.athletes.columns.age}</TableHead>
                <TableHead>{nl.athletes.columns.category}</TableHead>
                <TableHead>{nl.athletes.columns.belt}</TableHead>
                <TableHead>{nl.athletes.columns.lastFeedback}</TableHead>
                <TableHead className="text-right">
                  {nl.athletes.columns.competitions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {athletes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link
                      href={`/athletes/${a.id}`}
                      className="font-medium hover:underline"
                    >
                      {a.firstName} {a.lastName}
                    </Link>
                    {!a.isActive ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({nl.athlete.inactive.toLowerCase()})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{a.age}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.categories.map((c) => (
                        <Badge key={c} variant="secondary">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{a.beltRank}</TableCell>
                  <TableCell>{a.lastFeedbackDate ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {a.competitionCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
