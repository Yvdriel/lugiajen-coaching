import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConsentForm } from "@/components/forms/consent-form";
import {
  AVG_AP_URL,
  PRIVACY_POLICY_URL,
} from "@/features/athletes/consent";
import { submitConsent } from "@/features/athletes/consent-actions";
import { getAthleteByConsentToken } from "@/lib/queries/athletes";
import { getMessages } from "@/i18n/server";

// Dynamic + never indexed: the token lives in the URL and the page is one-shot.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
      {children}
    </main>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const nl = await getMessages();
  const c = nl.consent.page;
  const athlete = await getAthleteByConsentToken(token);

  if (!athlete) {
    return (
      <Shell>
        <Notice text={c.invalid} />
      </Shell>
    );
  }
  // Consent recorded (just now, or earlier) → thank-you card. Checked before expiry
  // so a consented parent always lands here, never on an "expired" notice.
  if (athlete.parentalConsentAt) {
    return (
      <Shell>
        <div className="flex flex-col gap-1 rounded-lg border border-emerald-600/40 bg-emerald-600/10 p-5 text-center">
          <p className="font-heading text-lg font-semibold">{c.submitted}</p>
          <p className="text-sm text-muted-foreground">{c.submittedHint}</p>
        </div>
      </Shell>
    );
  }
  if (
    !athlete.consentTokenExpiresAt ||
    athlete.consentTokenExpiresAt < new Date()
  ) {
    return (
      <Shell>
        <Notice text={c.expired} />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {nl.app.name}
        </p>
        <h1 className="font-heading text-2xl font-semibold">{c.title}</h1>
        <p className="text-sm text-muted-foreground">
          {c.intro} {athlete.firstName} {athlete.lastName}.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <Block title={c.dataTitle} body={c.data} />
        <Block title={c.whyTitle} body={c.why} />
        <Block title={c.whoTitle} body={c.who} />
        <Block title={c.rightsTitle} body={c.rights} />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{c.linksTitle}</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>
              <a
                className="underline"
                href={AVG_AP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.apLink}
              </a>
            </li>
            {PRIVACY_POLICY_URL !== "#" ? (
              <li>
                <a
                  className="underline"
                  href={PRIVACY_POLICY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.privacyLink}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <ConsentForm action={submitConsent.bind(null, token)} />
    </Shell>
  );
}
