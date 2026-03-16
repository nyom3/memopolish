import PolishForm from "@/components/PolishForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 sm:pb-10 md:px-10 md:py-12 lg:p-24">
      <h1 className="mb-5 text-3xl font-bold sm:mb-6 sm:text-4xl">MemoPolish</h1>
      <PolishForm />
    </main>
  );
}
