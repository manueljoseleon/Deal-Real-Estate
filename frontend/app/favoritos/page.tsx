"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import PropertyCard from "@/components/properties/PropertyCard";
import type { PropertyListItem, PropertyDetail } from "@/types";

export default function FavoritosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/oportunidades");
      return;
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setFetching(false);
      return;
    }

    async function loadFavorites() {
      const supabase = createClient();
      const { data: favRows } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (!favRows || favRows.length === 0) {
        setProperties([]);
        setFetching(false);
        return;
      }

      // Fetch property details in parallel (max 20)
      const ids = favRows.slice(0, 20).map((r: { property_id: string }) => r.property_id);
      const results = await Promise.allSettled(ids.map((id: string) => api.properties.get(id)));
      const props = results
        .filter((r): r is PromiseFulfilledResult<PropertyDetail> => r.status === "fulfilled")
        .map((r) => r.value as PropertyListItem);

      setProperties(props);
      setFetching(false);
    }

    loadFavorites();
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold text-gray-900"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Mis favoritos
        </h1>
        {user && (
          <p className="text-xs text-gray-400 mt-1">{user.email}</p>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🤍</div>
          <p className="text-gray-500 text-sm mb-6">
            Aún no has guardado ninguna propiedad.
          </p>
          <Link
            href="/oportunidades"
            className="inline-block bg-teal-700 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-teal-800 transition-colors"
          >
            Ver oportunidades
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </main>
  );
}
