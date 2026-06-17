import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { AppProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "WC26 Tips",
  description: "World Cup 2026 betting tips and analysis tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <AppProvider>
          <div className="flex h-full">
            <Nav />
            <main className="flex-1 ml-56 min-h-screen overflow-y-auto">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
