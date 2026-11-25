import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Lock,
  Palette,
  Plus,
  Repeat,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  XCircle,
} from 'lucide-react';
import type { DashboardData, ListingItem, UserProfile } from '../shared/types.ts';
import {
  formatINR,
  getCategoryImage,
  getCategoryVideo,
  type MediaLightboxPayload,
} from '../lib/media.ts';
import { TrustBadgePill, VerifiedCampusMark } from './ConditionSticker.tsx';

export type DashboardRoleView = 'user' | 'seller';

interface DashboardViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  roleView: DashboardRoleView;
  onChangeRoleView: (role: DashboardRoleView) => void;
  onSwitchUser: (userId: string) => void;
  onSelectListing: (item: ListingItem) => void;
  onOpenMedia: (media: MediaLightboxPayload) => void;
  onOpenSellStudio: () => void;
  onRefreshAll: (msg?: string) => void;
}

const MOOD_EMOTICONS = [
  { emoji: '😎', label: 'Hunting Deals' },
  { emoji: '📚', label: 'Exam Mode' },
  { emoji: '🚲', label: 'Moving Out' },
  { emoji: '🤝', label: 'Ready to Swap' },
  { emoji: '🎉', label: 'Fest Vibes' },
  { emoji: '☕', label: 'Lending Free' },
];

const AVATAR_EMOJIS = ['🦊', '🐼', '🦉', '🌱', '🚲', '📚', '⚡', '🎸', '🧪', '🧭', '🚀', '🎧'];
const STICKER_OPTIONS = [
  '🌱 Eco Warrior',
  '📚 Bookworm',
  '🚲 Pedal Pro',
  '⚡ Lab Ace',
  '🎯 Fair Pricer',
  '☕ Hostel Helper',
  '🎭 Fest Crew',
  '🔧 Fixer Upper',
];

export function DashboardView({
  currentUser,
  users,
  roleView,
  onChangeRoleView,
  onSwitchUser,
  onSelectListing,
  onOpenMedia,
  onOpenSellStudio,
  onRefreshAll,
}: DashboardViewProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);

  // Customization state
  const [avatar, setAvatar] = useState(currentUser.avatar_emoji);
  const [stickers, setStickers] = useState<string[]>(currentUser.profile_stickers);
  const [statusLine, setStatusLine] = useState(currentUser.status_line);
  const [campusCode, setCampusCode] = useState('');
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${currentUser.id}`);
      if (res.ok) {
        const data: DashboardData = await res.json();
        setDashboard(data);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadDashboard();
    setAvatar(currentUser.avatar_emoji);
    setStickers(currentUser.profile_stickers);
    setStatusLine(currentUser.status_line);
    setVerifyMsg(null);
    setVerifyErr(null);
  }, [currentUser, loadDashboard]);

  const handleQuickMood = async (moodText: string) => {
    setStatusLine(moodText);
    const res = await fetch(`/api/users/${currentUser.id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_line: moodText }),
    });
    if (res.ok) {
      onRefreshAll(`Mood updated: ${moodText}`);
      loadDashboard();
    }
  };

  const handleSaveCustomize = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/users/${currentUser.id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatar_emoji: avatar,
        profile_stickers: stickers,
        status_line: statusLine,
      }),
    });
    if (res.ok) {
      setShowCustomize(false);
      onRefreshAll('Emoticon profile updated!');
      loadDashboard();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyErr(null);
    setVerifyMsg(null);
    const res = await fetch(`/api/users/${currentUser.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campus_code: campusCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setVerifyErr(data.error || 'Verification failed');
    } else {
      setCampusCode('');
      setVerifyMsg('Campus ID verified! Badge active.');
      onRefreshAll('Campus ID verified!');
      loadDashboard();
    }
  };

  const handleOfferDecision = async (offerId: string, status: 'accepted' | 'declined') => {
    const res = await fetch(`/api/counter-offers/${offerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      onRefreshAll(`Offer ${status}!`);
      loadDashboard();
    }
  };

  const handleSwapDecision = async (swapId: string, status: 'accepted' | 'declined') => {
    const res = await fetch(`/api/swaps/${swapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      onRefreshAll(`Swap ${status}!`);
      loadDashboard();
    }
  };

  const handleReturnRental = async (rentalId: string, return_timeliness: 'on_time' | 'late') => {
    const res = await fetch(`/api/rentals/${rentalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_timeliness }),
    });
    if (res.ok) {
      onRefreshAll(`Marked returned (${return_timeliness === 'on_time' ? 'on time' : 'late'})`);
      loadDashboard();
    }
  };

  const toggleSticker = (st: string) => {
    setStickers((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : prev.length < 4 ? [...prev, st] : prev
    );
  };

  const uv = dashboard?.user_view;
  const sv = dashboard?.seller_view;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* Personalised Emoticon Header + Both View Switcher */}
      <div className="bg-[#FFE047] nb-card-lg rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setShowCustomize((s) => !s)}
              title="Click to customize emoticon & stickers"
              className="h-14 w-14 rounded-2xl border-2 border-[#161816] bg-white shadow-[3px_3px_0px_#161816] flex items-center justify-center text-3xl shrink-0 hover:scale-105 transition-transform"
            >
              {currentUser.avatar_emoji}
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#161816]">
                  Hey, {currentUser.nickname}!
                </h1>
                <VerifiedCampusMark verified={currentUser.campus_verified} />
                <TrustBadgePill badge={currentUser.trust_badge} interactive={false} />
              </div>
              <p className="text-xs font-bold text-[#161816]/80 mt-0.5">
                {currentUser.branch} Year {currentUser.year} · {currentUser.hostel} · Mood:{' '}
                <span className="bg-white border border-[#161816] rounded px-1.5 py-0.5">
                  {currentUser.status_line}
                </span>
              </p>
            </div>
          </div>

          {/* Right controls: User / Seller View Switcher + Persona Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="group"
              aria-label="Switch dashboard view"
              className="inline-flex rounded-xl border-2 border-[#161816] bg-white shadow-[3px_3px_0px_#161816] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onChangeRoleView('user')}
                className={`px-3.5 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 ${
                  roleView === 'user' ? 'bg-[#5EEAD4] text-[#161816]' : 'bg-white text-[#464B46]'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>👤 User View</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeRoleView('seller')}
                className={`px-3.5 py-2 text-xs font-extrabold border-l-2 border-[#161816] inline-flex items-center gap-1.5 ${
                  roleView === 'seller' ? 'bg-[#184D38] text-white' : 'bg-white text-[#464B46]'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                <span>🏪 Seller View</span>
                {sv && sv.pending_actions_count > 0 && (
                  <span className="rounded-full bg-[#FFE047] text-[#161816] px-1.5 font-mono text-[10px]">
                    {sv.pending_actions_count}
                  </span>
                )}
              </button>
            </div>

            <select
              aria-label="Switch active student persona"
              value={currentUser.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="rounded-xl border-2 border-[#161816] bg-white px-2.5 py-2 text-xs font-bold shadow-[2px_2px_0px_#161816]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.avatar_emoji} {u.nickname} ({u.branch})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Emoticon Mood Bar + Sticker Row */}
        <div className="pt-3 border-t-2 border-[#161816]/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#161816] mr-1">
              Quick Mood:
            </span>
            {MOOD_EMOTICONS.map((m) => {
              const label = `${m.emoji} ${m.label}`;
              const active = statusLine === label;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => handleQuickMood(label)}
                  className={`nb-btn-sm px-2.5 py-1 text-[11px] font-bold ${
                    active ? 'bg-[#161816] text-white' : 'bg-white text-[#161816]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomize((s) => !s)}
            className="nb-btn-sm bg-white px-3 py-1 text-xs font-extrabold inline-flex items-center gap-1.5"
          >
            <Palette className="h-3.5 w-3.5 text-[#184D38]" />
            <span>{showCustomize ? 'Close Emoticons' : 'Customize Emoticons & Verify'}</span>
          </button>
        </div>

        {/* Collapsible Emoticon Customizer & Campus Verify Drawer */}
        {showCustomize && (
          <div className="bg-white nb-card rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <form onSubmit={handleSaveCustomize} className="md:col-span-7 space-y-3">
              <p className="text-xs font-extrabold text-[#161816]">Pick Your Avatar Emoticon</p>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setAvatar(em)}
                    className={`nb-btn-sm h-9 w-9 text-lg flex items-center justify-center ${
                      avatar === em ? 'bg-[#FFE047]' : 'bg-[#FFFBF0]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <p className="text-xs font-extrabold text-[#161816]">Emoticon Stickers (up to 4)</p>
              <div className="flex flex-wrap gap-1.5">
                {STICKER_OPTIONS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleSticker(st)}
                    className={`nb-btn-sm px-2.5 py-1 text-[11px] font-bold ${
                      stickers.includes(st) ? 'bg-[#D1FAE5] text-[#144230]' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="nb-btn-sm bg-[#184D38] px-4 py-2 text-xs font-extrabold text-white"
              >
                Save Emoticon Look
              </button>
            </form>

            <div className="md:col-span-5 rounded-xl border-2 border-[#161816] bg-[#FFFBF0] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold inline-flex items-center gap-1">
                  {currentUser.campus_verified ? (
                    <BadgeCheck className="h-4 w-4 text-[#184D38]" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-[#853D06]" />
                  )}
                  Campus ID Verification
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-white border border-[#161816] px-2 py-0.5 rounded">
                  {currentUser.campus_verified ? 'Verified ✓' : 'Unverified'}
                </span>
              </div>
              {currentUser.campus_verified ? (
                <p className="text-xs text-[#144230] font-medium">
                  Verified anonymously as <strong>{currentUser.nickname}</strong>.
                </p>
              ) : (
                <form onSubmit={handleVerify} className="space-y-2">
                  <input
                    type="text"
                    value={campusCode}
                    onChange={(e) => setCampusCode(e.target.value)}
                    placeholder="Roll code e.g. 2024ME108"
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 font-mono text-xs font-bold"
                  />
                  <button
                    type="submit"
                    className="nb-btn-sm bg-[#184D38] px-3 py-1.5 text-xs font-extrabold text-white"
                  >
                    Verify Campus ID
                  </button>
                  {verifyErr && <p className="text-[11px] font-bold text-[#991B1B]">{verifyErr}</p>}
                  {verifyMsg && <p className="text-[11px] font-bold text-[#144230]">{verifyMsg}</p>}
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 rounded-2xl bg-white nb-card animate-pulse" />
          ))}
        </div>
      ) : roleView === 'user' ? (
        /* ==================== USER / BUYER DASHBOARD ==================== */
        <div className="space-y-6">
          {/* 4 Emoticon KPI Boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#DBEAFE] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">💬 Offers &amp; Bids</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#161816] tabular-nums">
                {(uv?.outgoing_offers.length ?? 0) + (uv?.outgoing_bids.length ?? 0)}
              </p>
            </div>
            <div className="bg-[#DDD6FE] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">🔁 Swaps Sent</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#161816] tabular-nums">
                {uv?.my_swaps.length ?? 0}
              </p>
            </div>
            <div className="bg-[#D1FAE5] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">📦 Borrows &amp; Rents</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#161816] tabular-nums">
                {uv?.my_rentals.length ?? 0}
              </p>
            </div>
            <div className="bg-[#FEF08A] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">🎯 My Wanted Posts</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#161816] tabular-nums">
                {uv?.my_needs.length ?? 0}
              </p>
            </div>
          </div>

          {/* Branch-Personalised Picks with Clickable Photo & Video */}
          <div className="bg-white nb-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-extrabold text-[#161816] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#184D38]" />
                <span>Picked for {currentUser.avatar_emoji} {currentUser.nickname} ({currentUser.branch})</span>
              </h2>
              <span className="text-[11px] font-bold text-[#5B605B]">
                Click photo or video to inspect
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(uv?.recommended_listings || []).map((item) => {
                const imgUrl = item.image_url || getCategoryImage(item.category);
                const vidUrl = item.video_url || getCategoryVideo(item.category);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-[16/10] border-b-2 border-[#161816] bg-[#EFEFE9]">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenMedia({
                            title: item.title,
                            subtitle: `${item.category} · ${item.condition_sticker}`,
                            imageUrl: imgUrl,
                            videoUrl: vidUrl,
                            initialMode: 'image',
                            mascotEmoji: item.mascot.emoji,
                            mascotLine: item.mascot.line,
                          })
                        }
                        className="w-full h-full block cursor-pointer"
                        title="Click image to enlarge"
                      >
                        <img
                          src={imgUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenMedia({
                            title: item.title,
                            subtitle: `${item.category} · Video Preview`,
                            imageUrl: imgUrl,
                            videoUrl: vidUrl,
                            initialMode: 'video',
                            mascotEmoji: item.mascot.emoji,
                            mascotLine: item.mascot.line,
                          })
                        }
                        className="nb-btn-sm absolute bottom-2 right-2 bg-[#FFE047] px-2 py-0.5 text-[10px] font-extrabold text-[#161816] inline-flex items-center gap-1"
                      >
                        <Film className="h-3 w-3" />
                        Video
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectListing(item)}
                      className="p-3 text-left flex-1 flex flex-col justify-between gap-1.5 hover:bg-white transition-colors"
                    >
                      <div>
                        <p className="text-xs font-extrabold text-[#161816] line-clamp-1">
                          {item.mascot.emoji} {item.title}
                        </p>
                        <p className="text-[11px] font-semibold text-[#184D38]">
                          {item.branch === currentUser.branch ? `🎓 ${currentUser.branch} Match` : '✨ Great Value'}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-extrabold text-[#161816]">
                        {item.transaction_type === 'borrow'
                          ? 'FREE BORROW'
                          : item.transaction_type === 'rent'
                            ? `${formatINR(item.rent_per_week)}/wk`
                            : formatINR(item.asking_price || item.suggested_price)}
                      </p>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buyer Activity Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white nb-card rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-extrabold text-[#161816]">
                💬 My Offers &amp; Bids
              </h3>
              {(uv?.outgoing_offers.length ?? 0) === 0 && (uv?.outgoing_bids.length ?? 0) === 0 ? (
                <p className="text-xs text-[#5B605B]">No offers or bids sent yet. Browse Marketplace to send one!</p>
              ) : (
                <div className="space-y-2">
                  {uv?.outgoing_offers.map((co) => (
                    <div
                      key={co.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-[#161816]">{co.listing_title}</p>
                        <p className="text-[#5B605B]">&ldquo;{co.message}&rdquo;</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-extrabold text-[#184D38] block">
                          {formatINR(co.offer_amount)}
                        </span>
                        <span className="uppercase text-[10px] font-extrabold">{co.status}</span>
                      </div>
                    </div>
                  ))}
                  {uv?.outgoing_bids.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#FEF08A] px-3.5 py-2.5 flex items-center justify-between text-xs"
                    >
                      <span className="font-extrabold text-[#161816]">🔨 Bid on {b.listing_title}</span>
                      <span className="font-mono font-extrabold text-[#161816]">
                        {formatINR(b.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white nb-card rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-extrabold text-[#161816]">
                📦 My Borrows, Rents &amp; Swaps
              </h3>
              {(uv?.my_rentals.length ?? 0) === 0 && (uv?.my_swaps.length ?? 0) === 0 ? (
                <p className="text-xs text-[#5B605B]">No active borrows, rentals, or swap proposals yet.</p>
              ) : (
                <div className="space-y-2">
                  {uv?.my_rentals.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#D1FAE5] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-[#161816]">{r.listing_title}</p>
                        <p className="text-[#144230] font-medium">
                          {r.start_date} → {r.end_date} ({r.total_rent === 0 ? 'Free Borrow' : formatINR(r.total_rent)})
                        </p>
                      </div>
                      {r.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => handleReturnRental(r.id, 'on_time')}
                          className="nb-btn-sm bg-white px-2.5 py-1 text-[11px] font-extrabold"
                        >
                          Mark Returned
                        </button>
                      ) : (
                        <span className="font-bold uppercase text-[10px]">Returned</span>
                      )}
                    </div>
                  ))}
                  {uv?.my_swaps.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#DDD6FE] px-3.5 py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-[#161816]">
                          <Repeat className="h-3 w-3 inline mr-1" />
                          {s.offered_item} → {s.listing_title}
                        </p>
                        <p className="text-[#4338CA] font-semibold">{s.balance_text}</p>
                      </div>
                      <span className="uppercase text-[10px] font-extrabold">{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==================== SELLER DASHBOARD ==================== */
        <div className="space-y-6">
          {/* Seller KPI Boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#FFE047] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">🏪 My Listings</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#161816] tabular-nums">
                {sv?.my_listings.length ?? 0}
              </p>
            </div>
            <div className="bg-[#FCA5A5] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">📩 Pending Actions</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#161816] tabular-nums">
                {sv?.pending_actions_count ?? 0}
              </p>
            </div>
            <div className="bg-[#D1FAE5] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">💰 Potential Earnings</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#144230] tabular-nums">
                {formatINR(sv?.potential_earnings ?? 0)}
              </p>
            </div>
            <div className="bg-[#DBEAFE] nb-card rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#161816]">⭐ Seller Trust</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#161816] tabular-nums">
                {currentUser.trust_badge.score}/100
              </p>
            </div>
          </div>

          {/* Demo Helper when current persona has 0 listings */}
          {(sv?.my_listings.length ?? 0) === 0 && (
            <div className="bg-[#FEF08A] nb-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-display text-base font-extrabold text-[#161816]">
                  {currentUser.avatar_emoji} {currentUser.nickname} hasn&apos;t listed an item yet!
                </p>
                <p className="text-xs font-semibold text-[#161816]/80">
                  List your first item in 45s OR switch to an active campus seller to inspect a full seller inbox:
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[
                    { id: 'USR-01', label: '⚙️ Gearhead26' },
                    { id: 'USR-03', label: '🐼 CodePanda' },
                    { id: 'USR-04', label: '🚲 VeloRider' },
                  ].map((demo) => (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => onSwitchUser(demo.id)}
                      className="nb-btn-sm bg-white px-3 py-1 text-xs font-extrabold text-[#161816]"
                    >
                      Switch to {demo.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenSellStudio}
                className="nb-btn bg-[#184D38] px-4 py-2.5 text-xs font-extrabold text-white inline-flex items-center gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Listing</span>
              </button>
            </div>
          )}

          {/* Seller's Active Listings Shelf (with clickable image & video + private floor indicator) */}
          {(sv?.my_listings.length ?? 0) > 0 && (
            <div className="bg-white nb-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-extrabold text-[#161816]">
                  🏷️ Your Listings ({sv?.my_listings.length})
                </h2>
                <button
                  type="button"
                  onClick={onOpenSellStudio}
                  className="nb-btn-sm bg-[#184D38] px-3 py-1.5 text-xs font-extrabold text-white inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Listing
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sv?.my_listings.map(({ listing, has_private_floor, pending_offers_count, bids_count }) => {
                  const imgUrl = listing.image_url || getCategoryImage(listing.category);
                  const vidUrl = listing.video_url || getCategoryVideo(listing.category);
                  return (
                    <div
                      key={listing.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] overflow-hidden flex flex-col"
                    >
                      <div className="relative aspect-[16/9] border-b-2 border-[#161816]">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenMedia({
                              title: listing.title,
                              subtitle: `${listing.category} · Seller Preview`,
                              imageUrl: imgUrl,
                              videoUrl: vidUrl,
                              initialMode: 'image',
                              mascotEmoji: listing.mascot.emoji,
                              mascotLine: listing.mascot.line,
                            })
                          }
                          className="w-full h-full block"
                          title="Click image to view"
                        >
                          <img
                            src={imgUrl}
                            alt={listing.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div className="absolute bottom-2 right-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenMedia({
                                title: listing.title,
                                subtitle: 'Photo',
                                imageUrl: imgUrl,
                                videoUrl: vidUrl,
                                initialMode: 'image',
                              })
                            }
                            className="nb-btn-sm bg-white px-2 py-0.5 text-[10px] font-extrabold inline-flex items-center gap-1"
                          >
                            <ImageIcon className="h-3 w-3" />
                            Img
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenMedia({
                                title: listing.title,
                                subtitle: 'Video Clip',
                                imageUrl: imgUrl,
                                videoUrl: vidUrl,
                                initialMode: 'video',
                              })
                            }
                            className="nb-btn-sm bg-[#FFE047] px-2 py-0.5 text-[10px] font-extrabold inline-flex items-center gap-1"
                          >
                            <Film className="h-3 w-3" />
                            Video
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-extrabold uppercase bg-white border border-[#161816] px-1.5 py-0.5 rounded">
                              {listing.transaction_type}
                            </span>
                            {has_private_floor && (
                              <span className="text-[10px] font-bold text-[#144230] inline-flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" /> Private floor set
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectListing(listing)}
                            className="mt-1.5 font-display text-sm font-extrabold text-[#161816] hover:text-[#184D38] text-left block"
                          >
                            {listing.title}
                          </button>
                        </div>

                        <div className="pt-2 border-t border-[#161816]/15 flex items-center justify-between text-xs">
                          <span className="font-mono font-extrabold text-[#161816]">
                            {listing.transaction_type === 'borrow'
                              ? 'FREE'
                              : listing.transaction_type === 'rent'
                                ? `${formatINR(listing.rent_per_week)}/wk`
                                : formatINR(listing.asking_price)}
                          </span>
                          <span className="text-[11px] font-bold text-[#5B605B]">
                            {pending_offers_count} offers · {bids_count} bids
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seller Inbox: Incoming Offers + Swaps + Rentals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white nb-card rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-extrabold text-[#161816]">
                📩 Incoming Buyer Offers
              </h3>
              {(sv?.incoming_offers.length ?? 0) === 0 ? (
                <p className="text-xs text-[#5B605B]">No buyer offers on your listings yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {sv?.incoming_offers.map((co) => (
                    <div
                      key={co.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-[#161816]">{co.listing_title}</p>
                          <p className="text-[#5B605B]">
                            From <strong>{co.buyer_nickname}</strong> ({co.buyer_trust}): &ldquo;{co.message}&rdquo;
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-sm font-extrabold text-[#184D38] block">
                            {formatINR(co.offer_amount)}
                          </span>
                          {co.floor_check !== 'no_floor' && (
                            <span
                              className={`text-[10px] font-extrabold ${
                                co.floor_check === 'meets_floor' ? 'text-[#144230]' : 'text-[#991B1B]'
                              }`}
                            >
                              {co.floor_check === 'meets_floor' ? '✅ Meets floor' : '⚠️ Below floor'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#161816]/15">
                        <span className="uppercase font-extrabold text-[10px]">{co.status}</span>
                        {co.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleOfferDecision(co.id, 'accepted')}
                              className="nb-btn-sm bg-[#184D38] px-2.5 py-1 text-[11px] font-extrabold text-white inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOfferDecision(co.id, 'declined')}
                              className="nb-btn-sm bg-[#FCA5A5] px-2.5 py-1 text-[11px] font-extrabold text-[#161816] inline-flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white nb-card rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-extrabold text-[#161816]">
                🔁 Incoming Swaps &amp; Borrow/Rent Requests
              </h3>
              {(sv?.incoming_swaps.length ?? 0) === 0 && (sv?.incoming_rentals.length ?? 0) === 0 ? (
                <p className="text-xs text-[#5B605B]">No incoming swaps or borrow/rental bookings yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {sv?.incoming_swaps.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#DDD6FE] p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-[#161816]">
                            {s.proposer_nickname} offers {s.offered_item}
                          </p>
                          <p className="text-[#4338CA] font-semibold">
                            For: {s.listing_title} ({s.balance_text})
                          </p>
                        </div>
                        <span className="uppercase font-extrabold text-[10px]">{s.status}</span>
                      </div>
                      {s.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSwapDecision(s.id, 'accepted')}
                            className="nb-btn-sm bg-[#184D38] px-2.5 py-1 text-[11px] font-extrabold text-white"
                          >
                            Accept Swap
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwapDecision(s.id, 'declined')}
                            className="nb-btn-sm bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#161816]"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {sv?.incoming_rentals.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border-2 border-[#161816] bg-[#D1FAE5] p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-[#161816]">
                            {r.renter_nickname} · {r.listing_title}
                          </p>
                          <p className="text-[#144230] font-medium">
                            {r.start_date} → {r.end_date} ({r.total_rent === 0 ? 'Free Borrow' : formatINR(r.total_rent)})
                          </p>
                        </div>
                        <span className="uppercase font-extrabold text-[10px]">{r.status}</span>
                      </div>
                      {r.status === 'active' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleReturnRental(r.id, 'on_time')}
                            className="nb-btn-sm bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#161816]"
                          >
                            Returned On Time
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReturnRental(r.id, 'late')}
                            className="nb-btn-sm bg-[#FCA5A5] px-2.5 py-1 text-[11px] font-extrabold text-[#161816]"
                          >
                            Late
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
