import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import SignInOverlay from "./SignInOverlay";

export default function UserMenu() {
  const { authenticatedUser, signedIn, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showSignIn, setShowSignIn] = useState<boolean>(false);

  const handleToggle = () => {
    setShowMenu((v) => !v);
  };

  const handleSignOut = () => {
    signOut();
    setShowMenu(false);
  };

  // TODO: could the SignInOverlay act more like the usermenu when the user is signed in?
  if (!signedIn || !authenticatedUser) {
    return (
      <>
        <SignInOverlay
          visible={showSignIn}
          onClose={() => {
            setShowSignIn(false);
          }}
        />
        <button
          type="button"
          className="navbar-button"
          onClick={() => {
            setShowSignIn(true);
          }}
        >
          Sign in
        </button>
      </>
    );
  }

  const { provider, profile: user } = authenticatedUser;

  return (
    <div className="relative">
      <button
        type="button"
        className="navbar-button font-semibold"
        onClick={handleToggle}
      >
        Connected to {provider}
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded shadow-lg z-40 border border-gray-100 text-gray-700">
          <div className="text-sm px-4 py-3 border-b border-gray-100">
            <p>Signed in as:</p>
            <p className="font-semibold">
              {user.displayName || user.userPrincipalName}
            </p>
          </div>
          <div className="text-sm px-4 py-3 border-b border-gray-100">
            <p>Provider: {provider}</p>
          </div>
          <button
            className="text-sm px-4 py-3 w-full text-left hover:bg-gray-100"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
