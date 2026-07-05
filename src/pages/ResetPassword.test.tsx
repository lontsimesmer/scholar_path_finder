import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ResetPassword from "@/pages/ResetPassword";
import { LanguageContext } from "@/i18n/language";
import { en } from "@/i18n/translations/en";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  toast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageContext.Provider
        value={{ language: "en", setLanguage: () => {}, t: en }}
      >
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </LanguageContext.Provider>
    </MemoryRouter>,
  );

describe("ResetPassword", () => {
  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset();
    mocks.updateUser.mockReset();
    mocks.signOut.mockReset();
    mocks.toast.mockReset();
  });

  it("shows the invalid state when no code is present in the URL", async () => {
    renderAt("/reset-password");

    await waitFor(() => {
      expect(screen.getByText(en.resetPassword.invalidTitle)).toBeInTheDocument();
    });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  }, 10_000);

  it("shows the invalid state when the code exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "invalid grant" },
    });

    renderAt("/reset-password?code=bad");

    await waitFor(() => {
      expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("bad");
    });
    await waitFor(() => {
      expect(screen.getByText(en.resetPassword.invalidTitle)).toBeInTheDocument();
    });
  }, 10_000);

  it("reveals the password form after a successful code exchange, updates the password, signs the user out and redirects to login", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mocks.updateUser.mockResolvedValueOnce({ error: null });
    mocks.signOut.mockResolvedValueOnce({ error: null });

    renderAt("/reset-password?code=good");

    await waitFor(() => {
      expect(screen.getByLabelText(en.resetPassword.newPasswordLabel)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(en.resetPassword.newPasswordLabel), {
      target: { value: "brandnewpass123" },
    });
    fireEvent.change(screen.getByLabelText(en.resetPassword.confirmPasswordLabel), {
      target: { value: "brandnewpass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: en.resetPassword.submitLabel }));

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ password: "brandnewpass123" });
    });
    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText("login-page")).toBeInTheDocument();
    });
    expect(mocks.toast).toHaveBeenCalledWith({
      title: en.resetPassword.successTitle,
      description: en.resetPassword.successDescription,
    });
  }, 15_000);

  it("shows a destructive toast and keeps the form when passwords do not match", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({ error: null });

    renderAt("/reset-password?code=good");

    await waitFor(() => {
      expect(screen.getByLabelText(en.resetPassword.newPasswordLabel)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(en.resetPassword.newPasswordLabel), {
      target: { value: "abcdefgh" },
    });
    fireEvent.change(screen.getByLabelText(en.resetPassword.confirmPasswordLabel), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: en.resetPassword.submitLabel }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: en.security.errorMismatch,
        }),
      );
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  }, 10_000);
});
