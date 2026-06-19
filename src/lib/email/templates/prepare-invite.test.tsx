import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { PrepareInviteEmail } from "./prepare-invite";

describe("PrepareInviteEmail", () => {
  const link = "https://lugiajen.example/feedback/prepare/abc-123";

  it("renders the prepare link in the body", async () => {
    const html = await render(
      <PrepareInviteEmail
        athleteName="Mila"
        link={link}
        meetingNumber={2}
        isReminder={false}
      />,
    );
    expect(html).toContain(link);
    expect(html).toContain("Mila");
  });

  it("uses reminder copy when isReminder", async () => {
    const html = await render(
      <PrepareInviteEmail
        athleteName="Mila"
        link={link}
        meetingNumber={1}
        isReminder
      />,
    );
    expect(html).toContain("herinnering"); // "Kleine herinnering…"
  });
});
