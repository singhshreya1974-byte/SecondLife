import { useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Film,
  Gavel,
  HandCoins,
  HandHeart,
  Image as ImageIcon,
  Info,
  MapPin,
  Maximize2,
  Repeat,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react';
import type { ListingItem, PriceSuggestion, UserProfile } from '../shared/types.ts';
import {
  formatINR,
  getCategoryImage,
  getCategoryVideo,
  type MediaLightboxPayload,
} from '../lib/media.ts';
import { ConditionStickerBadge, TrustBadgePill, VerifiedCampusMark } from './ConditionSticker.tsx';

interface ItemDetailModalProps {
  item: ListingItem;
  currentUser: UserProfile;
  onClose: () => void;
  onRefresh: (updated?: ListingItem, toastMsg?: string) => void;
  onOpenMedia?: (media: MediaLightboxPayload) => void;
}

export function ItemDetailModal({
  item,
  currentUser,
  onClose,
  onRefresh,
  onOpenMedia,
}: ItemDetailModalProps) {
  const defaultTab =
    item.transaction_type === 'borrow'
      ? 'borrow'
      : item.transaction_type === 'rent'
        ? 'rent'
        : item.transaction_type === 'swap'
          ? 'swap'
          : 'buy';

  const [activeTab, setActiveTab] = useState<'buy' | 'bid' | 'swap' | 'borrow' | 'rent'>(defaultTab);
  const [priceData, setPriceData] = useState<PriceSuggestion | null>(null);

  const topBid =
    item.bids.length > 0 ? Math.max(...item.bids.map((b) => b.amount)) : item.asking_price;

  const [bidAmount, setBidAmount] = useState(topBid + 20);
  const [counterAmount, setCounterAmount] = useState(Math.max(40, item.suggested_price));
  const [counterMsg, setCounterMsg] = useState('Can pick up near Library today!');
  const [swapItem, setSwapItem] = useState(item.swap_for || 'Sem 3 Core Textbook');
  const [swapValue, setSwapValue] = useState(item.suggested_price);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [borrowNote, setBorrowNote] = useState('Will collect at agreed campus spot and return on time!');

  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const imgUrl = item.image_url || getCategoryImage(item.category);
  const vidUrl = item.video_url || getCategoryVideo(item.category);

  useEffect(() => {
    const params = new URLSearchParams({
      category: item.category,
      item: item.title,
      age: String(item.age_years),
      condition: item.condition,
      original_price: String(item.original_price),
      type: item.transaction_type || 'sale',
    });
    if (item.days_until_leaving !== null) {
      params.set('leaving_days', String(item.days_until_leaving));
    }
    fetch(`/api/price-suggestion?${params.toString()}`)
      .then((r) => r.json())
      .then((d: PriceSuggestion) => setPriceData(d))
      .catch((e) => console.error(e));
  }, [item]);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${item.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidder_id: currentUser.id, amount: bidAmount }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || 'Could not place bid');
      else {
        setSuccessMsg(`Bid of ${formatINR(bidAmount)} placed!`);
        setBidAmount(bidAmount + 20);
        onRefresh(data.listing, `Bid ${formatINR(bidAmount)} placed on ${item.title}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${item.id}/counter-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser.id,
          offer_amount: item.negotiable ? counterAmount : item.asking_price,
          message: counterMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || 'Failed to send request');
      else {
        const sentAmt = item.negotiable ? counterAmount : item.asking_price;
        setSuccessMsg(`Offer of ${formatINR(sentAmt)} sent to ${item.seller.nickname}!`);
        onRefresh(data.listing, `Sent purchase offer (${formatINR(sentAmt)})`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: item.id,
          proposer_id: currentUser.id,
          offered_item: swapItem,
          offered_value: swapValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || 'Swap failed');
      else {
        const warn = data.swap?.unbalanced_warning ? ` (${data.swap.unbalanced_warning})` : '';
        setSuccessMsg(`Swap proposed: ${data.swap.balance_text}${warn}`);
        onRefresh(undefined, `Swap proposal sent for ${item.title}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: item.id,
          renter_id: currentUser.id,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || 'Rental failed');
      else {
        setSuccessMsg(
          `Booked rental! ${formatINR(data.rental.total_rent)} rent + ${formatINR(data.rental.deposit)} refundable deposit.`
        );
        onRefresh(undefined, `Rental booked for ${item.title}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBorrowInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      // Phase 1 borrow request routes safely into rental tracker at ₹0 rent until Phase 2 lifecycle state machine
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: item.id,
          renter_id: currentUser.id,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || 'Borrow request failed');
      else {
        setSuccessMsg(
          `Free borrow request recorded (${startDate} to ${endDate})! Pickup at ${item.collection_location}. Note: "${borrowNote}"`
        );
        onRefresh(undefined, `Borrow request submitted for ${item.title}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const ratio = (item.asking_price > 0 ? item.asking_price : item.suggested_price) / Math.max(1, item.suggested_price);
  const meterPct = Math.min(95, Math.max(5, Math.round(((ratio - 0.7) / 0.6) * 100)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#161816]/65 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-5xl bg-[#FFFBF0] border-2 border-[#161816] rounded-2xl shadow-[8px_8px_0px_#161816] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 bg-[#FFE047] border-b-2 border-[#161816]">
          <div className="flex items-center flex-wrap gap-2 text-xs font-bold text-[#161816]">
            <span className="rounded-md border border-[#161816] bg-white px-2 py-0.5 uppercase font-mono">
              {item.transaction_type}
            </span>
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>{item.branch === 'All' ? 'All Branches' : item.branch}</span>
            <span aria-hidden="true">·</span>
            <span>{item.semester}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{item.age_years}y old</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="nb-btn-sm inline-flex h-9 w-9 items-center justify-center bg-white text-[#161816]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Clickable Photo/Video, Little Loops Mascot, Specs, Seller Trust */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-2">
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#161816] nb-card">
                  {mediaMode === 'image' ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenMedia?.({
                          title: item.title,
                          subtitle: `${item.category} · ${item.condition_sticker}`,
                          imageUrl: imgUrl,
                          videoUrl: vidUrl,
                          initialMode: 'image',
                          mascotEmoji: item.mascot.emoji,
                          mascotLine: item.mascot.line,
                        })
                      }
                      className="w-full h-full block cursor-zoom-in"
                      title="Click image to expand"
                    >
                      <img
                        src={imgUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <video
                      key={vidUrl}
                      src={vidUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="h-full w-full object-contain bg-black"
                    />
                  )}

                  {mediaMode === 'image' && (
                    <div className="absolute left-3.5 bottom-3.5 pointer-events-none">
                      <ConditionStickerBadge condition={item.condition_sticker} size="md" tilted />
                    </div>
                  )}

                  {onOpenMedia && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenMedia({
                          title: item.title,
                          subtitle: `${item.category} · ${item.condition_sticker}`,
                          imageUrl: imgUrl,
                          videoUrl: vidUrl,
                          initialMode: mediaMode,
                          mascotEmoji: item.mascot.emoji,
                          mascotLine: item.mascot.line,
                        })
                      }
                      aria-label="Open media fullscreen"
                      className="nb-btn-sm absolute top-3 right-3 bg-white px-2 py-1 text-[10px] font-extrabold text-[#161816] inline-flex items-center gap-1"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Expand
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaMode('image')}
                    className={`nb-btn-sm flex-1 py-1.5 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 ${
                      mediaMode === 'image' ? 'bg-[#5EEAD4] text-[#161816]' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Clickable Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaMode('video')}
                    className={`nb-btn-sm flex-1 py-1.5 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 ${
                      mediaMode === 'video' ? 'bg-[#FFE047] text-[#161816]' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    Play Video Clip
                  </button>
                </div>
              </div>

              {/* Little Loops Mascot */}
              <div className="bg-[#FEF08A] nb-card rounded-xl p-4 flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl border-2 border-[#161816] bg-white flex items-center justify-center text-2xl shrink-0">
                  {item.mascot.emoji}
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#184D38]">
                    Little Loops · {item.mascot.name}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-[#161816]">
                    &ldquo;{item.mascot.line}&rdquo;
                  </p>
                </div>
              </div>

              {/* Type-specific details + customization */}
              <div className="bg-white nb-card rounded-xl p-4 space-y-2.5 text-xs">
                <p className="font-display text-sm font-bold text-[#161816]">
                  Campus Details &amp; Handover Info
                </p>
                <div className="grid grid-cols-2 gap-2 text-[#2F342F]">
                  <div>
                    <span className="text-[#5B605B]">Collection Spot:</span>{' '}
                    <span className="font-bold text-[#161816]">{item.collection_location}</span>
                  </div>
                  <div>
                    <span className="text-[#5B605B]">Color / Edition:</span>{' '}
                    <span className="font-bold text-[#161816]">{item.color} · {item.edition}</span>
                  </div>
                  {(item.available_from || item.available_until) && (
                    <div className="col-span-2">
                      <span className="text-[#5B605B]">Availability Window:</span>{' '}
                      <span className="font-mono font-bold text-[#184D38]">
                        {item.available_from || 'Now'} → {item.available_until || 'Semester end'}
                      </span>
                    </div>
                  )}
                  {(item.transaction_type === 'borrow' || item.transaction_type === 'rent') && (
                    <div className="col-span-2">
                      <span className="text-[#5B605B]">Allowed Duration:</span>{' '}
                      <span className="font-mono font-bold text-[#161816]">
                        {item.borrow_min_days ?? 1} to {item.borrow_max_days ?? 7} days
                      </span>
                    </div>
                  )}
                  {item.borrow_conditions && (
                    <div className="col-span-2 rounded-lg bg-[#D1FAE5] border border-[#161816] px-2.5 py-1.5 font-semibold text-[#144230]">
                      Conditions: {item.borrow_conditions}
                    </div>
                  )}
                  {item.addons.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-[#5B605B]">Included add-ons:</span>{' '}
                      <span className="font-bold text-[#184D38]">{item.addons.join(' · ')}</span>
                    </div>
                  )}
                  {item.custom_note && (
                    <div className="col-span-2 pt-1.5 border-t border-[#161816]/20 text-[#161816]">
                      Seller note: &ldquo;{item.custom_note}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Pseudonymous Seller Card */}
              <div className="bg-[#DBEAFE] nb-card rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl" aria-hidden="true">
                      {item.seller.avatar_emoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-extrabold text-[#161816]">
                          {item.seller.nickname}
                        </p>
                        <VerifiedCampusMark verified={item.seller.campus_verified} />
                      </div>
                      <p className="text-xs font-medium text-[#2F342F] flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{item.seller.branch} Yr {item.seller.year} · {item.seller.hostel}</span>
                      </p>
                    </div>
                  </div>
                  <TrustBadgePill badge={item.seller.trust_badge} />
                </div>

                {item.seller.profile_stickers.length > 0 && (
                  <div className="pt-2 border-t border-[#161816]/20 flex flex-wrap gap-2 text-xs font-semibold text-[#161816]">
                    {item.seller.profile_stickers.map((s) => (
                      <span key={s} className="rounded bg-white border border-[#161816] px-2 py-0.5 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Pricing & Receipt & Action Tabs */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white nb-card rounded-2xl p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id="modal-title" className="font-display text-2xl font-extrabold text-[#161816]">
                    {item.title}
                  </h2>
                  {item.days_until_leaving !== null && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#161816] bg-[#FCA5A5] px-2 py-0.5 text-xs font-bold text-[#161816]">
                      <Clock className="h-3.5 w-3.5" />
                      Leaves in {item.days_until_leaving}d
                    </span>
                  )}
                </div>

                {item.event_name && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#853D06]">
                    <Ticket className="h-3.5 w-3.5" />
                    <span>Tagged for {item.event_name}</span>
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-baseline gap-6">
                  {item.transaction_type === 'borrow' ? (
                    <>
                      <div>
                        <span className="text-xs font-bold text-[#5B605B] block">Borrow Fee</span>
                        <span className="font-mono text-3xl font-extrabold text-[#184D38]">
                          FREE (₹0)
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#5B605B] block">Optional Deposit</span>
                        <span className="font-mono text-xl font-bold text-[#161816] tabular-nums">
                          {formatINR(item.suggested_deposit)}
                        </span>
                      </div>
                    </>
                  ) : item.transaction_type === 'rent' ? (
                    <>
                      <div>
                        <span className="text-xs font-bold text-[#5B605B] block">Weekly Rate</span>
                        <span className="font-mono text-3xl font-extrabold text-[#161816] tabular-nums">
                          {formatINR(item.rent_per_week)}/wk
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#5B605B] block">Refundable Deposit</span>
                        <span className="font-mono text-xl font-bold text-[#184D38] tabular-nums">
                          {formatINR(item.suggested_deposit)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-xs font-bold text-[#5B605B] block">
                          {item.transaction_type === 'swap' ? 'Swap Value Est.' : 'Asking Price'}
                        </span>
                        <span className="font-mono text-3xl font-extrabold text-[#161816] tabular-nums">
                          {item.asking_price > 0
                            ? formatINR(item.asking_price)
                            : formatINR(item.suggested_price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#5B605B] block">Fair Value</span>
                        <span className="font-mono text-xl font-bold text-[#184D38] tabular-nums">
                          {formatINR(item.suggested_price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#5B605B] block">Original MRP</span>
                        <span className="font-mono text-base text-[#737873] line-through tabular-nums">
                          {formatINR(item.original_price)}
                        </span>
                      </div>
                      {item.transaction_type === 'sale' && (
                        <div>
                          <span className="text-xs font-bold text-[#5B605B] block">Negotiation</span>
                          <span className="inline-flex items-center gap-1 rounded border border-[#161816] bg-[#FEF08A] px-2 py-0.5 text-xs font-bold text-[#161816]">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#184D38]" />
                            {item.negotiable ? 'Open to offers' : 'Fixed price'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {item.transaction_type === 'sale' && (
                  <div className="mt-4 bg-[#FFFBF0] border-2 border-[#161816] rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#161816]">
                        Buyer Fairness Meter: {item.fairness_tag}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[#464B46] tabular-nums">
                        Quick {formatINR(item.quick_sale_price)} · Fair {formatINR(item.suggested_price)} · Patient {formatINR(item.patient_price)}
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full border border-[#161816] bg-gradient-to-r from-[#5EEAD4] via-[#FFE047] to-[#FCA5A5]">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white border-2 border-[#161816]"
                        style={{ left: `${meterPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Why This Price Ordered Receipt */}
              <div className="bg-[#D1FAE5] nb-card rounded-2xl p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#161816]">
                    <Info className="h-4 w-4 text-[#184D38]" />
                    Why this price (200 past sales)
                  </span>
                  {priceData && (
                    <span className="rounded border border-[#161816] bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#184D38]">
                      {priceData.confidence} · {priceData.similar_count} similar
                    </span>
                  )}
                </div>

                {priceData ? (
                  <>
                    <p className="font-mono text-xs bg-white border-2 border-[#161816] rounded-lg px-3 py-2 text-[#161816] leading-relaxed">
                      {priceData.why_this_price.receipt_line}
                    </p>
                    <p className="text-xs font-medium text-[#161816]">
                      {priceData.why_this_price.summary}
                    </p>
                    {priceData.comparables.length > 0 && (
                      <div className="pt-2 border-t border-[#161816]/20 space-y-1">
                        <p className="text-[11px] font-bold text-[#144230]">
                          Comparable Past Sales:
                        </p>
                        {priceData.comparables.slice(0, 3).map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs text-[#161816]">
                            <span className="truncate pr-2 font-medium">
                              {c.item_name} ({c.age_years}y · {c.condition} · {c.month_name})
                            </span>
                            <span className="font-mono font-bold text-[#184D38] tabular-nums shrink-0">
                              {formatINR(c.sold_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs font-medium text-[#161816]">Loading pricing receipt...</p>
                )}
              </div>

              {/* Action Tabs */}
              <div className="bg-white nb-card rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {item.transaction_type !== 'borrow' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('buy')}
                      className={`nb-btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
                        activeTab === 'buy' ? 'bg-[#FFE047] text-[#161816]' : 'bg-white text-[#464B46]'
                      }`}
                    >
                      <HandCoins className="h-3.5 w-3.5" />
                      <span>{item.negotiable ? 'Buy / Counter-Offer' : 'Request to Buy'}</span>
                    </button>
                  )}

                  {item.transaction_type === 'borrow' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('borrow')}
                      className={`nb-btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
                        activeTab === 'borrow' ? 'bg-[#5EEAD4] text-[#161816]' : 'bg-white text-[#464B46]'
                      }`}
                    >
                      <HandHeart className="h-3.5 w-3.5" />
                      <span>Borrow Free</span>
                    </button>
                  )}

                  {item.listing_types.includes('swap') && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('swap')}
                      className={`nb-btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
                        activeTab === 'swap' ? 'bg-[#DDD6FE] text-[#161816]' : 'bg-white text-[#464B46]'
                      }`}
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      <span>Swap</span>
                    </button>
                  )}

                  {item.listing_types.includes('rent') && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('rent')}
                      className={`nb-btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
                        activeTab === 'rent' ? 'bg-[#FCA5A5] text-[#161816]' : 'bg-white text-[#464B46]'
                      }`}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>Rent ({formatINR(item.rent_per_week)}/wk)</span>
                    </button>
                  )}

                  {item.allow_bidding && item.transaction_type === 'sale' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('bid')}
                      className={`nb-btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${
                        activeTab === 'bid' ? 'bg-[#FEF08A] text-[#161816]' : 'bg-white text-[#464B46]'
                      }`}
                    >
                      <Gavel className="h-3.5 w-3.5" />
                      <span>Bids ({item.bids.length})</span>
                    </button>
                  )}
                </div>

                {errorMsg && (
                  <p className="text-xs font-bold text-[#991B1B] bg-[#FEE2E2] border-2 border-[#161816] px-3 py-2 rounded-lg">
                    {errorMsg}
                  </p>
                )}
                {successMsg && (
                  <p className="text-xs font-bold text-[#144230] bg-[#D1FAE5] border-2 border-[#161816] px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{successMsg}</span>
                  </p>
                )}

                {activeTab === 'buy' && (
                  <form onSubmit={handleCounterOffer} className="space-y-3">
                    <p className="text-xs text-[#464B46]">
                      Acting as{' '}
                      <strong className="text-[#161816]">
                        {currentUser.avatar_emoji} {currentUser.nickname}
                      </strong>
                      . {item.negotiable ? 'Propose an offer or request at asking price:' : 'Seller marked price as Fixed.'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="number"
                        min={30}
                        disabled={!item.negotiable}
                        value={item.negotiable ? counterAmount : item.asking_price}
                        onChange={(e) => setCounterAmount(Number(e.target.value))}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 font-mono text-sm font-bold tabular-nums disabled:opacity-70"
                      />
                      <input
                        type="text"
                        value={counterMsg}
                        onChange={(e) => setCounterMsg(e.target.value)}
                        placeholder="Pickup note..."
                        className="sm:col-span-2 rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="nb-btn w-full bg-[#184D38] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {item.negotiable
                        ? `Send Offer (${formatINR(counterAmount)})`
                        : `Request to Buy at ${formatINR(item.asking_price)}`}
                    </button>

                    {item.counter_offers.length > 0 && (
                      <div className="pt-2 border-t-2 border-[#161816]/15 space-y-1">
                        <p className="text-[11px] font-bold text-[#5B605B]">Recent Offers</p>
                        {item.counter_offers.map((co) => (
                          <div key={co.id} className="flex justify-between text-xs text-[#161816]">
                            <span>
                              {co.buyer_nickname}: &ldquo;{co.message}&rdquo;
                            </span>
                            <span className="font-mono font-bold text-[#184D38]">
                              {formatINR(co.offer_amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>
                )}

                {activeTab === 'borrow' && (
                  <form onSubmit={handleBorrowInquiry} className="space-y-3">
                    <div className="rounded-xl border-2 border-[#161816] bg-[#D1FAE5] p-3 text-xs font-semibold text-[#144230]">
                      Free temporary campus lending ({item.borrow_min_days ?? 1}–{item.borrow_max_days ?? 7} days) · Collect at{' '}
                      <strong>{item.collection_location}</strong>
                      {item.suggested_deposit > 0 && ` · Optional ${formatINR(item.suggested_deposit)} refundable deposit`}.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#161816] mb-1">
                          Requested Start Date
                        </label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#161816] mb-1">
                          Expected Return Date
                        </label>
                        <input
                          type="date"
                          required
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={borrowNote}
                      onChange={(e) => setBorrowNote(e.target.value)}
                      placeholder="Short note for lender..."
                      className="w-full rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={submitting || item.status !== 'available'}
                      className="nb-btn w-full bg-[#5EEAD4] px-4 py-3 text-sm font-extrabold text-[#161816] disabled:opacity-50"
                    >
                      {item.status === 'available' ? 'Request Free Borrow' : `Currently ${item.status}`}
                    </button>
                  </form>
                )}

                {activeTab === 'swap' && (
                  <form onSubmit={handleSwap} className="space-y-3">
                    <p className="text-xs font-medium text-[#161816]">
                      Wants: <strong>{item.swap_for || 'Items of equivalent value'}</strong>
                      {item.swap_categories.length > 0 && ` (${item.swap_categories.join(', ')})`}
                      {item.swap_multi_ok && ' · Multi-item swap OK'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        required
                        value={swapItem}
                        onChange={(e) => setSwapItem(e.target.value)}
                        placeholder="Item you offer"
                        className="sm:col-span-2 rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
                      />
                      <input
                        type="number"
                        min={30}
                        value={swapValue}
                        onChange={(e) => setSwapValue(Number(e.target.value))}
                        placeholder="Est. value ₹"
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 font-mono text-xs font-bold tabular-nums"
                      />
                    </div>
                    <p className="text-xs font-mono font-bold text-[#184D38]">
                      Balance preview:{' '}
                      {swapValue === item.suggested_price
                        ? 'Even swap (₹0 diff)'
                        : swapValue < item.suggested_price
                          ? `You owe ${formatINR(item.suggested_price - swapValue)}`
                          : `They owe you ${formatINR(swapValue - item.suggested_price)}`}
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="nb-btn w-full bg-[#DDD6FE] px-4 py-3 text-sm font-extrabold text-[#161816]"
                    >
                      Propose Swap
                    </button>
                  </form>
                )}

                {activeTab === 'rent' && (
                  <form onSubmit={handleRent} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#161816] mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#161816] mb-1">
                          Return Date (Required)
                        </label>
                        <input
                          type="date"
                          required
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#FEF08A] border-2 border-[#161816] rounded-lg px-3 py-2.5 font-mono font-bold tabular-nums">
                      <span>Rate: {formatINR(item.rent_per_week)}/wk</span>
                      <span>Deposit: {formatINR(item.suggested_deposit)}</span>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || item.status !== 'available'}
                      className="nb-btn w-full bg-[#184D38] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {item.status === 'available' ? 'Confirm Rental Request' : `Currently ${item.status}`}
                    </button>
                  </form>
                )}

                {activeTab === 'bid' && (
                  <form onSubmit={handlePlaceBid} className="space-y-3">
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {item.bids.length === 0 ? (
                        <p className="text-xs text-[#5B605B]">
                          No bids yet. Start above {formatINR(item.asking_price)}.
                        </p>
                      ) : (
                        item.bids.map((b, i) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between rounded-lg border border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs"
                          >
                            <span className="font-medium">
                              {i === 0 ? 'Leading · ' : ''}
                              {b.bidder_avatar} {b.bidder_nickname}{' '}
                              <span className="text-[#853D06]">({b.bidder_trust})</span>
                            </span>
                            <span className="font-mono font-bold text-[#184D38] tabular-nums">
                              {formatINR(b.amount)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={topBid + 1}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="flex-1 rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 font-mono text-sm font-bold tabular-nums"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="nb-btn bg-[#FFE047] px-5 py-2 text-sm font-extrabold text-[#161816]"
                      >
                        Place Bid
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
