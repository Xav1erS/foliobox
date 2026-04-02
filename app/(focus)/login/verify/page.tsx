import { Suspense } from "react";
import { VerifyClient } from "./VerifyClient";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="h-8 w-56 rounded bg-white/10" />
        </div>
      }
    >
      <VerifyClient />
    </Suspense>
  );
}
