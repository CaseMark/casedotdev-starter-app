/**
 * Auth Layout
 *
 * Minimal layout for authentication pages (login, signup, etc.)
 * No navigation or footer - just centered content
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
