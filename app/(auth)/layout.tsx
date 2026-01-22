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
  return <>{children}</>;
}
