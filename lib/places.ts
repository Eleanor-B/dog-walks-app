import { supabase } from "./supabase";

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  fenced: boolean;
  unfenced: boolean;
  part_fenced: boolean;
  bins: boolean;
  toilets: boolean;
  coffee: boolean;
  parking: boolean;
  user_id?: string;
};

// Fetch all places
export async function getPlaces(): Promise<Place[]> {
  const query = supabase.from("places").select("*").order("created_at", { ascending: false });
  const { data, error } = await query;

  // DEBUG: Supabase location fetch (no PostGIS or RPC – plain select)
  console.log("[getPlaces] Raw query:", "from('places').select('*').order('created_at', { ascending: false })");
  console.log("[getPlaces] No PostGIS or distance RPC used; query returns all rows (no lat/lng filter).");
  console.log("[getPlaces] Full response:", { data, error });
  console.log("[getPlaces] Number of results:", data?.length ?? 0);
  if (data && data.length > 0) {
    const sample = data.slice(0, 5).map((p: Place) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      latType: typeof p.lat,
      lngType: typeof p.lng,
      latRaw: JSON.stringify(p.lat),
      lngRaw: JSON.stringify(p.lng),
    }));
    console.log("[getPlaces] Sample coordinates (first 5) – check lat/lng are numbers, not swapped:", sample);
  }

  if (error) {
    console.error("Error fetching places:", error);
    return [];
  }
  return data || [];
}

// Add a new place
export async function addPlace(place: Omit<Place, "id">): Promise<Place | null> {
  const { data, error } = await supabase
    .from("places")
    .insert([place])
    .select()
    .single();

  if (error) {
    console.error("Error adding place:", error);
    return null;
  }
  return data;
}

// Update a place (only owner can update)
export async function updatePlace(id: string, updates: Partial<Omit<Place, "id">>): Promise<boolean> {
  const { error } = await supabase
    .from("places")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating place:", error);
    return false;
  }
  return true;
}

// Delete a place (only owner can delete)
export async function deletePlace(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("places")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting place:", error);
    return false;
  }
  return true;
}
