import { supabase } from "./supabase";

// Get user's favourite place IDs
export async function getFavourites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("favourites")
    .select("place_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching favourites:", error);
    return [];
  }
  return data?.map((f) => f.place_id) || [];
}

// Add a favourite
export async function addFavourite(userId: string, placeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("favourites")
    .insert([{ user_id: userId, place_id: placeId }]);

  if (error) {
    console.error("Error adding favourite:", error);
    return false;
  }
  return true;
}

// Remove a favourite
export async function removeFavourite(userId: string, placeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", userId)
    .eq("place_id", placeId);

  if (error) {
    console.error("Error removing favourite:", error);
    return false;
  }
  return true;
}

// Clear all favourites for a user
export async function removeAllFavourites(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error clearing favourites:", error);
    return false;
  }
  return true;
}
