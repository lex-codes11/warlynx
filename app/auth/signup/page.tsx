import { SignUpForm } from "@/components/auth/SignUpForm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign Up - Warlynx",
  description: "Create your Warlynx account",
};

export default async function SignUpPage() {
  const session = await getServerSession(authOptions);

  // Redirect to dashboard if already signed in
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SignUpForm />
    </div>
  );
}
