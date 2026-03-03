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

  if (!signedIn || !authenticatedUser) {
    return (
      <>
        <div className="relative" ref={containerRef}>
          <button
            type="button"
            className="navbar-button font-mono flex items-center gap-1 relative"
            onClick={handleToggle}
          >
            <UserIcon className="w-6 h-6 hidden sm:inline" />
            <span className="px-2">Sign in</span>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 bg-black opacity-30 -z-10" />
              <div className="text-sm absolute right-0 mt-1 bg-white rounded shadow-lg border border-gray-100 text-gray-700 font-mono px-3 py-3 min-w-[36ch]">
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

                  <div className="grid grid-cols-2 gap-2">
                    {/* TODO: do we need cancel button */}
                    <button
                      type="button"
                      className="bg-gray-200 text-black rounded p-1 hover:bg-gray-400"
                      onClick={() => setShowMenu(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-black text-white rounded p-1 hover:bg-gray-800"
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  const { provider, profile: user } = authenticatedUser;

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          className="navbar-button font-mono flex items-center gap-1"
          onClick={handleToggle}
        >
          <UserIcon className="w-6 h-6" />
          <span className="hidden sm:inline px-2">Connected to {provider}</span>
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 bg-black opacity-30 -z-10" />
            <div className="text-sm absolute right-0 mt-1 w-48 bg-white rounded shadow-lg border border-gray-100 text-gray-700 font-mono">
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
          </>
        )}
      </div>
    </>
  );
}
