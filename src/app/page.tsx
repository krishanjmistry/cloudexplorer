"use client";
import { useState } from "react";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";

import CloudIcon from "../components/cloud_icon";
import { useAuth } from "../context/auth_context";
import SignInOverlay from "../components/sign_in_overlay";
import UserMenu from "../components/user_menu";

// TODO: verify this actually works
export function headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin-allow-popups",
        },
      ],
    },
  ];
}

export default function Home() {
  const { signedIn, authenticatedUser } = useAuth();

  const [showSignIn, setShowSignIn] = useState<boolean>(false);

  const resourceGraphQuery = async () => {
    try {
      if (!authenticatedUser) {
        console.warn("not signed in yet");
        return;
      }
      const client = new ResourceGraphClient(authenticatedUser.credential);
      client
        .resources({
          query: "resources",
        })
        .then((response) => {
          console.log("Azure Resource Graph response", response);
        })
        .catch((err) => {
          console.error("Azure Resource Graph query failed", err);
        });
    } catch (e) {
      console.error("Azure call failed", e);
    }
  };

  const msGraphQuery = async () => {
    try {
      if (!authenticatedUser) {
        console.warn("not signed in yet");
        return;
      }
      const client = GraphClient.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await authenticatedUser.credential.getToken("Directory.Read.All");
            return token?.token || "";
          },
        },
      });

      const users = await client.api("/directoryObjects/getByIds").post({
        ids: ["00000002-0000-0000-c000-000000000000"],
        types: ["User", "ServicePrincipal", "Group", "Application"],
      });
      console.log("Microsoft Graph /directoryObjects/getByIds response", users);
    } catch (e) {
      console.error("Microsoft Graph call failed", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
      <SignInOverlay
        visible={showSignIn && !signedIn}
        onClose={() => setShowSignIn(false)}
      />
      <header className="w-full sticky top-0 z-30">
        <div className="bg-gray-300 shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CloudIcon className="w-12 h-12" aria-hidden="true" />
              <div className="text-2xl">cloudexplorer</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {signedIn ? (
                <UserMenu />
              ) : (
                <button
                  type="button"
                  className="navbar-button"
                  onClick={() => setShowSignIn(true)}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="p-4">
        <button
          type="button"
          className="navbar-button"
          onClick={resourceGraphQuery}
          disabled={!signedIn}
          title={
            signedIn
              ? "Call Azure Management API and log result"
              : "Sign in first"
          }
        >
          Resource Graph Query
        </button>

        <button
          type="button"
          className="navbar-button"
          onClick={msGraphQuery}
          disabled={!signedIn}
          title={
            signedIn
              ? "Call Microsoft Graph API and log result"
              : "Sign in first"
          }
        >
          AAD Query
        </button>
      </main>
    </div>
  );
}
