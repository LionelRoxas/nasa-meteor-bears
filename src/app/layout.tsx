import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NASA Meteor Bears",
  description: "Island Polar Bears - NASA Space Apps Hackathon - Interactive meteor visualization tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
