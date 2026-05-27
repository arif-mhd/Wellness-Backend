"use client";

import React from "react";
import { useRouter } from "next/navigation";
import WaitingRoom from "@/components/waiting-room/WaitingRoom";

export default function WaitingRoomPage() {
  const router = useRouter();

  return (
    <WaitingRoom onClose={() => router.push("/appointments")} />
  );
}
