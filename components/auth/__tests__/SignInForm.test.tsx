import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInForm } from "../SignInForm";
import { signIn } from "next-auth/react";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe("SignInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sign in form with email input", () => {
    render(<SignInForm />);

    expect(screen.getByText("Sign in to Warlynx")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with email/i })
    ).toBeInTheDocument();
  });

  it("renders OAuth provider buttons", () => {
    render(<SignInForm />);

    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with discord/i })
    ).toBeInTheDocument();
  });

  it("handles email sign in submission", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<SignInForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign in with email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("email", {
        email: "test@example.com",
        redirect: false,
        callbackUrl: "/dashboard",
      });
    });
  });

  it("displays success message after email sent", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<SignInForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign in with email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("displays error message on sign in failure", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: "EmailSignin" });

    render(<SignInForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign in with email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to send sign-in email/i)
      ).toBeInTheDocument();
    });
  });

  it("handles Google OAuth sign in", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<SignInForm />);

    const googleButton = screen.getByRole("button", {
      name: /sign in with google/i,
    });

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/dashboard",
      });
    });
  });

  it("handles Discord OAuth sign in", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<SignInForm />);

    const discordButton = screen.getByRole("button", {
      name: /sign in with discord/i,
    });

    fireEvent.click(discordButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("discord", {
        callbackUrl: "/dashboard",
      });
    });
  });

  it("disables form during submission", async () => {
    (signIn as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    );

    render(<SignInForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign in with email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(emailInput).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });
  });

  it("renders sign up link", () => {
    render(<SignInForm />);

    const signUpLink = screen.getByRole("link", { name: /sign up/i });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute("href", "/auth/signup");
  });
});
