"use client";

import {
  CheckCheck,
  Heart,
  LockKeyhole,
  Mic,
  Paperclip,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import { useState, type CSSProperties, type PointerEvent } from "react";

interface TiltState {
  rotateX: number;
  rotateY: number;
}

const initialTilt: TiltState = {
  rotateX: 0,
  rotateY: 0,
};

const avatarClassNames = [
  "from-cyan-300 to-blue-500",
  "from-violet-300 to-fuchsia-500",
  "from-amber-200 to-orange-500",
];

export default function LandingHeroScene() {
  const [tilt, setTilt] = useState<TiltState>(initialTilt);

  const handlePointerMove = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (event.pointerType === "touch") {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

    setTilt({
      rotateX: offsetY * -8,
      rotateY: offsetX * 10,
    });
  };

  const sceneStyle: CSSProperties = {
    transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt(initialTilt)}
      className="group relative mx-auto w-full max-w-[37rem] select-none [perspective:1500px]"
      aria-label="Preview of ChatFlow messaging"
      role="img"
    >
      <div className="absolute left-[8%] top-[6%] h-[78%] w-[78%] rounded-full border border-cyan-200/20 [transform:rotateX(64deg)_rotateZ(-18deg)]" />
      <div className="absolute left-[16%] top-[19%] h-[58%] w-[58%] rounded-full border border-violet-300/20 [transform:rotateX(64deg)_rotateZ(24deg)]" />
      <div className="absolute inset-x-[15%] bottom-[3%] h-16 rounded-[100%] bg-cyan-500/25 blur-3xl" />

      <div
        style={sceneStyle}
        className="relative aspect-square transform-gpu transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none"
      >
        <div className="absolute inset-[10%] rounded-[2.5rem] border border-white/15 bg-slate-950/70 shadow-[0_35px_90px_-25px_rgba(8,145,178,0.65)] backdrop-blur-xl [transform:translateZ(-30px)_rotateZ(-6deg)]" />

        <div className="absolute inset-x-[13%] top-[12%] bottom-[9%] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-900/95 shadow-2xl shadow-slate-950/70 [transform:translateZ(22px)_rotateZ(-5deg)]">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-200 to-blue-500 text-[10px] font-black text-slate-950">
                AO
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">Amina Okafor</p>
                <p className="text-[10px] text-cyan-200">Online now</p>
              </div>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="space-y-3 px-4 py-5 text-[11px] leading-4">
            <div className="w-fit max-w-[82%] rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2.5 text-slate-100 shadow-sm">
              The launch flow looks really good. ✨
            </div>
            <div className="ml-auto flex max-w-[84%] items-end gap-1.5">
              <div className="rounded-2xl rounded-tr-sm bg-cyan-300 px-3 py-2.5 font-medium text-slate-950 shadow-lg shadow-cyan-400/15">
                It&apos;s live. I&apos;ll send you the final notes.
              </div>
              <CheckCheck className="mb-1 h-3.5 w-3.5 shrink-0 text-cyan-300" />
            </div>
            <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-slate-100">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-300 text-slate-950">
                <Mic className="h-3 w-3" />
              </span>
              <span className="h-1 w-16 rounded-full bg-white/30" />
              <span className="text-[9px] text-slate-300">0:12</span>
            </div>
          </div>

          <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-slate-400">
            <Paperclip className="h-3.5 w-3.5" />
            <span className="flex-1 text-[10px]">Write a message</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
              <SendHorizontal className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        <div className="absolute -left-[2%] top-[22%] w-36 rounded-2xl border border-white/20 bg-white/90 p-3 text-slate-900 shadow-[0_20px_40px_-16px_rgba(15,23,42,0.65)] backdrop-blur [transform:translateZ(68px)_rotateZ(8deg)] transition-transform duration-500 group-hover:[transform:translateZ(86px)_rotateZ(8deg)] motion-reduce:transition-none">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-500">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="text-[10px] font-bold">Reactions</span>
          </div>
          <div className="mt-2 flex -space-x-1.5">
            {avatarClassNames.map((className, index) => (
              <span
                key={className}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-[8px] font-bold text-slate-950 ${className}`}
              >
                {index === 0 ? "A" : index === 1 ? "J" : "T"}
              </span>
            ))}
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[8px] font-bold text-slate-600">
              +8
            </span>
          </div>
        </div>

        <div className="absolute -right-[1%] bottom-[16%] w-40 rounded-2xl border border-cyan-200/25 bg-cyan-400/90 p-3 text-slate-950 shadow-[0_20px_45px_-18px_rgba(34,211,238,0.8)] [transform:translateZ(76px)_rotateZ(-7deg)] transition-transform duration-500 group-hover:[transform:translateZ(98px)_rotateZ(-7deg)] motion-reduce:transition-none">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/10">
              <LockKeyhole className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[10px] font-black">Private by design</p>
              <p className="mt-0.5 text-[9px] font-medium text-slate-800/75">
                Your space, your pace.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute right-[8%] top-[5%] flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-violet-400/80 text-white shadow-xl shadow-violet-500/25 [transform:translateZ(90px)_rotateZ(14deg)] animate-[landing-float_5s_ease-in-out_infinite] motion-reduce:animate-none">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="absolute bottom-[2%] left-[30%] h-10 w-28 rounded-full border border-white/20 bg-white/10 blur-[1px] [transform:translateZ(20px)_rotateZ(-4deg)]" />
      </div>
    </div>
  );
}
