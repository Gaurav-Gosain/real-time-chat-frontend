import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-[100svh] w-screen">
      <Button onClick={() => router.push("/chat")}>Connect to server</Button>
    </div>
  );
}
