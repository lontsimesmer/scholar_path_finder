import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ForgotPassword from "@/pages/ForgotPassword";
import { LanguageContext } from "@/i18n/language";
import { en } from "@/i18n/translations/en";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
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
    mocks.resetPasswordForEmail.mockReset();
    mocks.toast.mockReset();
  });

  it("submits the request with the origin-based redirect URL and shows the generic success toast", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

    renderPage();

    fireEvent.change(screen.getByLabelText(en.forgotPassword.emailLabel), {
      target: { value: "student@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: en.forgotPassword.submitLabel }));

    await waitFor(() => {
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    });

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "student@example.com",
      expect.objectContaining({
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    );

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: en.forgotPassword.successTitle,
        description: en.forgotPassword.successDescription,
      });
    });
  }, 10_000);

  it("shows the same generic success toast when the underlying request fails, to avoid email enumeration", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: "rate limited" },
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
