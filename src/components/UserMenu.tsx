import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import SignInOverlay from "./SignInOverlay";
import { UserIcon } from "./graph-icons/UserIcon";

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
          className="navbar-button font-mono flex items-center gap-1"
          onClick={() => {
            setShowSignIn(true);
          }}
        >
          <UserIcon className="w-6 h-6 hidden sm:inline" />
          <span className="px-2">Sign in</span>
        </button>
      </>
    );
  }

  const { provider, profile: user } = authenticatedUser;

  return (
    <div className="relative">
      <button
        type="button"
        className="navbar-button font-mono flex items-center gap-1"
        onClick={handleToggle}
      >
        <UserIcon className="w-6 h-6" />
        <span className="hidden sm:inline px-2">Connected to {provider}</span>
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded shadow-lg z-40 border border-gray-100 text-gray-700 font-mono">
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
