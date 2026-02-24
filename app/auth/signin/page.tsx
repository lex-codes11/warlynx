import { SignInForm } from "@/components/auth/SignInForm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign In - Warlynx",
  description: "Sign in to your Warlynx account",
};

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  // Redirect to dashboard if already signed in
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SignInForm />
    </div>
  );
}
