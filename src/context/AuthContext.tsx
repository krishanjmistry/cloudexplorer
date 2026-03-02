"use client";
import { createContext, useContext, useState } from "react";
import { InteractiveBrowserCredential, TokenCredential } from "@azure/identity";
import { Client as MicrosoftGraphClient } from "@microsoft/microsoft-graph-client";

export type Provider = "azure" | "aws" | "gcp";

interface UserProfile {
  displayName?: string;
  userPrincipalName?: string;
  [key: string]: unknown;
}

export type SignInOptions =
  | AzureSignInOptions
  | AwsSignInOptions
  | GcpSignInOptions;

interface AzureSignInOptions {
  provider: "azure";
  clientId: string;
  tenantId?: string;
  redirectUri: string;
}

interface AwsSignInOptions {
  provider: "aws";
  // TODO: add AWS-specific parameters here
}

interface GcpSignInOptions {
  provider: "gcp";
  // TODO: add GCP-specific parameters here
}

interface AuthState {
  signedIn: boolean;
  authenticatedUser: AuthenticatedUser | null;
  signIn: (opts: SignInOptions) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthenticatedUser {
  provider: Provider;
  credential: TokenCredential;
  profile: UserProfile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);

  const signIn = async (opts: SignInOptions) => {
    switch (opts.provider) {
      case "azure": {
        const { clientId, tenantId = "common" } = opts;
        const cred = new InteractiveBrowserCredential({
          clientId,
          tenantId,
          redirectUri: window.location.origin,
          loginStyle: "popup",
        });
        // trigger interactive flow and grab profile
        const token = await cred.getToken(
          "offline_access openid profile User.Read",
        );
        const graphClient = MicrosoftGraphClient.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => token?.token || "",
          },
        });
        const profile = await graphClient.api("/me").get();

        setAuthenticatedUser({
          provider: "azure",
          credential: cred,
          profile,
        });

        return;
      }
      case "aws": {
        // placeholder implementation – extend when you wire up AWS auth
        console.warn("AWS sign-in not implemented");
        return;
      }
      case "gcp": {
        // placeholder implementation – extend when you wire up GCP auth
        console.warn("GCP sign-in not implemented");
        return;
      }
      default: {
        // Should never happen if SignInOptions is exhaustive
        throw new Error("Unsupported provider");
      }
    }
  };

  const signOut = () => {
    setAuthenticatedUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        signedIn: !!authenticatedUser,
        authenticatedUser,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
