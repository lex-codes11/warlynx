import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignUpForm } from "../SignUpForm";
import { signIn } from "next-auth/react";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

describe("SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sign up form with email input", () => {
    render(<SignUpForm />);

    expect(
      screen.getByText("Create your Warlynx account")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up with email/i })
    ).toBeInTheDocument();
  });

  it("renders OAuth provider buttons", () => {
    render(<SignUpForm />);

    expect(
      screen.getByRole("button", { name: /sign up with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up with discord/i })
    ).toBeInTheDocument();
  });

  it("handles email sign up submission", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<SignUpForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign up with email/i,
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

    render(<SignUpForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign up with email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("displays error message on sign up failure", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: "EmailSignin" });

    render(<SignUpForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign up with email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to send sign-up email/i)
      ).toBeInTheDocument();
    });
  });

  it("handles Google OAuth sign up", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<SignUpForm />);

    const googleButton = screen.getByRole("button", {
      name: /sign up with google/i,
    });

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/dashboard",
      });
    });
  });

  it("handles Discord OAuth sign up", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<SignUpForm />);

    const discordButton = screen.getByRole("button", {
      name: /sign up with discord/i,
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

    render(<SignUpForm />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: /sign up with email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(emailInput).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });
  });

  it("renders sign in link", () => {
    render(<SignUpForm />);

    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/auth/signin");
  });

  it("displays terms of service notice", () => {
    render(<SignUpForm />);

    expect(
      screen.getByText(/by signing up, you agree to our/i)
    ).toBeInTheDocument();
  });
});
