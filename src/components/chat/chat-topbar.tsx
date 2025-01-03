import React from "react";
import { ModeToggle } from "../ui/theme-toggle";
import { useRouter } from "next/router";
import { Button } from "../ui/button";

export default function ChatTopbar() {
  const router = useRouter();

  return (
    <div className="w-full h-20 flex p-4 justify-between items-center border-b">
      <Button
        onClick={() => {
          router.push("/");
          // wait and reload the page
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
      >
        Disconnect
      </Button>
      <ModeToggle />
    </div>
  );
}
