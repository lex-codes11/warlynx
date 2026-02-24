import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard - Warlynx",
  description: "Your Warlynx dashboard",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Redirect to sign in if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome, {session.user?.displayName || session.user?.email}!
          </h1>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600">
              Dashboard coming soon. This is where you'll see your games and
              create new ones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
