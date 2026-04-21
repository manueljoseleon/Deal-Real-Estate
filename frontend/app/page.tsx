import { redirect } from "next/navigation";
import LandingPage from "@/app/landing/page";

interface Props {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}

export default async function RootPage({ searchParams }: Props) {
  const params = await searchParams;

  // Forward OAuth callback params to /auth/callback if they land at root
  if (params.code) {
    const qs = new URLSearchParams({ code: params.code }).toString();
    redirect(`/auth/callback?${qs}`);
  }
  if (params.error) {
    const qs = new URLSearchParams({
      error: params.error,
      ...(params.error_description ? { error_description: params.error_description } : {}),
    }).toString();
    redirect(`/auth/callback?${qs}`);
  }

  return <LandingPage />;
}
