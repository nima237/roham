import type { Metadata } from "next";
import "./globals.css";
import { WebSocketProvider } from "./providers/WebSocketProvider";
import { ToastContainer } from "./components/NotificationSystem";
import { NotificationModalProvider } from "./providers/NotificationModalProvider";

export const metadata: Metadata = {
  title: "Your App",
  description: "Description",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/images/fav.png" />
      </head>
      <body
        className="antialiased"
      >
        <NotificationModalProvider>
          <WebSocketProvider>
            {children}
            <ToastContainer />
          </WebSocketProvider>
        </NotificationModalProvider>
      </body>
    </html>
  );
}
