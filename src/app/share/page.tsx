"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import PolishForm from "@/components/PolishForm";
import { parseShareParams } from "@/lib/shareParams";

const ShareContent: React.FC = () => {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const initialText = useMemo<string>(
    () => parseShareParams(search ? `?${search}` : "").sharedText,
    [search],
  );

  useEffect(() => {
    if (search) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, [search]);

  return <PolishForm initialText={initialText} />;
};

const SharePage: React.FC = () => {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 sm:pb-10 md:px-10 md:py-12 lg:p-24">
      <h1 className="mb-5 text-3xl font-bold sm:mb-6 sm:text-4xl">MemoPolish</h1>
      <Suspense fallback={null}>
        <ShareContent />
      </Suspense>
    </main>
  );
};

export default SharePage;
