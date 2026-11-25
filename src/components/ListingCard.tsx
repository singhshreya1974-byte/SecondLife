import { useState } from 'react';
import { ArrowRight, Clock, Film, Gavel, MapPin, Repeat, Tag, Ticket } from 'lucide-react';
import type { ListingItem, ListingType } from '../shared/types.ts';
import {
  formatINR,
  getCategoryImage,
  getCategoryVideo,
  type MediaLightboxPayload,
} from '../lib/media.ts';
import { ConditionStickerBadge, VerifiedCampusMark } from './ConditionSticker.tsx';

interface ListingCardProps {
  item: ListingItem;
  onSelect: (item: ListingItem) => void;
  onOpenMedia?: (media: MediaLightboxPayload) => void;
}

const TX_HEADER_STYLE: Record<ListingType, { label: string; bg: string }> = {
  sale: { label: 'FOR SALE', bg: 'bg-[#FFE047]' },
  swap: { label: 'SWAP', bg: 'bg-[#DDD6FE]' },
  borrow: { label: 'FREE BORROW', bg: 'bg-[#5EEAD4]' },
  rent: { label: 'RENT', bg: 'bg-[#FCA5A5]' },
};

export function ListingCard({ item, onSelect, onOpenMedia }: ListingCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const txMeta = TX_HEADER_STYLE[item.transaction_type] || TX_HEADER_STYLE.sale;
  const imgUrl = item.image_url || getCategoryImage(item.category);
  const vidUrl = item.video_url || getCategoryVideo(item.category);

  const highestBid =
    item.bids.length > 0 ? Math.max(...item.bids.map((b) => b.amount)) : null;
  const displayPrice = highestBid ?? item.asking_price;
  const savingsPct = Math.max(
    0,
    Math.round(((item.original_price - displayPrice) / Math.max(1, item.original_price)) * 100)
  );

  const openMedia = (mode: 'image' | 'video', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenMedia) {
      onOpenMedia({
        title: item.title,
        subtitle: `${item.category} · ${item.condition_sticker} · ${item.age_years}y old`,
        imageUrl: imgUrl,
        videoUrl: vidUrl,
        initialMode: mode,
        mascotEmoji: item.mascot.emoji,
        mascotLine: item.mascot.line,
      });
    } else {
      onSelect(item);
    }
  };

  return (
    <article className="group flex flex-col bg-white border-2 border-[#161816] rounded-2xl shadow-[4px_4px_0px_#161816] overflow-hidden transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#161816]">
      {/* Compact Header Band */}
      <div
        className={`w-full px-4 py-1.5 border-b-2 border-[#161816] flex items-center justify-between gap-2 ${txMeta.bg}`}
      >
        <span className="font-mono text-[11px] font-extrabold tracking-wider uppercase text-[#161816]">
          {txMeta.label} · {item.category}
        </span>
        <span className="rounded border border-[#161816] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#161816] tabular-nums">
          {item.branch === 'All' ? 'ALL' : item.branch} · {item.age_years}Y
        </span>
      </div>

      {/* Clickable Photo + Video Trigger */}
      <div className="relative aspect-[16/10] w-full bg-[#EFEFE9] border-b-2 border-[#161816] overflow-hidden">
        <button
          type="button"
          onClick={(e) => openMedia('image', e)}
          className="w-full h-full block text-left cursor-zoom-in focus:outline-none"
          title="Click photo to enlarge"
        >
          {!imgFailed ? (
            <img
              src={imgUrl}
              alt={`${item.title} — ${item.category}`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#FEF08A] p-6 text-center">
              <span className="font-display text-lg font-bold text-[#161816]">
                {item.mascot.emoji} {item.category}
              </span>
            </div>
          )}
        </button>

        <div className="absolute left-3 bottom-2.5 pointer-events-none">
          <ConditionStickerBadge condition={item.condition_sticker} size="sm" tilted />
        </div>

        <button
          type="button"
          onClick={(e) => openMedia('video', e)}
          title="Play item video preview"
          className="nb-btn-sm absolute right-2.5 bottom-2.5 bg-[#FFE047] px-2 py-1 text-[11px] font-extrabold text-[#161816] inline-flex items-center gap-1"
        >
          <Film className="h-3 w-3" />
          <span>Video</span>
        </button>

        {item.status !== 'available' && (
          <div className="absolute right-2.5 top-2.5 border-2 border-[#161816] bg-[#FFE047] text-[#161816] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
            {item.status}
          </div>
        )}
      </div>

      {/* Decluttered Body */}
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex flex-1 flex-col p-4 text-left space-y-2.5 focus-visible:outline-none"
      >
        <h3 className="font-display text-base sm:text-lg font-extrabold leading-snug text-[#161816] group-hover:text-[#184D38] transition-colors line-clamp-1">
          {item.title}
        </h3>

        {/* Compact 1-line Little Loops Mascot */}
        <p className="rounded-lg border border-[#161816] bg-[#FFFBF0] px-2.5 py-1.5 text-xs font-medium text-[#161816] line-clamp-2">
          <span className="mr-1.5" aria-hidden="true">
            {item.mascot.emoji}
          </span>
          &ldquo;{item.mascot.line}&rdquo;
        </p>

        {/* Single contextual highlight (uncluttered) */}
        {item.transaction_type === 'borrow' ? (
          <p className="text-xs font-semibold text-[#144230] flex items-center gap-1 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {item.borrow_min_days ?? 1}–{item.borrow_max_days ?? 7}d · {item.collection_location}
            </span>
          </p>
        ) : item.transaction_type === 'swap' && item.swap_for ? (
          <p className="text-xs font-semibold text-[#4338CA] flex items-center gap-1 truncate">
            <Repeat className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Wants: {item.swap_for}</span>
          </p>
        ) : item.days_until_leaving !== null ? (
          <p className="text-xs font-bold text-[#9F3220] flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Leaves in {item.days_until_leaving} days</span>
          </p>
        ) : item.event_name ? (
          <p className="text-xs font-bold text-[#853D06] flex items-center gap-1 truncate">
            <Ticket className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.event_name}</span>
          </p>
        ) : null}

        {/* Price + Seller Strip */}
        <div className="mt-auto pt-2.5 border-t-2 border-[#161816] flex items-center justify-between gap-2 w-full">
          {item.transaction_type === 'borrow' ? (
            <span className="font-mono text-lg font-extrabold text-[#144230]">FREE LEND</span>
          ) : item.transaction_type === 'rent' ? (
            <span className="font-mono text-lg font-extrabold text-[#161816] tabular-nums">
              {formatINR(item.rent_per_week)}/wk
            </span>
          ) : item.transaction_type === 'swap' && item.asking_price === 0 ? (
            <span className="font-mono text-base font-extrabold text-[#4338CA]">
              SWAP ~{formatINR(item.suggested_price)}
            </span>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-extrabold text-[#161816] tabular-nums">
                {formatINR(displayPrice)}
              </span>
              <span className="text-xs font-extrabold text-[#184D38]">-{savingsPct}%</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#161816] min-w-0">
            <span>{item.seller.avatar_emoji}</span>
            <span className="truncate max-w-[90px]">{item.seller.nickname}</span>
            <VerifiedCampusMark verified={item.seller.campus_verified} />
            {item.transaction_type === 'sale' && (
              <Tag className="h-3 w-3 text-[#5B605B] shrink-0" aria-label={item.negotiable ? 'Negotiable' : 'Fixed'} />
            )}
            {item.allow_bidding && item.bids.length > 0 && (
              <Gavel className="h-3 w-3 text-[#853D06] shrink-0" />
            )}
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </div>
        </div>
      </button>
    </article>
  );
}
