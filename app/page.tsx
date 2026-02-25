import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white relative">
      {/* Ambient background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <Image
              src="/warlynx-logo.png"
              alt="Warlynx Logo"
              width={300}
              height={200}
              priority
              className="rounded-lg"
            />
          </div>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Warlynx
          </h1>
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
                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/50"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/50"
                >
                  Get Started
                </Link>
                <Link
                  href="/auth/signin"
                  className="px-8 py-4 bg-gray-800/60 hover:bg-gray-700/60 backdrop-blur-md border border-gray-700 text-white text-lg font-semibold rounded-lg transition-all"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-900/40 backdrop-blur-md border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 transition-all">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold mb-3 text-cyan-400">Create Characters</h3>
            <p className="text-gray-400">
              Design unique characters with AI-generated power sheets and custom
              artwork. Every character is one-of-a-kind.
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <div className="text-4xl mb-4">🎲</div>
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Dynamic Storytelling</h3>
            <p className="text-gray-400">
              Experience narratives that adapt to your choices. An AI Dungeon
              Master creates unique adventures for every game.
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-md border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 transition-all">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-3 text-cyan-400">Multiplayer Fun</h3>
            <p className="text-gray-400">
              Play with friends in real-time. Take turns, make choices, and
              watch your story unfold together.
            </p>
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6 mt-8">
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">1</div>
              <h4 className="font-semibold mb-2">Create a Game</h4>
              <p className="text-sm text-gray-400">
                Set up your adventure with custom rules and invite friends
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">2</div>
              <h4 className="font-semibold mb-2">Build Characters</h4>
              <p className="text-sm text-gray-400">
                Each player creates a unique character with AI assistance
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">3</div>
              <h4 className="font-semibold mb-2">Take Turns</h4>
              <p className="text-sm text-gray-400">
                Make choices and take actions in your epic adventure
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-500 mb-2">4</div>
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
