import { getMessages } from "@/i18n/server";

/**
 * Shown on the public portal when an under-16 athlete has no recorded parental
 * consent (AVG/GDPR). Reveals no athlete data — just a neutral notice.
 */
export async function PortalBlocked() {
  const nl = await getMessages();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {nl.app.name}
      </p>
      <h1 className="font-heading text-xl font-semibold">
        {nl.portal.blockedTitle}
      </h1>
      <p className="text-sm text-muted-foreground">{nl.portal.blockedBody}</p>
    </div>
  );
}
