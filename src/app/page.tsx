"use client";
import { useState } from "react";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";

import CloudIcon from "../components/cloud_icon";
import { useAuth } from "../context/auth_context";
import SignInOverlay from "../components/sign_in_overlay";
import UserMenu from "../components/user_menu";

import { runAzureScanDuck } from "./_lib/duckIngestion/scannerDuck";
import { useDuckDB } from "../context/db_context";
import DuckQueryConsole from "../components/duck_query_console";
import AzureSecurityGraph from "../components/azure_security_graph";
import { useDuckGraph } from "../hooks/useDuckGraph";
import { useStats } from "../hooks/useStats";
import RiskDashboard from "../components/risk_dashboard";

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

  const { db } = useDuckDB();
  const {
    data: graphData,
    loading: graphLoading,
    error: graphError,
    refresh: refreshGraph,
  } = useDuckGraph(db);
  const { stats, statsLoading, statsError, mutateStats } = useStats();
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
            const token =
              await authenticatedUser.credential.getToken("Directory.Read.All");
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
    <div className="min-h-screen w-screen flex flex-col items-center">
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
      <main className="p-4 w-full">
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

        <button
          type="button"
          className="navbar-button"
          onClick={async () => {
            if (!db) {
              console.warn("DuckDB not initialised yet");
              return;
            }

            try {
              const result = await runAzureScanDuck(
                db,
                authenticatedUser?.credential ?? null,
              );
              console.log("Scan finished", result);
              // refresh graph after new data lands
              await refreshGraph();
              await mutateStats();
            } catch (err) {
              console.error("Scan failed", err);
            }
          }}
          disabled={!db}
          title={
            signedIn && db
              ? "Run a full Azure scan and persist into DuckDB"
              : "Sign in and wait for DuckDB to load"
          }
        >
          Run Azure scan (duckdb)
        </button>

        <DuckQueryConsole />

        {/* stats / risk dashboard */}
        <section className="mt-8 w-full">
          {statsLoading && <div>Loading statistics…</div>}
          {statsError && (
            <div className="text-red-500">
              Error loading stats: {statsError.message}
            </div>
          )}
          {!statsLoading && !statsError && <RiskDashboard stats={stats} />}
        </section>

        {/* visualisation of current DuckDB contents */}
        <section className="mt-8 w-full">
          {graphError && (
            <div className="text-red-500">
              Error loading graph: {graphError.message}
            </div>
          )}
          {graphLoading && <div>Loading graph…</div>}
        </section>

        <div className="w-full">
          <AzureSecurityGraph height={600} data={graphData} />
        </div>
      </main>
    </div>
  );
}
