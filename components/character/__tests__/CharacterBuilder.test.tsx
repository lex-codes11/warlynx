import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CharacterBuilder } from "../CharacterBuilder";

// Mock fetch
global.fetch = jest.fn();

describe("CharacterBuilder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Form Rendering", () => {
    it("renders all required form fields", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fusion ingredients/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/abilities/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/weakness/i)).toBeInTheDocument();
    });

    it("renders optional fields", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      expect(screen.getByLabelText(/alignment/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/archetype/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    });

    it("renders exactly 3 ability inputs initially", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      const abilityInputs = screen.getAllByPlaceholderText(/ability \d+/i);
      expect(abilityInputs).toHaveLength(3);
    });

    it("shows character count for text inputs", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      expect(screen.getByText(/0\/100 characters/i)).toBeInTheDocument(); // name
      expect(screen.getByText(/0\/200/i)).toBeInTheDocument(); // fusion ingredients
      expect(screen.getByText(/0\/500 characters/i)).toBeInTheDocument(); // description
    });
  });

  describe("Form Validation", () => {
    it("displays validation errors from API", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Validation failed",
          details: ["name is required", "abilities must contain 3-6 items"],
        }),
      });

      render(<CharacterBuilder gameId="test-game-id" />);

      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(
          screen.getByText(/abilities must contain 3-6 items/i)
        ).toBeInTheDocument();
      });
    });

    it("displays generic error message", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Failed to create character",
        }),
      });

      render(<CharacterBuilder gameId="test-game-id" />);

      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to create character/i)
        ).toBeInTheDocument();
      });
    });

    it("clears errors when user types", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Validation failed",
          details: ["name is required"],
        }),
      });

      render(<CharacterBuilder gameId="test-game-id" />);

      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i);
      fireEvent.change(nameInput, { target: { value: "Test Character" } });

      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
    });
  });

  describe("Ability Management", () => {
    it("allows adding abilities up to 6", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      const addButton = screen.getByRole("button", { name: /add ability/i });

      // Add 3 more abilities (already have 3)
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      const abilityInputs = screen.getAllByPlaceholderText(/ability \d+/i);
      expect(abilityInputs).toHaveLength(6);

      // Button should disappear after reaching 6
      expect(
        screen.queryByRole("button", { name: /add ability/i })
      ).not.toBeInTheDocument();
    });

    it("allows removing abilities down to 3", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      // Add one more ability
      const addButton = screen.getByRole("button", { name: /add ability/i });
      fireEvent.click(addButton);

      let abilityInputs = screen.getAllByPlaceholderText(/ability \d+/i);
      expect(abilityInputs).toHaveLength(4);

      // Remove one ability
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      abilityInputs = screen.getAllByPlaceholderText(/ability \d+/i);
      expect(abilityInputs).toHaveLength(3);
    });

    it("does not show remove button when only 3 abilities", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      expect(
        screen.queryByRole("button", { name: /remove/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Tag Management", () => {
    it("allows adding tags", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      const addButton = screen.getByRole("button", { name: /^add$/i });

      fireEvent.change(tagInput, { target: { value: "fire" } });
      fireEvent.click(addButton);

      expect(screen.getByText("fire")).toBeInTheDocument();
    });

    it("allows adding tags with Enter key", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      const tagInput = screen.getByPlaceholderText(/add a tag/i);

      fireEvent.change(tagInput, { target: { value: "water" } });
      fireEvent.keyPress(tagInput, { key: "Enter", code: "Enter" });

      expect(screen.getByText("water")).toBeInTheDocument();
    });

    it("allows removing tags", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      const addButton = screen.getByRole("button", { name: /^add$/i });

      fireEvent.change(tagInput, { target: { value: "electric" } });
      fireEvent.click(addButton);

      expect(screen.getByText("electric")).toBeInTheDocument();

      const removeButton = screen.getByText("×");
      fireEvent.click(removeButton);

      expect(screen.queryByText("electric")).not.toBeInTheDocument();
    });

    it("prevents duplicate tags", () => {
      render(<CharacterBuilder gameId="test-game-id" />);

      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      const addButton = screen.getByRole("button", { name: /^add$/i });

      fireEvent.change(tagInput, { target: { value: "flying" } });
      fireEvent.click(addButton);

      fireEvent.change(tagInput, { target: { value: "flying" } });
      fireEvent.click(addButton);

      const tags = screen.getAllByText("flying");
      expect(tags).toHaveLength(1);
    });
  });

  describe("Character Creation", () => {
    it("submits form with all data", async () => {
      const mockCharacter = {
        id: "char-123",
        name: "Test Character",
        fusionIngredients: "A + B + C",
        description: "Test description",
        abilities: ["Ability 1", "Ability 2", "Ability 3"],
        weakness: "Test weakness",
        alignment: "Neutral",
        archetype: "Tank",
        tags: ["tag1"],
        imageUrl: "https://example.com/image.jpg",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          character: mockCharacter,
        }),
      });

      render(<CharacterBuilder gameId="test-game-id" />);

      // Fill in form
      fireEvent.change(screen.getByLabelText(/character name/i), {
        target: { value: "Test Character" },
      });
      fireEvent.change(screen.getByLabelText(/fusion ingredients/i), {
        target: { value: "A + B + C" },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: "Test description" },
      });

      const abilityInputs = screen.getAllByPlaceholderText(/ability \d+/i);
      fireEvent.change(abilityInputs[0], { target: { value: "Ability 1" } });
      fireEvent.change(abilityInputs[1], { target: { value: "Ability 2" } });
      fireEvent.change(abilityInputs[2], { target: { value: "Ability 3" } });

      fireEvent.change(screen.getByLabelText(/weakness/i), {
        target: { value: "Test weakness" },
      });
      fireEvent.change(screen.getByLabelText(/alignment/i), {
        target: { value: "Neutral" },
      });
      fireEvent.change(screen.getByLabelText(/archetype/i), {
        target: { value: "Tank" },
      });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/characters/create",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: expect.stringContaining("Test Character"),
          })
        );
      });
    });

    it("preserves input on failure (Requirement 4.8)", async () => {
      const preservedData = {
        name: "Test Character",
        fusionIngredients: "A + B",
        description: "Test",
        abilities: ["A1", "A2", "A3"],
        weakness: "Weak",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Failed to generate image",
          preservedInput: preservedData,
        }),
      });

      render(<CharacterBuilder gameId="test-game-id" />);

      // Fill in form
      fireEvent.change(screen.getByLabelText(/character name/i), {
        target: { value: "Test Character" },
      });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/character name/i)).toHaveValue(
          "Test Character"
        );
      });
    });
  });

  describe("Character Preview", () => {
    it("shows character preview after creation", async () => {
      const mockCharacter = {
        id: "char-123",
        name: "Test Character",
        fusionIngredients: "A + B + C",
        description: "Test description",
        abilities: ["Ability 1", "Ability 2", "Ability 3"],
        weakness: "Test weakness",
        imageUrl: "https://example.com/image.jpg",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          character: mockCharacter,
        }),
      });

      render(<CharacterBuilder gameId="test-game-id" />);

      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Character Created!")).toBeInTheDocument();
        expect(screen.getByAltText("Test Character")).toBeInTheDocument();
        expect(screen.getByText("Test description")).toBeInTheDocument();
      });
    });

    it("shows regenerate button in preview", async () => {
      const mockCharacter = {
        id: "char-123",
        name: "Test Character",
        imageUrl: "https://example.com/image.jpg",
        fusionIngredients: "A + B",
        description: "Test",
        abilities: ["A1"],
        weakness: "Weak",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          character: mockCharacter,
        }),
      });

      render(<CharacterBuilder gameId="test-game-id" />);

      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /regenerate image/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Image Regeneration", () => {
    it("regenerates character image", async () => {
      const mockCharacter = {
        id: "char-123",
        name: "Test Character",
        imageUrl: "https://example.com/image.jpg",
        fusionIngredients: "A + B",
        description: "Test",
        abilities: ["A1"],
        weakness: "Weak",
      };

      const updatedCharacter = {
        ...mockCharacter,
        imageUrl: "https://example.com/new-image.jpg",
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            character: mockCharacter,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            character: updatedCharacter,
          }),
        });

      render(<CharacterBuilder gameId="test-game-id" />);

      // Create character
      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByAltText("Test Character")).toHaveAttribute(
          "src",
          "https://example.com/image.jpg"
        );
      });

      // Regenerate image
      const regenerateButton = screen.getByRole("button", {
        name: /regenerate image/i,
      });
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/characters/char-123/regenerate-image",
          expect.objectContaining({
            method: "POST",
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByAltText("Test Character")).toHaveAttribute(
          "src",
          "https://example.com/new-image.jpg"
        );
      });
    });

    it("displays rate limit error", async () => {
      const mockCharacter = {
        id: "char-123",
        name: "Test Character",
        imageUrl: "https://example.com/image.jpg",
        fusionIngredients: "A + B",
        description: "Test",
        abilities: ["A1"],
        weakness: "Weak",
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            character: mockCharacter,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({
            success: false,
            error: "Rate limit exceeded",
            details: "Please wait before regenerating again.",
          }),
        });

      render(<CharacterBuilder gameId="test-game-id" />);

      // Create character
      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByAltText("Test Character")).toBeInTheDocument();
      });

      // Try to regenerate
      const regenerateButton = screen.getByRole("button", {
        name: /regenerate image/i,
      });
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please wait before regenerating again/i)
        ).toBeInTheDocument();
      });
    });

    it("shows loading state during regeneration", async () => {
      const mockCharacter = {
        id: "char-123",
        name: "Test Character",
        imageUrl: "https://example.com/image.jpg",
        fusionIngredients: "A + B",
        description: "Test",
        abilities: ["A1"],
        weakness: "Weak",
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            character: mockCharacter,
          }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      success: true,
                      character: mockCharacter,
                    }),
                  }),
                100
              )
            )
        );

      render(<CharacterBuilder gameId="test-game-id" />);

      // Create character
      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByAltText("Test Character")).toBeInTheDocument();
      });

      // Regenerate image
      const regenerateButton = screen.getByRole("button", {
        name: /regenerate image/i,
      });
      fireEvent.click(regenerateButton);

      expect(screen.getByText(/regenerating\.\.\./i)).toBeInTheDocument();
    });
  });

  describe("Callback", () => {
    it("calls onCharacterCreated callback", async () => {
      const mockCharacter = {
        id: "char-123",
        name: "Test Character",
        imageUrl: "https://example.com/image.jpg",
        fusionIngredients: "A + B",
        description: "Test",
        abilities: ["A1"],
        weakness: "Weak",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          character: mockCharacter,
        }),
      });

      const onCharacterCreated = jest.fn();
      render(
        <CharacterBuilder
          gameId="test-game-id"
          onCharacterCreated={onCharacterCreated}
        />
      );

      const submitButton = screen.getByRole("button", {
        name: /create character/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onCharacterCreated).toHaveBeenCalledWith(mockCharacter);
      });
    });
  });
});
