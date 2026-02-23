"use client";
import { useState } from "react";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";

import CloudIcon from "../components/cloud_icon";
import { InteractiveBrowserCredential } from "@azure/identity";

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

class AzureBrowserCredential {
  private credential: InteractiveBrowserCredential | null = null;
  private displayName: string | null = null;

  async signIn(clientId: string, tenantId: string) {
    this.credential = new InteractiveBrowserCredential({
      clientId,
      tenantId,
      redirectUri: window.location.href,
      loginStyle: "popup",
    });

    const token = await this.credential.getToken(
      "offline_access openid profile User.Read",
    );

    const graphClient = GraphClient.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => token?.token || "",
      },
    });

    const profile = await graphClient.api("/me").get();
    this.displayName = profile.displayName || profile.userPrincipalName;
    return this;
  }

  getCredential() {
    return this.credential;
  }

  getDisplayName() {
    return this.displayName;
  }
}

export default function Home() {
  const [clientId, setClientId] = useState<string>(
    process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
  );
  const [tenantId, setTenantId] = useState<string>(
    process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common",
  );

  const [azureCredential, setAzureCredential] =
    useState<AzureBrowserCredential | null>(null);

  const handleSignIn = async () => {
    if (!clientId && !tenantId) {
      console.warn(
        "Client ID and Tenant ID must be provided before signing in",
      );
      return;
    }

    try {
      const x = await new AzureBrowserCredential().signIn(clientId, tenantId);
      setAzureCredential(x);
      console.log("User signed in with AzureBrowserCredential", {
        displayName: x.getDisplayName(),
      });
    } catch (e) {
      console.error("Sign in failed", e);
    }
  };

  const resourceGraphQuery = async () => {
    try {
      const credential = azureCredential?.getCredential();
      if (!credential) {
        console.warn("not signed in yet");
        return;
      }
      const client = new ResourceGraphClient(credential);
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
      const credential = azureCredential?.getCredential();
      if (!credential) {
        console.warn("not signed in yet");
        return;
      }
      const client = GraphClient.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await credential.getToken("Directory.Read.All");
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
              <div className="flex flex-col text-xs">
                <label className="flex flex-col">
                  Client ID
                  <input
                    type="text"
                    className="input-field"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Azure AD App Client ID"
                  />
                </label>
                <label className="flex flex-col mt-1">
                  Tenant ID
                  <input
                    type="text"
                    className="input-field"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="Tenant ID (or 'common')"
                  />
                </label>
              </div>

              <button
                type="button"
                className="navbar-button"
                onClick={handleSignIn}
                disabled={!!azureCredential}
                title={
                  !!azureCredential
                    ? "Already connected"
                    : "Sign in with Azure InteractiveBrowserCredential"
                }
              >
                {!!azureCredential
                  ? `Connected as ${azureCredential?.getDisplayName()}`
                  : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </header>
      <main>
        <button
          type="button"
          className="navbar-button"
          onClick={resourceGraphQuery}
          disabled={!azureCredential}
          title={
            !!azureCredential
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
          disabled={!azureCredential}
          title={
            !!azureCredential
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
