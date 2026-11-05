import { Logo } from "@/components/ui";

export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="text-sm text-stone-600">Comprove que sua área está livre de desmatamento após 2020.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
