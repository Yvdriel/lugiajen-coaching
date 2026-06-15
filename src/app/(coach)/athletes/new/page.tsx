import { AthleteForm } from "@/components/forms/athlete-form";
import { createAthlete } from "@/features/athletes/actions";
import { nl } from "@/messages/nl";

export default function NewAthletePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
      <h1 className="font-heading text-2xl font-semibold">{nl.athlete.new}</h1>
      <AthleteForm action={createAthlete} submitLabel={nl.athlete.new} />
    </div>
  );
}
