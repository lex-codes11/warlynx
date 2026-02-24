/**
 * Unit tests for CharacterCreationForm component
 * Tests character limit, counter display, and AI generation integration
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CharacterCreationForm } from "../CharacterCreationForm";
import * as attributeGenerator from "@/lib/ai/attribute-generator";

// Mock the attribute generator
jest.mock("@/lib/ai/attribute-generator");

describe("CharacterCreationForm", () => {
  const mockOnCharacterCreated = jest.fn();
  const mockGameId = "test-game-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Character Description Input", () => {
    it("should render description textarea with character counter", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      expect(textarea).toBeInTheDocument();

      // Check character counter displays (Requirement 12.2)
      expect(screen.getByText(/0 \/ 1000 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/1000 remaining/i)).toBeInTheDocument();
    });

    it("should update character counter as user types", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      const testText = "A brave warrior with a mysterious past";

      fireEvent.change(textarea, { target: { value: testText } });

      // Check counter updates (Requirement 12.2)
      expect(
        screen.getByText(`${testText.length} / 1000 characters`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(`${1000 - testText.length} remaining`)
      ).toBeInTheDocument();
    });

    it("should enforce 1000 character limit", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(
        /character description/i
      ) as HTMLTextAreaElement;
      const longText = "a".repeat(1500); // Exceeds limit

      fireEvent.change(textarea, { target: { value: longText } });

      // Should only accept 1000 characters (Requirement 12.1, 12.3)
      expect(textarea.value.length).toBe(1000);
      expect(screen.getByText(/1000 \/ 1000 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/0 remaining/i)).toBeInTheDocument();
    });

    it("should truncate pasted text exceeding 1000 characters", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(
        /character description/i
      ) as HTMLTextAreaElement;
      const longText = "b".repeat(1500);

      // Simulate paste event (Requirement 12.4)
      const clipboardData = {
        getData: jest.fn(() => longText),
      };

      fireEvent.paste(textarea, {
        clipboardData,
      });

      // Should truncate to 1000 characters
      expect(textarea.value.length).toBe(1000);
    });

    it("should show warning color when approaching character limit", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      const nearLimitText = "a".repeat(950); // 50 remaining

      fireEvent.change(textarea, { target: { value: nearLimitText } });

      const remainingText = screen.getByText(/50 remaining/i);
      expect(remainingText).toHaveClass("text-orange-600");
    });
  });

  describe("AI Attribute Generation", () => {
    it("should show generate button when description is provided", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      fireEvent.change(textarea, {
        target: { value: "A mysterious wizard" },
      });

      const generateButton = screen.getByRole("button", {
        name: /generate abilities & weaknesses/i,
      });
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toBeDisabled();
    });

    it("should disable generate button when description is empty", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate abilities & weaknesses/i,
      });
      expect(generateButton).toBeDisabled();
    });

    it("should show loading state during AI generation", async () => {
      const mockGenerate = jest
        .spyOn(attributeGenerator, "generateAttributes")
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    success: true,
                    abilities: ["Magic spells", "Teleportation"],
                    weaknesses: ["Physical weakness"],
                  }),
                100
              )
            )
        );

      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      fireEvent.change(textarea, {
        target: { value: "A mysterious wizard" },
      });

      const generateButton = screen.getByRole("button", {
        name: /generate abilities & weaknesses/i,
      });
      fireEvent.click(generateButton);

      // Should show loading state
      expect(
        screen.getByText(/generating attributes/i)
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(mockGenerate).toHaveBeenCalledWith("A mysterious wizard");
      });
    });

    it("should display generated abilities and weaknesses as read-only", async () => {
      const mockGenerate = jest
        .spyOn(attributeGenerator, "generateAttributes")
        .mockResolvedValue({
          success: true,
          abilities: ["Fireball spell", "Teleportation", "Mind reading"],
          weaknesses: ["Physical weakness", "Mana dependency"],
        });

      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      fireEvent.change(textarea, {
        target: { value: "A powerful wizard" },
      });

      const generateButton = screen.getByRole("button", {
        name: /generate abilities & weaknesses/i,
      });
      fireEvent.click(generateButton);

      // Wait for generation to complete
      await waitFor(() => {
        expect(screen.getByText(/generated abilities/i)).toBeInTheDocument();
      });

      // Check abilities are displayed (Requirement 2.4)
      expect(screen.getByText("Fireball spell")).toBeInTheDocument();
      expect(screen.getByText("Teleportation")).toBeInTheDocument();
      expect(screen.getByText("Mind reading")).toBeInTheDocument();

      // Check weaknesses are displayed (Requirement 2.4)
      expect(screen.getByText("Physical weakness")).toBeInTheDocument();
      expect(screen.getByText("Mana dependency")).toBeInTheDocument();

      // Verify no manual input fields for abilities/weaknesses (Requirement 2.4)
      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(1); // Only description textarea
    });

    it("should show error message when generation fails", async () => {
      const mockGenerate = jest
        .spyOn(attributeGenerator, "generateAttributes")
        .mockResolvedValue({
          success: false,
          abilities: [],
          weaknesses: [],
          error: "AI service unavailable",
        });

      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      fireEvent.change(textarea, {
        target: { value: "A mysterious wizard" },
      });

      const generateButton = screen.getByRole("button", {
        name: /generate abilities & weaknesses/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/ai service unavailable/i)).toBeInTheDocument();
      });
    });

    it("should allow regenerating attributes", async () => {
      const mockGenerate = jest
        .spyOn(attributeGenerator, "generateAttributes")
        .mockResolvedValue({
          success: true,
          abilities: ["Ability 1"],
          weaknesses: ["Weakness 1"],
        });

      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      fireEvent.change(textarea, { target: { value: "A wizard" } });

      const generateButton = screen.getByRole("button", {
        name: /generate abilities & weaknesses/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/generated abilities/i)).toBeInTheDocument();
      });

      // Should show regenerate button
      const regenerateButton = screen.getByRole("button", {
        name: /regenerate attributes/i,
      });
      expect(regenerateButton).toBeInTheDocument();

      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(mockGenerate).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Form Submission", () => {
    it("should not allow submission before generating attributes", () => {
      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      fireEvent.change(textarea, { target: { value: "A wizard" } });

      // Submit button should not be visible before generation
      expect(
        screen.queryByRole("button", { name: /create character/i })
      ).not.toBeInTheDocument();
    });

    it("should show submit button after successful generation", async () => {
      const mockGenerate = jest
        .spyOn(attributeGenerator, "generateAttributes")
        .mockResolvedValue({
          success: true,
          abilities: ["Ability 1"],
          weaknesses: ["Weakness 1"],
        });

      render(
        <CharacterCreationForm
          gameId={mockGameId}
          onCharacterCreated={mockOnCharacterCreated}
        />
      );

      const textarea = screen.getByLabelText(/character description/i);
      fireEvent.change(textarea, { target: { value: "A wizard" } });

      const generateButton = screen.getByRole("button", {
        name: /generate abilities & weaknesses/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/generated abilities/i)).toBeInTheDocument();
      });

      // Submit button should now be visible
      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });
});
