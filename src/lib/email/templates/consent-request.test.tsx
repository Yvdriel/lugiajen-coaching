import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { ConsentRequestEmail } from "./consent-request";

describe("ConsentRequestEmail", () => {
  it("renders the consent link and athlete name in the body", async () => {
    const link = "https://lugiajen.example/consent/abc-123";
    const html = await render(
      <ConsentRequestEmail athleteName="Mila de Vries" link={link} />,
    );
    expect(html).toContain(link);
    expect(html).toContain("Mila de Vries");
  });
});
