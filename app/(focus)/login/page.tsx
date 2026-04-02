import { Suspense } from "react";
import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="h-8 w-56 rounded bg-white/10" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
