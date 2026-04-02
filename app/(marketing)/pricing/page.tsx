import { auth } from "@/lib/auth";
import { Navbar } from "@/components/marketing/Navbar";
import { PricingClient } from "./PricingClient";

export default async function PricingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} currentPage="pricing" />
      <PricingClient isLoggedIn={isLoggedIn} />
    </>
  );
}
