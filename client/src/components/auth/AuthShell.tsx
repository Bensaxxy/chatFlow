import {
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

const features = [
  {
    icon: MessageCircleMore,
    text: "Send messages in real time",
  },
  {
    icon: UsersRound,
    text: "Connect privately or in groups",
  },
  {
    icon: Zap,
    text: "Receive instant updates",
  },
  {
    icon: ShieldCheck,
    text: "Keep your conversations secure",
  },
];

export default function AuthShell({
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#060b18] text-white lg:grid lg:grid-cols-[0.96fr_1.04fr]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-38rem] h-[58rem] w-[58rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[130px]" />
        <div className="absolute -bottom-52 -right-52 h-[36rem] w-[36rem] rounded-full bg-violet-600/15 blur-[130px]" />
      </div>

      <section className="relative hidden overflow-hidden border-r border-white/10 bg-slate-950/35 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

        <div className="pointer-events-none absolute -left-36 top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-violet-500/15 blur-[110px]" />

        <Link
          href="/"
          className="relative flex items-center gap-3 text-2xl font-black tracking-tight"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-200 via-cyan-300 to-blue-500 text-slate-950 shadow-[0_12px_30px_-10px_rgba(34,211,238,0.9)]">
            <MessageCircleMore className="h-5 w-5" />
          </span>
          ChatFlow
        </Link>

        <div className="relative max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            Your space, in flow
          </p>

          <h2 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.055em] xl:text-5xl">
            Keep your world moving, together.
          </h2>

          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
            A focused home for every person, plan and idea you want to keep close.
          </p>

          <div className="mt-10 grid gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.text}
                  className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5 text-slate-200 backdrop-blur transition hover:border-cyan-200/20 hover:bg-white/[0.07]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300 transition group-hover:scale-105 group-hover:bg-cyan-300/15">
                    <Icon className="h-5 w-5 text-cyan-300" />
                  </div>

                  <span className="font-medium">{feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-sm text-slate-400">
          Clear conversations, wherever life takes you.
        </p>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="w-full max-w-md py-4">
          <Link
            href="/"
            className="mb-8 flex items-center gap-3 text-2xl font-black tracking-tight lg:hidden"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-200 via-cyan-300 to-blue-500 text-slate-950 shadow-[0_12px_30px_-10px_rgba(34,211,238,0.9)]">
              <MessageCircleMore className="h-5 w-5" />
            </span>
            ChatFlow
          </Link>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/70 p-6 shadow-[0_30px_90px_-35px_rgba(34,211,238,0.45)] backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative">
              <div className="mb-6 h-px w-16 bg-gradient-to-r from-cyan-200 via-cyan-300 to-transparent" />
              <h1 className="text-3xl font-black tracking-[-0.045em] text-white">
              {title}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {description}
              </p>

              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
