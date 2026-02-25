"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateGamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    maxPlayers: 4,
    difficultyCurve: "medium" as "easy" | "medium" | "hard" | "brutal",
    toneTags: [] as string[],
    houseRules: "",
  });
  const [tagInput, setTagInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/games/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to create game");
      }

      router.push(`/game/${data.game.id}/lobby`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.toneTags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        toneTags: [...formData.toneTags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      toneTags: formData.toneTags.filter((t) => t !== tag),
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white py-12 relative">
      {/* Ambient background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="max-w-2xl mx-auto px-4 relative z-10">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Create New Game
        </h1>

        <form onSubmit={handleSubmit} className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Game Name *
            </label>
            <input
              type="text"
              id="name"
              required
              maxLength={100}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Epic Adventure"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="maxPlayers"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Max Players *
            </label>
            <select
              id="maxPlayers"
              value={formData.maxPlayers}
              onChange={(e) =>
                setFormData({ ...formData, maxPlayers: Number(e.target.value) })
              }
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} players
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="difficultyCurve"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Difficulty
            </label>
            <select
              id="difficultyCurve"
              value={formData.difficultyCurve}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  difficultyCurve: e.target.value as "easy" | "medium" | "hard" | "brutal",
                })
              }
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="brutal">Brutal</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tone Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                maxLength={30}
                className="flex-1 px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., dark, humorous, epic"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 rounded-md transition-all"
              >
                Add
              </button>
            </div>
            {formData.toneTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.toneTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-cyan-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="houseRules"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              House Rules
            </label>
            <textarea
              id="houseRules"
              value={formData.houseRules}
              onChange={(e) =>
                setFormData({ ...formData, houseRules: e.target.value })
              }
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Any special rules or guidelines for this game..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-cyan-500/50"
            >
              {loading ? "Creating..." : "Create Game"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-800/60 border border-gray-700 text-gray-300 font-medium rounded-md hover:bg-gray-700/60 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
