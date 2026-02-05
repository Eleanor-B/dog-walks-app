import { supabase } from "./supabase";

export type Note = {
  id: string;
  place_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

// Get user's note for a specific place
export async function getNote(userId: string, placeId: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .eq("place_id", placeId)
    .single();

  if (error) {
    return null;
  }
  return data;
}

// Get all notes for a user
export async function getUserNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
  return data || [];
}

// Save or update a note
export async function saveNote(userId: string, placeId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from("notes")
    .upsert(
      { user_id: userId, place_id: placeId, content, updated_at: new Date().toISOString() },
      { onConflict: "user_id,place_id" }
    );

  if (error) {
    console.error("Error saving note:", error);
    return false;
  }
  return true;
}

// Delete a note
export async function deleteNote(userId: string, placeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("user_id", userId)
    .eq("place_id", placeId);

  if (error) {
    console.error("Error deleting note:", error);
    return false;
  }
  return true;
}
