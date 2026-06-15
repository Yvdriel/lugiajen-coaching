import { notFound } from "next/navigation";
import { AthleteForm } from "@/components/forms/athlete-form";
import { updateAthlete } from "@/features/athletes/actions";
import { getAthleteById } from "@/lib/queries/athletes";
import { nl } from "@/messages/nl";

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAthleteById(id);
  if (!a) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
      <h1 className="font-heading text-2xl font-semibold">{nl.athlete.edit}</h1>
      <AthleteForm
        action={updateAthlete}
        athleteId={a.id}
        submitLabel={nl.common.save}
        defaultValues={{
          firstName: a.firstName,
          lastName: a.lastName,
          dateOfBirth: a.dateOfBirth,
          gender: a.gender,
          beltRank: a.beltRank,
          yearsTraining: String(a.yearsTraining),
          yearsCompeting: a.yearsCompeting != null ? String(a.yearsCompeting) : "",
          heightCm: a.heightCm != null ? String(a.heightCm) : "",
          weightKg: a.weightKg != null ? String(a.weightKg) : "",
          notes: a.notes ?? "",
          physicalNotes: a.physicalNotes ?? "",
          isActive: a.isActive,
        }}
      />
    </div>
  );
}
