import { MessageCircleMore, ShieldCheck, UsersRound, Zap } from "lucide-react";
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
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

        <Link
          href="/"
          className="relative flex items-center gap-3 text-2xl font-bold"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500">
            <MessageCircleMore className="h-6 w-6" />
          </span>
          ChatFlow
        </Link>

        <div className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Conversations that flow
          </p>

          <h2 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">
            Connect, communicate and stay close.
          </h2>

          <p className="mt-5 max-w-lg leading-7 text-slate-300">
            A modern messaging experience for private conversations and
            communities.
          </p>

          <div className="mt-10 grid gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.text}
                  className="flex items-center gap-3 text-slate-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5 text-cyan-300" />
                  </div>

                  <span>{feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-sm text-slate-400">
          Real-time communication built with the MERN stack.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-10 flex items-center gap-3 text-2xl font-bold text-slate-950 lg:hidden"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-white">
              <MessageCircleMore className="h-5 w-5" />
            </span>
            ChatFlow
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>

            <div className="mt-8">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
