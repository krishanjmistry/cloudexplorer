import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { UserIcon } from "./graph-icons/UserIcon";
import { useForm, useWatch } from "react-hook-form";
import { Provider, SignInOptions } from "../context/AuthContext";

type KeysFor<P extends Provider> = Exclude<
  keyof Extract<SignInOptions, { provider: P }>,
  "provider"
>;

type FieldDef<P extends Provider> = {
  name: KeysFor<P>;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
};

const providerFields: { [P in Provider]: Array<FieldDef<P>> } = {
  azure: [
    {
      name: "clientId",
      label: "Client ID",
      placeholder: "Azure AD App Client ID",
      required: true,
      defaultValue: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || undefined,
    },
    {
      name: "tenantId",
      label: "Tenant ID",
      placeholder: "Tenant ID",
      defaultValue: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || undefined,
    },
  ],
  aws: [],
  gcp: [],
};

export default function UserMenu() {
  const { authenticatedUser, signedIn, signOut, signIn } = useAuth();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { control, register, handleSubmit } = useForm<SignInOptions>({
    defaultValues: { provider: "azure" },
  });

  const selectedProvider = useWatch({
    name: "provider",
    control,
    defaultValue: "azure",
  });

  const handleToggle = () => {
    setShowMenu((v) => !v);
  };

  const handleSignInSubmit = async (values: SignInOptions) => {
    try {
      await signIn(values);
      setShowMenu(false);
    } catch (e) {
      console.error("Sign in failed", e);
    }
  };

  const handleSignOut = () => {
    signOut();
    setShowMenu(false);
  };

  useEffect(() => {
    if (!showMenu) {
      return;
    }
    const onClickOutside = (e: MouseEvent) => {
      if (e.button !== 0) {
        return;
      }
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    const onScroll = (e: Event) => {
      // ignore scrolls inside the menu container
      if (
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      setShowMenu(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [showMenu]);

  const navbarButtonBaseStyles =
    "text-sm px-1 py-1 bg-white text-black disabled:opacity-50 hover:bg-gray-100 rounded";

  if (!signedIn || !authenticatedUser) {
    return (
      <>
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 pointer-events-none -z-10 ${showMenu ? "opacity-30" : "opacity-0"}`}
        />
        <div className="relative" ref={containerRef}>
          <button
            type="button"
            className={`${navbarButtonBaseStyles} font-mono flex items-center gap-1 relative`}
            onClick={handleToggle}
          >
            <UserIcon className="w-6 h-6 hidden sm:inline" />
            <span className="px-2">Sign in</span>
          </button>
          <div
            className={`text-sm absolute right-0 mt-1 bg-white rounded shadow-lg border border-gray-100 text-gray-700 font-mono px-3 py-3 min-w-[36ch] transform origin-top-right transition-all duration-150 ${
              showMenu
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <form onSubmit={handleSubmit(handleSignInSubmit)}>
              <label className="flex flex-col mb-4">
                <span className="font-semibold">Provider</span>
                <select
                  {...register("provider")}
                  className="input-field bg-gray-100 p-1 rounded"
                >
                  <option value="azure">Azure</option>
                  <option value="aws">AWS (not yet)</option>
                  <option value="gcp">GCP (not yet)</option>
                </select>
              </label>
              <a
                href="https://github.com/krishanjmistry/cloudexplorer?tab=readme-ov-file#configuring-sign-in"
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-4 text-xs"
              >
                <p className="mb-4 text-xs text-gray-600">
                  <strong>First time?</strong>
                  <br /> See how to configure sign-in <strong>here</strong>
                </p>
              </a>
              {providerFields[selectedProvider]?.map((field) => (
                <label key={field.name} className="flex flex-col mb-4">
                  <span className="font-semibold">{field.label}</span>
                  <input
                    {...register(field.name, { required: field.required })}
                    type={field.type || "text"}
                    className="input-field bg-gray-100 rounded p-1 min-w-[37ch]"
                    placeholder={field.placeholder}
                    value={field.defaultValue}
                  />
                </label>
              ))}
              <button
                type="submit"
                className="bg-black text-white rounded p-1 hover:bg-gray-800 w-full"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const { provider, profile: user } = authenticatedUser;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 pointer-events-none -z-10 ${showMenu ? "opacity-30" : "opacity-0"}`}
      />
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          className={`${navbarButtonBaseStyles} font-mono flex items-center gap-1`}
          onClick={handleToggle}
        >
          <UserIcon className="w-6 h-6" />
          <span className="hidden sm:inline px-2">Connected to {provider}</span>
        </button>
        <div
          className={`text-sm absolute right-0 mt-1 w-48 bg-white rounded shadow-lg border border-gray-100 text-gray-700 font-mono transform origin-top-right transition-all duration-150 ${
            showMenu
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
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
      </div>
    </>
  );
}
