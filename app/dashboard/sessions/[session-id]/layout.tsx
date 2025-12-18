import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Session Replay | Navlens",
  description: "Watch session replay",
};

export default function SessionReplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
