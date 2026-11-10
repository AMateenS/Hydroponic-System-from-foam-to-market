import "./globals.css";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import MotionProvider from "@/components/MotionProvider";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "AgroIntelliSense",
  description: "Smart hydroponic monitoring, AI plant disease detection and fresh produce store",
};

// Applies the saved theme before the page paints, so there is no light/dark flash
const themeScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <MotionProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
