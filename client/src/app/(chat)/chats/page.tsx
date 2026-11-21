import { MessageCircleMore, Search, Sparkles } from "lucide-react";

export default function ChatsPage() {
  return (
    <main className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-[var(--chat-app)] p-5 text-[var(--chat-text)] sm:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-teal-100/70 blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl text-center">
        <div className="rounded-[2rem] border border-[var(--chat-border)] bg-[var(--chat-surface)] px-6 py-10 shadow-2xl shadow-slate-900/10 backdrop-blur sm:px-10 sm:py-12">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-3xl bg-cyan-200/70 rotate-6" />
            <span className="absolute inset-1 rounded-3xl bg-blue-100 -rotate-6" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--chat-sent)] text-white shadow-lg shadow-slate-900/20">
              <MessageCircleMore className="h-8 w-8" />
            </span>
          </div>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--chat-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--chat-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Your private chat space
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--chat-text)] sm:text-4xl">
            Ready for your next conversation?
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--chat-muted)] sm:text-base">
            Find someone using the search field on the left, then start a
            conversation that stays in sync in real time.
          </p>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-control)] px-4 py-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
                <Search className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-semibold text-[var(--chat-text)]">
                Find a person
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
                Use the people search to begin a direct chat.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-sent)] px-4 py-4 text-white shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <MessageCircleMore className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-semibold">Stay connected</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Messages, attachments, and reactions all stay together here.
              </p>
            </div>
          </div>

          <p className="mt-7 text-xs text-[var(--chat-muted)]">
            Your conversations will appear here once you start chatting.
          </p>
        </div>
      </section>
    </main>
  );
}
