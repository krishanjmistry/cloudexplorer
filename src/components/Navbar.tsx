import CloudIcon from "./graph-icons/CloudIcon";
import UserMenu from "./UserMenu";

export default function Navbar() {
  return (
    <header className="w-full sticky top-0 z-30">
      <div className="bg-gray-300 shadow-sm px-4 py-3 flex items-center">
        <div className="flex items-center gap-4">
          <CloudIcon className="w-12 h-12" aria-hidden="true" />
          <div className="text-2xl font-mono font-bold">cloudexplorer</div>
        </div>
        <div className="flex items-center ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
