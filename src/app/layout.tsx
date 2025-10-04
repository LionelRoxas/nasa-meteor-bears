import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NASA Meteor Bears - Asteroid Impact Visualization",
  description: "Island Polar Bears - NASA Space Apps Hackathon - Interactive 3D asteroid visualization tool with real-time impact modeling",
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
