"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();

  async function handleClick() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void handleClick()}>
      Sign out
    </Button>
  );
}
