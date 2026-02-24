export const metadata = {
  title: "Check Your Email - Warlynx",
  description: "Verify your email to sign in",
};

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Check your email
          </h2>
          <p className="text-gray-600 mb-4">
            A sign-in link has been sent to your email address.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to sign in to your account. The link
            will expire in 24 hours.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> If you don't see the email, check your spam
              folder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
