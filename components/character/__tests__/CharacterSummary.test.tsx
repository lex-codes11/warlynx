import { render, screen, fireEvent } from "@testing-library/react";
import { CharacterSummary } from "../CharacterSummary";
import { Character } from "@/types/game-enhancements";

describe("CharacterSummary", () => {
  const mockCharacter: Character = {
    id: "char-1",
    gameId: "game-1",
    userId: "user-1",
    name: "Test Hero",
    fusionIngredients: "",
    description: "A brave warrior with a mysterious past",
    abilities: ["Super Strength", "Lightning Speed", "Tactical Mind"],
    weakness: "Overconfident in battle",
    alignment: "Lawful Good",
    archetype: "Warrior",
    tags: ["hero", "warrior"],
    powerSheet: {
      level: 5,
      hp: 80,
      maxHp: 100,
      attributes: {
        strength: 18,
        agility: 14,
        intelligence: 12,
        charisma: 10,
        endurance: 16,
      },
      abilities: [],
      weakness: "Overconfident",
      statuses: [],
      perks: [],
    },
    imageUrl: "https://example.com/hero.jpg",
    imagePrompt: "A brave warrior",
    isReady: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOnEdit = jest.fn();
  const mockOnReady = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders character summary with all information", () => {
    render(
      <CharacterSummary
        character={mockCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    // Check title
    expect(screen.getByText("Character Summary")).toBeInTheDocument();

    // Check name
    expect(screen.getByText("Test Hero")).toBeInTheDocument();

    // Check description
    expect(
      screen.getByText("A brave warrior with a mysterious past")
    ).toBeInTheDocument();

    // Check abilities
    expect(screen.getByText("Super Strength")).toBeInTheDocument();
    expect(screen.getByText("Lightning Speed")).toBeInTheDocument();
    expect(screen.getByText("Tactical Mind")).toBeInTheDocument();

    // Check weakness
    expect(screen.getByText("Overconfident in battle")).toBeInTheDocument();

    // Check stats
    expect(screen.getByText("80 / 100")).toBeInTheDocument(); // HP
    expect(screen.getByText("5")).toBeInTheDocument(); // Level
  });

  it("displays character image when imageUrl is provided", () => {
    render(
      <CharacterSummary
        character={mockCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    const image = screen.getByAltText("Test Hero");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/hero.jpg");
  });

  it("calls onEdit when edit button is clicked", () => {
    render(
      <CharacterSummary
        character={mockCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    const editButton = screen.getByText("Edit Character");
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it("calls onReady when ready button is clicked", () => {
    render(
      <CharacterSummary
        character={mockCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    const readyButton = screen.getByText("I'm Ready!");
    fireEvent.click(readyButton);

    expect(mockOnReady).toHaveBeenCalledTimes(1);
  });

  it("disables edit button when character is ready", () => {
    const readyCharacter = { ...mockCharacter, isReady: true };

    render(
      <CharacterSummary
        character={readyCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    const editButton = screen.getByText("Edit Character");
    expect(editButton).toBeDisabled();

    // Ready button should not be visible
    expect(screen.queryByText("I'm Ready!")).not.toBeInTheDocument();
  });

  it("shows ready state indicator when character is ready", () => {
    const readyCharacter = { ...mockCharacter, isReady: true };

    render(
      <CharacterSummary
        character={readyCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    // Check for ready indicator
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(
      screen.getByText("You're ready! Waiting for other players...")
    ).toBeInTheDocument();
  });

  it("disables edit button when isEditable is false", () => {
    render(
      <CharacterSummary
        character={mockCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
        isEditable={false}
      />
    );

    const editButton = screen.getByText("Edit Character");
    expect(editButton).toBeDisabled();
  });

  it("displays all character attributes", () => {
    render(
      <CharacterSummary
        character={mockCharacter}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    // Check attributes
    expect(screen.getByText(/Strength:/)).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText(/Agility:/)).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText(/Intelligence:/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/Charisma:/)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/Endurance:/)).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("handles character with no abilities gracefully", () => {
    const characterNoAbilities = { ...mockCharacter, abilities: [] };

    render(
      <CharacterSummary
        character={characterNoAbilities}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    expect(screen.getByText("No abilities generated")).toBeInTheDocument();
  });

  it("handles character with no weakness gracefully", () => {
    const characterNoWeakness = { ...mockCharacter, weakness: "" };

    render(
      <CharacterSummary
        character={characterNoWeakness}
        onEdit={mockOnEdit}
        onReady={mockOnReady}
      />
    );

    expect(screen.getByText("No weaknesses generated")).toBeInTheDocument();
  });
});
