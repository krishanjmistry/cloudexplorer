import { useForm, useWatch } from "react-hook-form";
import { Provider, SignInOptions, useAuth } from "../context/AuthContext";

type SignInFormValues = SignInOptions;

interface SignInOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function SignInOverlay({
  visible,
  onClose,
}: SignInOverlayProps) {
  const { signIn } = useAuth();
  const { control, register, handleSubmit } = useForm<SignInFormValues>({
    defaultValues: { provider: "azure" },
  });

  const selectedProvider = useWatch({
    name: "provider",
    control,
    defaultValue: "azure",
  });

  type KeysFor<P extends Provider> = Exclude<
    keyof Extract<SignInFormValues, { provider: P }>,
    "provider"
  >;

  type FieldDef<P extends Provider> = {
    name: KeysFor<P>;
    label: string;
    placeholder?: string;
    type?: string;
    required?: boolean;
    // TODO: remove defaultValue (added as temporary hack to populate form with env vars)
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
        placeholder: "Tenant ID (or 'common')",
        defaultValue: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common",
      },
    ],
    aws: [],
    gcp: [],
  };

  const onSubmit = async (values: SignInFormValues) => {
    try {
      await signIn(values);
      onClose();
    } catch (e) {
      console.error("Sign in failed", e);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 backdrop-blur flex items-center justify-center z-30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl mb-4">Sign in</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="flex items-center gap-2 mb-4">
            Provider
            <select {...register("provider")} className="input-field">
              <option value="azure">Azure</option>
              <option value="aws">AWS (not yet)</option>
              <option value="gcp">GCP (not yet)</option>
            </select>
          </label>

          {providerFields[selectedProvider]?.map((field) => (
            <label key={field.name} className="flex flex-col mb-4">
              {field.label}
              <input
                {...register(field.name, {
                  required: field.required,
                })}
                type={field.type || "text"}
                className="input-field bg-gray-100 rounded p-1"
                placeholder={field.placeholder}
                // TODO: remove temporary hack to populate the form with default values from env vars
                value={field.defaultValue}
              />
            </label>
          ))}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="bg-gray-200 text-black rounded p-1 hover:bg-gray-400"
              onClick={onClose}
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
    </div>
  );
}
