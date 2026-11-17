import {
  ArrowRight,
  CheckCircle2,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Zap,
    title: "Feel instantly connected",
    description:
      "Real-time messages, typing indicators, and delivery updates keep every conversation in motion.",
  },
  {
    icon: ShieldCheck,
    title: "Keep conversations yours",
    description:
      "Built-in read receipts and message controls give you clarity without the clutter.",
  },
  {
    icon: Sparkles,
    title: "Made for everyday chats",
    description:
      "A calm, focused space for quick check-ins, ideas, and the conversations that matter.",
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-slate-950 text-white">
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] overflow-hidden">
          <div className="absolute left-1/2 top-[-340px] h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="absolute right-[-180px] top-44 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute left-[-160px] top-80 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
              <MessageCircleMore className="h-5 w-5" />
            </span>
            ChatFlow
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white sm:px-4">
              Log in
            </Link>
            <Link href="/register" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 sm:px-5">
              Get started
            </Link>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-10 lg:pb-28 lg:pt-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Conversations that keep up with you
            </div>

            <h1 className="mt-7 text-5xl font-bold tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Say more. <span className="text-cyan-300">Stay close.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              ChatFlow gives your everyday conversations a faster, more thoughtful place to happen.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 font-bold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-300">
                Start chatting
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                I already have an account
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-5 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                Free to join
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                Ready in seconds
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-cyan-400/20 blur-3xl" />
            <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-slate-900/85 p-3 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-medium text-slate-400">ChatFlow</span>
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-sm font-bold text-slate-950">
                    AO
                  </div>
                  <div>
                    <p className="font-semibold text-white">Amina Okafor</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      Online now
                    </p>
                  </div>
                </div>

                <div className="space-y-4 py-6 text-sm">
                  <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-white/10 px-4 py-3 text-slate-100">
                    Hey! Are we still on for our call at 3?
                  </div>
                  <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-cyan-400 px-4 py-3 text-slate-950">
                    Absolutely. I&apos;ll send the notes before then.
                  </div>
                  <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-white/10 px-4 py-3 text-slate-100">
                    Perfect — looking forward to it! ✨
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                  Amina is typing<span className="animate-pulse">...</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="border-y border-slate-200 bg-slate-50 text-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">Designed for connection</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to keep a conversation moving.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 via-slate-900 to-blue-600/20 px-6 py-14 text-center shadow-2xl sm:px-12">
          <MessageCircleMore className="mx-auto h-10 w-10 text-cyan-300" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Your next conversation starts here.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-300">Join ChatFlow and make room for the people, plans, and ideas that matter most.</p>
          <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50">
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 px-5 py-6 text-center text-sm text-slate-500">
        © ChatFlow. A simpler way to stay in touch.
      </footer>
    </main>
  );
}
