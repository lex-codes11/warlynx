import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6">Warlynx</h1>
          <p className="text-2xl text-gray-300 mb-8">
            AI-Powered Multiplayer Adventure Game
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
            Create unique characters, embark on epic adventures, and experience
            dynamic storytelling powered by AI. Every choice matters, every turn
            is unique.
          </p>
          <div className="flex gap-4 justify-center">
            {session ? (
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  href="/auth/signin"
                  className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white text-lg font-semibold rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold mb-3">Create Characters</h3>
            <p className="text-gray-400">
              Design unique characters with AI-generated power sheets and custom
              artwork. Every character is one-of-a-kind.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-4xl mb-4">🎲</div>
            <h3 className="text-xl font-semibold mb-3">Dynamic Storytelling</h3>
            <p className="text-gray-400">
              Experience narratives that adapt to your choices. An AI Dungeon
              Master creates unique adventures for every game.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-3">Multiplayer Fun</h3>
            <p className="text-gray-400">
              Play with friends in real-time. Take turns, make choices, and
              watch your story unfold together.
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6 mt-8">
            <div>
              <div className="text-3xl font-bold text-blue-500 mb-2">1</div>
              <h4 className="font-semibold mb-2">Create a Game</h4>
              <p className="text-sm text-gray-400">
                Set up your adventure with custom rules and invite friends
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-500 mb-2">2</div>
              <h4 className="font-semibold mb-2">Build Characters</h4>
              <p className="text-sm text-gray-400">
                Each player creates a unique character with AI assistance
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-500 mb-2">3</div>
              <h4 className="font-semibold mb-2">Take Turns</h4>
              <p className="text-sm text-gray-400">
                Make choices and take actions in your epic adventure
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-500 mb-2">4</div>
              <h4 className="font-semibold mb-2">Watch the Story Unfold</h4>
              <p className="text-sm text-gray-400">
                See how your choices shape the narrative in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
