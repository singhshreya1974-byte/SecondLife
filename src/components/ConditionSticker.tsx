import { useState } from 'react';
import { Award, BadgeCheck, Heart, Shield, ShieldCheck, Sparkles, Sprout, Wrench } from 'lucide-react';
import type { ConditionSticker, TrustBadge } from '../shared/types.ts';

interface ConditionStickerProps {
  condition: ConditionSticker;
  size?: 'sm' | 'md';
  tilted?: boolean;
}

export const CONDITION_META: Record<
  ConditionSticker,
  {
    bg: string;
    border: string;
    text: string;
    subtitle: string;
    apiCondition: 'Like New' | 'Good' | 'Fair';
  }
> = {
  'Like New': {
    bg: 'bg-[#5EEAD4]',
    border: 'border-[#161816]',
    text: 'text-[#161816]',
    subtitle: 'Crisp & barely used',
    apiCondition: 'Like New',
  },
  'Well Loved': {
    bg: 'bg-[#FFE047]',
    border: 'border-[#161816]',
    text: 'text-[#161816]',
    subtitle: 'Survived mid-sems nicely',
    apiCondition: 'Good',
  },
  'Battle-Scarred': {
    bg: 'bg-[#FCA5A5]',
    border: 'border-[#161816]',
    text: 'text-[#161816]',
    subtitle: 'Marks outside, works 100%',
    apiCondition: 'Fair',
  },
};

export function ConditionStickerBadge({
  condition,
  size = 'sm',
  tilted = true,
}: ConditionStickerProps) {
  const style = CONDITION_META[condition] || CONDITION_META['Well Loved'];

  const Icon =
    condition === 'Like New'
      ? Sparkles
      : condition === 'Well Loved'
        ? Heart
        : Wrench;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border-2 font-bold tracking-tight shadow-[2px_2px_0px_#161816] select-none whitespace-nowrap shrink-0 ${style.bg} ${style.border} ${style.text} ${
        tilted ? '-rotate-2' : ''
      } ${
        size === 'md'
          ? 'rounded-lg px-2.5 py-1 text-xs'
          : 'rounded-md px-2 py-0.5 text-[11px]'
      }`}
      title={`${condition} — ${style.subtitle}`}
    >
      <Icon className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden="true" />
      <span>{condition}</span>
    </span>
  );
}

export function VerifiedCampusMark({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded bg-[#D1FAE5] border border-[#161816] px-1.5 py-0.5 text-[10px] font-bold text-[#144230] whitespace-nowrap shrink-0"
      title="Campus Verified Student"
    >
      <BadgeCheck className="h-3 w-3 text-[#184D38]" aria-hidden="true" />
      <span>Verified</span>
    </span>
  );
}

export function TrustBadgePill({
  badge,
  interactive = true,
}: {
  badge: TrustBadge;
  interactive?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const tone =
    badge.level === 'Campus Legend'
      ? 'bg-[#D1FAE5] text-[#144230]'
      : badge.level === 'Trusted'
        ? 'bg-[#DBEAFE] text-[#1E3A8A]'
        : badge.level === 'Reliable'
          ? 'bg-[#FEF08A] text-[#713F12]'
          : 'bg-[#F3F4F6] text-[#374151]';

  const Icon =
    badge.level === 'Campus Legend'
      ? Award
      : badge.level === 'Trusted'
        ? ShieldCheck
        : badge.level === 'New here'
          ? Sprout
          : Shield;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => interactive && setOpen(true)}
      onMouseLeave={() => interactive && setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          if (interactive) {
            e.stopPropagation();
            setOpen((v) => !v);
          }
        }}
        className={`inline-flex items-center gap-1 rounded-md border-2 border-[#161816] px-2 py-0.5 text-xs font-bold whitespace-nowrap shadow-[2px_2px_0px_#161816] ${tone} ${
          interactive ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{badge.level}</span>
        {badge.score > 0 && (
          <span className="font-mono text-[11px] opacity-85 tabular-nums">
            ({badge.score})
          </span>
        )}
      </button>

      {interactive && open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full mb-2 z-40 w-64 rounded-xl bg-white border-2 border-[#161816] shadow-[4px_4px_0px_#161816] p-3.5 text-left space-y-2"
        >
          <div className="flex items-center justify-between text-xs border-b-2 border-[#161816] pb-1.5">
            <span className="font-bold text-[#161816]">{badge.level}</span>
            <span className="font-mono font-bold text-[#184D38] tabular-nums">
              {badge.score}/100
            </span>
          </div>
          <div className="space-y-1">
            {badge.breakdown.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-[11px]">
                <span className="text-[#464B46]">{row.label}</span>
                <span className="font-mono font-semibold text-[#161816] tabular-nums">
                  {row.value} <span className="text-[#184D38]">({row.impact})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
