"use client";

import { useEffect, useState } from "react";

import PolishForm from "@/components/PolishForm";
import { parseShareParams } from "@/lib/shareParams";

const SharePage: React.FC = () => {
  const [initialText, setInitialText] = useState<string>("");

  useEffect(() => {
    const parsed = parseShareParams(window.location.search);
    queueMicrotask(() => {
      setInitialText(parsed.sharedText);
    });

    if (window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 sm:pb-10 md:px-10 md:py-12 lg:p-24">
      <h1 className="mb-5 text-3xl font-bold sm:mb-6 sm:text-4xl">MemoPolish</h1>
      <PolishForm initialText={initialText} />
    </main>
  );
};

export default SharePage;
