"use client";

import { useState } from "react";
import { X, SignOut } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";

type Props = {
  userEmail: string;
  onClose: () => void;
  onLogout: () => void;
};

export default function AccountSettings({ userEmail, onClose, onLogout }: Props) {
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canDelete = deleteInput.trim().toUpperCase() === "DELETE";

  const handleDeleteAccount = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Delete user's data first (places, favourites)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Delete user's favourites
        await supabase.from("favourites").delete().eq("user_id", user.id);
        
        // Delete user's places
        await supabase.from("places").delete().eq("user_id", user.id);
      }

      // Sign out (full account deletion requires server-side admin API)
      await supabase.auth.signOut();
      
      // Redirect to home
      window.location.href = "/";
    } catch (err) {
      setDeleteError("Something went wrong. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="settings-modal">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3>Account</h3>
          <button onClick={onClose} className="close-btn" style={{ margin: 0 }}>
            <X size={22} />
          </button>
        </div>

        {/* User info */}
        <div className="settings-user-info">
          <span>Signed in as</span>
          <strong>{userEmail}</strong>
        </div>

        {/* Log out */}
        <button
          className="btn-secondary"
          onClick={onLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <SignOut size={18} weight="bold" />
          Log out
        </button>

        {/* Delete Account Section */}
        <div className="delete-account-section">
          {!showDeleteSection ? (
            <button
              className="btn-text"
              onClick={() => setShowDeleteSection(true)}
              style={{ color: "#c53030", fontSize: 13 }}
            >
              Delete my account
            </button>
          ) : (
            <>
              <p>
                This will permanently delete your account, all your places, and your favourites. This cannot be undone.
              </p>
              <p style={{ fontWeight: 500, color: "#333", marginBottom: 8 }}>
                Type <strong style={{ color: "#c53030" }}>DELETE</strong> to confirm
              </p>
              <input
                type="text"
                className="delete-confirm-input"
                placeholder="Type DELETE"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                autoFocus
              />

              {deleteError && (
                <p style={{ color: "#c53030", fontSize: 13, marginBottom: 8 }}>{deleteError}</p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowDeleteSection(false);
                    setDeleteInput("");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={!canDelete || isDeleting}
                  style={{ flex: 1 }}
                >
                  {isDeleting ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
