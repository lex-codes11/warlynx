import { render, screen, fireEvent } from "@testing-library/react";
import { AuthButtons } from "../AuthButtons";
import { signIn, signOut } from "next-auth/react";
import { Session } from "next-auth";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

describe("AuthButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when user is not authenticated", () => {
    it("renders login button when session is null", () => {
      render(<AuthButtons session={null} />);

      const loginButton = screen.getByRole("button", { name: /login/i });
      expect(loginButton).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
    });

    it("calls signIn when login button is clicked", () => {
      render(<AuthButtons session={null} />);

      const loginButton = screen.getByRole("button", { name: /login/i });
      fireEvent.click(loginButton);

      expect(signIn).toHaveBeenCalledTimes(1);
      expect(signOut).not.toHaveBeenCalled();
    });
  });

  describe("when user is authenticated", () => {
    const mockSession: Session = {
      user: {
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
      },
      expires: "2024-12-31",
    };

    it("renders logout button when session exists", () => {
      render(<AuthButtons session={mockSession} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /login/i })).not.toBeInTheDocument();
    });

    it("calls signOut when logout button is clicked", () => {
      render(<AuthButtons session={mockSession} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      expect(signOut).toHaveBeenCalledTimes(1);
      expect(signIn).not.toHaveBeenCalled();
    });
  });
});
