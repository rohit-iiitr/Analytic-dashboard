import Link from "next/link";
import { StatusMessage } from "@/components/StatusMessage";

export default function NotFound() {
  return (
    <StatusMessage
      title="Page not found"
      message="The page you are looking for doesn't exist."
      action={
        <Link href="/" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          Go to search
        </Link>
      }
    />
  );
}
