import { notFound } from "next/navigation";
import { AthleteForm } from "@/components/forms/athlete-form";
import { updateAthlete } from "@/features/athletes/actions";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";
import { getAthleteById } from "@/lib/queries/athletes";

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const { id } = await params;
  const a = await getAthleteById(id);
  if (!a) notFound();

  const p = nl.athlete.privacy;
  const consentLine = a.parentalConsentAt
    ? `${p.consentGivenOn} ${formatDate(a.parentalConsentAt, locale)}${
        a.parentalConsentName ? ` — ${p.consentBy} ${a.parentalConsentName}` : ""
      }`
    : p.consentNotGiven;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
      <h1 className="font-heading text-2xl font-semibold">{nl.athlete.edit}</h1>
      <AthleteForm
        action={updateAthlete}
        athleteId={a.id}
        submitLabel={nl.common.save}
        consentLine={consentLine}
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
          contactEmail: a.contactEmail ?? "",
          isActive: a.isActive,
        }}
      />
    </div>
  );
}
