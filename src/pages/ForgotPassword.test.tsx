import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ForgotPassword from "@/pages/ForgotPassword";
import { LanguageContext } from "@/i18n/language";
import { en } from "@/i18n/translations/en";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <LanguageContext.Provider
        value={{ language: "en", setLanguage: () => {}, t: en }}
      >
        <ForgotPassword />
      </LanguageContext.Provider>
    </MemoryRouter>,
  );

describe("ForgotPassword", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.toast.mockReset();
  });

  it("invokes send-password-reset with the email and origin-based redirect URL, then shows the generic success toast", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

    renderPage();

    fireEvent.change(screen.getByLabelText(en.forgotPassword.emailLabel), {
      target: { value: "student@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: en.forgotPassword.submitLabel }));

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledTimes(1);
    });

    expect(mocks.invoke).toHaveBeenCalledWith(
      "send-password-reset",
      expect.objectContaining({
        body: expect.objectContaining({
          email: "student@example.com",
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      }),
    );

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: en.forgotPassword.successTitle,
        description: en.forgotPassword.successDescription,
      });
    });
  }, 10_000);

  it("shows the same generic success toast when the edge function returns an error, to avoid email enumeration", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "internal server error" },
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(en.forgotPassword.emailLabel), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: en.forgotPassword.submitLabel }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: en.forgotPassword.successTitle,
        description: en.forgotPassword.successDescription,
      });
    });

    const destructiveCall = mocks.toast.mock.calls.find(
      ([payload]) => payload && (payload as { variant?: string }).variant === "destructive",
    );
    expect(destructiveCall).toBeUndefined();
  }, 10_000);
});
