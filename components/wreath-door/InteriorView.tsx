"use client";

import { motion } from "framer-motion";
import type { InteriorImage } from "./types";

interface InteriorViewProps {
  interior?: InteriorImage;
  /** Run the firelight flicker. Off while the door is shut, to save battery. */
  active: boolean;
  reducedMotion: boolean;
}

/**
 * The room seen through the doorway: the shop's interior photo in soft focus,
 * with a warm flickering firelight wash on top. Without a photo it shows a
 * simple blurred stand-in (warm glow, tree lights, mantel).
 */
export function InteriorView({ interior, active, reducedMotion }: InteriorViewProps) {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#1a120c]">
      {interior ? (
        <img
          src={interior.src}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full scale-[1.08] object-cover [filter:blur(2.5px)_saturate(1.05)_brightness(0.92)]"
          style={{ objectPosition: interior.position ?? "50% 50%" }}
        />
      ) : (
        <PlaceholderRoom />
      )}

      {/* Firelight: a warm wash from low down that breathes like a real fire. */}
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(120% 70% at 30% 92%, rgba(255,150,60,0.55), rgba(255,120,40,0.18) 45%, transparent 70%)",
        }}
        initial={{ opacity: 0.75 }}
        animate={
          active && !reducedMotion
            ? { opacity: [0.75, 1, 0.82, 0.95, 0.7, 0.9, 0.75] }
            : { opacity: 0.8 }
        }
        transition={active && !reducedMotion ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      />

      {/* Depth: the jambs and ceiling of the doorway fall into shadow. */}
      <div className="absolute inset-0 shadow-[inset_0_0_42px_14px_rgba(0,0,0,0.65),inset_14px_0_18px_-6px_rgba(0,0,0,0.7)]" />
    </div>
  );
}

/** Blurred stand-in room used until a real interior photo is supplied. */
function PlaceholderRoom() {
  const bokeh = [
    [62, 30, 5], [70, 38, 6], [58, 44, 5], [76, 48, 7], [66, 52, 6], [54, 56, 5], [72, 60, 7],
    [60, 64, 6], [80, 66, 6], [50, 68, 5], [68, 72, 7], [57, 76, 6], [77, 77, 6], [64, 24, 4],
  ];
  return (
    <div className="absolute inset-0 [filter:blur(5px)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#2b1d14_0%,#3a281b_55%,#22170f_100%)]" />
      {/* tree silhouette */}
      <div
        className="absolute left-[46%] top-[16%] h-[66%] w-[44%] bg-[#1d2a1f]"
        style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
      />
      {bokeh.map(([x, y, s], i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${s}%`,
            aspectRatio: "1",
            background: i % 3 === 0 ? "#ffd9a0" : "#ffbf6b",
            opacity: 0.85,
            boxShadow: "0 0 12px 4px rgba(255,190,110,0.6)",
          }}
        />
      ))}
      {/* stone mantel and fireplace */}
      <div className="absolute bottom-[30%] left-[-6%] h-[4%] w-[52%] bg-[#8d8578]" />
      <div className="absolute bottom-[8%] left-[2%] h-[22%] w-[36%] bg-[#6f685e]" />
      <div className="absolute bottom-[10%] left-[9%] h-[14%] w-[22%] rounded-t-[30%] bg-[#ff9b45] shadow-[0_0_30px_14px_rgba(255,140,50,0.7)]" />
      {/* stockings */}
      {[4, 16, 28].map((x) => (
        <div key={x} className="absolute bottom-[21%] h-[10%] w-[6%] rounded-b-[40%] bg-[#e9e2d6]" style={{ left: `${x}%` }} />
      ))}
    </div>
  );
}
