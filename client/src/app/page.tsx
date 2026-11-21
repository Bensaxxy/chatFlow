import {
  ArrowRight,
  Check,
  Globe2,
  Layers3,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

import LandingHeroScene from "@/components/landing/LandingHeroScene";
import LandingScrollEffects from "@/components/landing/LandingScrollEffects";

const features = [
  {
    icon: Zap,
    title: "Always in motion",
    description:
      "Live delivery, read receipts, reactions and typing status make every conversation feel present.",
    accent: "from-cyan-300 to-blue-500",
  },
  {
    icon: Layers3,
    title: "More than messages",
    description:
      "Share media, documents, voice notes and links in one organised, searchable space.",
    accent: "from-violet-300 to-fuchsia-500",
  },
  {
    icon: ShieldCheck,
    title: "Your space, your rules",
    description:
      "Theme your chats, manage your privacy, and keep the important moments exactly where they belong.",
    accent: "from-emerald-300 to-teal-500",
  },
];

const conversationChips = ["Plans", "People", "Ideas", "Everything in flow"];

export default function Home() {
  return (
    <LandingScrollEffects>
      <main className="min-h-dvh overflow-hidden bg-[#060b18] text-white selection:bg-cyan-300 selection:text-slate-950">
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[-34rem] h-[62rem] w-[62rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="absolute -left-56 top-[26rem] h-[38rem] w-[38rem] rounded-full bg-violet-600/15 blur-[130px]" />
          <div className="absolute -right-56 top-48 h-[34rem] w-[34rem] rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.11)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        </div>

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-lg font-black tracking-tight"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-200 via-cyan-300 to-blue-500 text-slate-950 shadow-[0_12px_30px_-10px_rgba(34,211,238,0.9)] transition duration-300 group-hover:rotate-6 group-hover:scale-105">
              <MessageCircleMore className="h-5 w-5" />
            </span>
            ChatFlow
          </Link>

          <nav className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-xl sm:gap-2" aria-label="Main navigation">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white sm:px-4"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-white px-3.5 py-2 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/30 transition hover:-translate-y-0.5 hover:bg-cyan-50 sm:px-4"
            >
              Join free
            </Link>
          </nav>
        </header>

        <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-10 lg:pb-32 lg:pt-24">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-bold text-cyan-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Messaging, reimagined for real life
            </div>

            <h1 className="mt-7 text-5xl font-black tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl xl:text-[5.4rem] xl:leading-[0.94]">
              Move your{" "}
              <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
                world
              </span>{" "}
              forward.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              A beautifully focused place for the people, plans and ideas you want to keep moving.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-200 via-cyan-300 to-cyan-400 px-6 py-3.5 font-black text-slate-950 shadow-[0_18px_40px_-14px_rgba(34,211,238,0.85)] transition hover:-translate-y-1 hover:shadow-[0_25px_50px_-14px_rgba(34,211,238,0.95)]"
              >
                Start chatting
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 font-bold text-white backdrop-blur transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08]"
              >
                I have an account
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                Free to join
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                Ready in seconds
              </span>
            </div>
          </div>

          <div data-landing-hero className="relative lg:-mr-8">
            <LandingHeroScene />
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-7 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Globe2 className="h-4 w-4 text-cyan-300" />
            Built to keep people close, wherever they are
            <div className="hidden h-px flex-1 bg-white/10 sm:block" />
            {conversationChips.map((chip) => (
              <span key={chip} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 normal-case tracking-normal text-slate-300">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-y border-slate-800 bg-[#090f1f] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(56,189,248,0.14)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative mx-auto max-w-7xl">
          <div data-landing-reveal data-landing-direction="1" className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.19em] text-cyan-300">
              Built for real connection
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
              A calm surface for the conversations that matter.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              Powerful chat tools, tucked into a beautiful experience that never gets in your way.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description, accent }, index) => (
              <div
                key={title}
                data-landing-reveal
                data-landing-direction={index % 2 === 0 ? "1" : "-1"}
              >
                <article className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/65 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.9)] backdrop-blur transition duration-300 hover:-translate-y-2 hover:border-white/20 hover:shadow-[0_30px_65px_-30px_rgba(8,145,178,0.45)]">
                  <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl transition group-hover:opacity-40`} />
                  <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-slate-950 shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="relative mt-7 text-xl font-black tracking-tight">
                    {title}
                  </h3>
                  <p className="relative mt-3 leading-7 text-slate-400">
                    {description}
                  </p>
                  <div className="relative mt-7 h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#060b18] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
        <div data-landing-reveal data-landing-direction="-1" className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/[0.1] via-slate-900/90 to-cyan-900/40 px-6 py-14 text-center shadow-[0_35px_100px_-35px_rgba(34,211,238,0.55)] backdrop-blur sm:px-12 sm:py-20">
          <div className="absolute -left-8 top-5 h-32 w-32 rounded-full border border-cyan-200/20 [transform:rotateX(60deg)_rotateZ(35deg)]" />
          <div className="absolute -right-6 bottom-0 h-48 w-48 rounded-full border border-violet-200/15 [transform:rotateX(60deg)_rotateZ(-20deg)]" />
          <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-xl shadow-cyan-400/20">
            <MessageCircleMore className="h-6 w-6" />
          </span>
          <h2 className="relative mt-6 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
            Let every conversation have somewhere to go.
          </h2>
          <p className="relative mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Join ChatFlow and make a little more room for your people, your plans, and what comes next.
          </p>
          <Link
            href="/register"
            className="relative mt-9 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-black text-slate-950 shadow-xl shadow-slate-950/30 transition hover:-translate-y-1 hover:bg-cyan-50"
          >
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#060b18] px-5 py-7 text-center text-sm text-slate-500">
        © ChatFlow. A better place to keep close.
      </footer>
      </main>
    </LandingScrollEffects>
  );
}
