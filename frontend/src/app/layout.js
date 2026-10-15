import "./globals.css";
import Navbar from "@/components/Navbar";
import { SavedReposProvider } from "@/context/SavedReposContext";
import { ToastProvider } from "@/context/ToastContext";

export const metadata = {
  title: "GitHub Repository Analytics",
  description: "Search public GitHub repositories, explore their activity, and save your favourites.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>
          <SavedReposProvider>
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          </SavedReposProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
