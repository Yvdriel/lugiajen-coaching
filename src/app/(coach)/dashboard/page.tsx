import Link from "next/link";
import { AthleteCard } from "@/components/display/athlete-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAthleteCards,
  getDashboardStats,
  getRecentActivity,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const [stats, cards, activity] = await Promise.all([
    getDashboardStats(),
    getAthleteCards(),
    getRecentActivity(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overzicht van je atleten en wedstrijden.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/athletes/new" className={buttonVariants()}>
            Nieuwe atleet
          </Link>
          <Link
            href="/competitions/new"
            className={buttonVariants({ variant: "outline" })}
          >
            Nieuwe wedstrijd
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Actieve atleten" value={stats.activeAthletes} />
        <StatCard
          label="Aankomende wedstrijden"
          value={stats.upcomingCompetitions}
        />
        <StatCard label="Totaal atleten" value={stats.totalAthletes} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Atleten</h2>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen atleten.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((a) => (
              <Link key={a.id} href={`/athletes/${a.id}`} className="block">
                <AthleteCard
                  firstName={a.firstName}
                  lastName={a.lastName}
                  age={a.age}
                  beltRank={a.beltRank}
                  categories={a.categories}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Recente activiteit</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen activiteit.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {activity.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium">{item.athleteName}</span>
                  <span className="text-muted-foreground"> — {item.label}</span>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {item.date.toLocaleDateString("nl-NL")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>
          <span className="font-heading text-3xl">{value}</span>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
