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
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .order("created_at", { ascending: false });

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
