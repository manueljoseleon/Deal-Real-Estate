// The landing page has its own full-screen navbar — suppress the root layout header.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
