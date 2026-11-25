import { useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, Palette, ShieldAlert, Sparkles } from 'lucide-react';
import type { Category, ImpactStats, PastSaleRecord, UserProfile } from '../shared/types.ts';
import { formatINR } from '../lib/media.ts';
import { TrustBadgePill, VerifiedCampusMark } from './ConditionSticker.tsx';

interface ProfileAndDataViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  impact: ImpactStats | null;
  onSwitchUser: (userId: string) => void;
  onProfileUpdated: (user: UserProfile) => void;
}

const AVATAR_EMOJIS = ['🦊', '🐼', '🦉', '🌱', '🚲', '📚', '⚡', '🎸', '🧪', '🧭'];
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
const THEME_SWATCHES = ['#184D38', '#0F766E', '#B45309', '#1D4ED8', '#4338CA'];
const CATEGORIES: ('All' | Category)[] = [
  'All',
  'Books',
  'Calculators',
  'Cycles',
  'Lab Gear',
  'Electronics',
  'Hostel Items',
];

export function ProfileAndDataView({
  currentUser,
  users,
  impact,
  onSwitchUser,
  onProfileUpdated,
}: ProfileAndDataViewProps) {
  const [avatar, setAvatar] = useState(currentUser.avatar_emoji);
  const [stickers, setStickers] = useState<string[]>(currentUser.profile_stickers);
  const [themeColor, setThemeColor] = useState(currentUser.theme_color);
  const [statusLine, setStatusLine] = useState(currentUser.status_line);
  const [bio, setBio] = useState(currentUser.bio);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [campusCode, setCampusCode] = useState('');
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  const [pastSales, setPastSales] = useState<PastSaleRecord[]>([]);
  const [salesCat, setSalesCat] = useState<'All' | Category>('All');

  useEffect(() => {
    setAvatar(currentUser.avatar_emoji);
    setStickers(currentUser.profile_stickers);
    setThemeColor(currentUser.theme_color);
    setStatusLine(currentUser.status_line);
    setBio(currentUser.bio);
    setSavedMsg(null);
    setVerifyMsg(null);
    setVerifyErr(null);
  }, [currentUser]);

  useEffect(() => {
    const params = salesCat !== 'All' ? `?category=${encodeURIComponent(salesCat)}` : '';
    fetch(`/api/past-sales${params}`)
      .then((r) => r.json())
      .then((d) => setPastSales(d.records || []))
      .catch((e) => console.error(e));
  }, [salesCat]);

  const toggleSticker = (s: string) => {
    setStickers((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 4 ? [...prev, s] : prev
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/users/${currentUser.id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatar_emoji: avatar,
        profile_stickers: stickers,
        theme_color: themeColor,
        status_line: statusLine,
        bio,
      }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      onProfileUpdated(data.user);
      setSavedMsg('Profile stickers and bio updated!');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyMsg(null);
    setVerifyErr(null);
    const res = await fetch(`/api/users/${currentUser.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campus_code: campusCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setVerifyErr(data.error || 'Verification failed');
    } else if (data.user) {
      onProfileUpdated(data.user);
      setVerifyMsg('Campus student ID verified! Your pseudonymous badge now carries Verified.');
      setCampusCode('');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Pseudonymous Persona Switcher + Profile Customization + Campus Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-white nb-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded border border-[#161816] bg-[#FFE047] px-2 py-0.5 text-[11px] font-extrabold text-[#161816] uppercase">
              Pseudonymous Identity
            </span>
            <select
              aria-label="Switch demo persona"
              value={currentUser.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-1.5 text-xs font-bold"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.avatar_emoji} {u.nickname} {u.campus_verified ? '✓' : ''} ({u.trust_badge.level})
                </option>
              ))}
            </select>
          </div>

          <div
            className="rounded-xl border-2 border-[#161816] p-5 text-white space-y-2 shadow-[3px_3px_0px_#161816]"
            style={{ backgroundColor: themeColor }}
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">{avatar}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-extrabold">{currentUser.nickname}</h2>
                  <VerifiedCampusMark verified={currentUser.campus_verified} />
                </div>
                <p className="text-xs text-white/90 font-medium">
                  {currentUser.branch} · Year {currentUser.year} · {currentUser.hostel}
                </p>
              </div>
            </div>
            <p className="text-xs italic text-white/90">&ldquo;{statusLine}&rdquo;</p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              {stickers.map((s) => (
                <span key={s} className="bg-black/25 border border-white/40 px-2 py-0.5 rounded font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Selective Campus Verification Panel */}
          <div className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#161816] flex items-center gap-1.5">
                {currentUser.campus_verified ? (
                  <BadgeCheck className="h-4 w-4 text-[#184D38]" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-[#853D06]" />
                )}
                Campus Verification
              </span>
              <span
                className={`rounded border border-[#161816] px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  currentUser.campus_verified ? 'bg-[#D1FAE5] text-[#144230]' : 'bg-[#FEF08A] text-[#161816]'
                }`}
              >
                {currentUser.campus_verified ? 'Verified Student' : 'Unverified'}
              </span>
            </div>

            {currentUser.campus_verified ? (
              <p className="text-xs font-medium text-[#144230]">
                Public alias <strong>{currentUser.nickname}</strong> is verified without exposing real names or personal emails.
              </p>
            ) : (
              <form onSubmit={handleVerify} className="space-y-2">
                <p className="text-[11px] font-medium text-[#464B46]">
                  Not every account is auto-verified. Enter a 6–20 char campus roll code (e.g., <code className="font-mono font-bold">2024ME108</code>) to earn your badge:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={campusCode}
                    onChange={(e) => setCampusCode(e.target.value)}
                    placeholder="e.g., 2024ME108"
                    className="flex-1 rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 font-mono text-xs font-bold"
                  />
                  <button
                    type="submit"
                    className="nb-btn-sm bg-[#184D38] px-3 py-1.5 text-xs font-extrabold text-white"
                  >
                    Verify
                  </button>
                </div>
                {verifyErr && <p className="text-[11px] font-bold text-[#991B1B]">{verifyErr}</p>}
                {verifyMsg && <p className="text-[11px] font-bold text-[#144230]">{verifyMsg}</p>}
              </form>
            )}
          </div>

          {/* Trust Badge Breakdown */}
          <div className="space-y-2.5 pt-2 border-t-2 border-[#161816]/15">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#161816]">Trust Badge Score</span>
              <TrustBadgePill badge={currentUser.trust_badge} interactive={false} />
            </div>
            <p className="text-xs text-[#464B46]">{currentUser.trust_badge.summary}</p>
            <div className="space-y-1.5 pt-1">
              {currentUser.trust_badge.breakdown.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-[#161816]/10"
                >
                  <span className="text-[#464B46] font-medium">{b.label}</span>
                  <span className="font-mono font-bold text-[#161816] tabular-nums">
                    {b.value} <span className="text-[#184D38]">({b.impact})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customize Stickers, Emoji, Theme, Bio */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white nb-card rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#184D38]" />
            <h2 className="font-display text-lg font-extrabold text-[#161816]">
              Customize Your Emoji Avatar, Stickers &amp; Theme
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#161816] mb-2">Avatar Emoji</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`nb-btn-sm h-10 w-10 text-xl flex items-center justify-center ${
                    avatar === em ? 'bg-[#FFE047] scale-105' : 'bg-[#FFFBF0]'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#161816] mb-2">
              Profile Stickers (up to 4 — shown publicly instead of real name)
            </label>
            <div className="flex flex-wrap gap-2">
              {STICKER_OPTIONS.map((st) => {
                const active = stickers.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleSticker(st)}
                    className={`nb-btn-sm px-3 py-1.5 text-xs font-bold ${
                      active ? 'bg-[#D1FAE5] text-[#144230]' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#161816] mb-2">
                Profile Theme Color
              </label>
              <div className="flex gap-2.5">
                {THEME_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setThemeColor(c)}
                    aria-label={`Select color ${c}`}
                    className={`h-8 w-8 rounded-full border-2 border-[#161816] ${
                      themeColor === c ? 'ring-2 ring-[#FFE047] scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#161816] mb-1">Status Line</label>
              <input
                type="text"
                value={statusLine}
                onChange={(e) => setStatusLine(e.target.value)}
                className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#161816] mb-1">Campus Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs"
            />
          </div>

          {savedMsg && (
            <p className="rounded-lg border-2 border-[#161816] bg-[#D1FAE5] px-3 py-2 text-xs font-bold text-[#144230] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{savedMsg}</span>
            </p>
          )}

          <button
            type="submit"
            className="nb-btn bg-[#184D38] px-5 py-3 text-sm font-extrabold text-white"
          >
            Save Profile Customization
          </button>
        </form>
      </div>

      {/* 3 Pitch Data Findings & Impact Summary */}
      {impact && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#184D38]" />
            <h2 className="font-display text-2xl font-extrabold text-[#161816]">
              3 Pitch Findings from 200 Seeded Sales (Seed 42)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {impact.findings.map((f, idx) => {
              const cardBg =
                idx === 0 ? 'bg-[#DBEAFE]' : idx === 1 ? 'bg-[#FEF08A]' : 'bg-[#D1FAE5]';
              return (
                <div
                  key={f.title}
                  className={`${cardBg} nb-card rounded-2xl p-5 space-y-2`}
                >
                  <span className="inline-block rounded border border-[#161816] bg-white px-2.5 py-0.5 font-mono text-base font-extrabold text-[#184D38] tabular-nums">
                    {f.metric}
                  </span>
                  <h3 className="font-display text-base font-extrabold text-[#161816]">
                    {f.title}
                  </h3>
                  <p className="text-xs font-medium leading-relaxed text-[#161816]/90">
                    {f.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 200 Past Sales Ledger */}
      <div className="bg-white nb-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b-2 border-[#161816] bg-[#FFE047] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-extrabold text-[#161816]">
              SQLite Historical Sales Ledger ({pastSales.length} records)
            </h2>
            <p className="text-xs font-semibold text-[#161816]/80">
              Powers the live depreciation curves in GET /api/price-suggestion
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSalesCat(c)}
                className={`nb-btn-sm px-3 py-1.5 text-xs font-extrabold ${
                  salesCat === c ? 'bg-[#184D38] text-white' : 'bg-white text-[#161816]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#FFFBF0] border-b-2 border-[#161816] text-[#161816]">
              <tr>
                <th className="py-2.5 px-4 font-extrabold">ID</th>
                <th className="py-2.5 px-4 font-extrabold">Item</th>
                <th className="py-2.5 px-4 font-extrabold">Category</th>
                <th className="py-2.5 px-4 font-extrabold">Condition</th>
                <th className="py-2.5 px-4 font-extrabold">Month</th>
                <th className="py-2.5 px-4 font-extrabold text-right">Age</th>
                <th className="py-2.5 px-4 font-extrabold text-right">MRP</th>
                <th className="py-2.5 px-4 font-extrabold text-right">Sold</th>
                <th className="py-2.5 px-4 font-extrabold text-right">Retained</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161816]/15">
              {pastSales.map((r) => (
                <tr key={r.id} className="hover:bg-[#FFFBF0]">
                  <td className="py-2 px-4 font-mono text-[#5B605B] tabular-nums">{r.id}</td>
                  <td className="py-2 px-4 font-bold text-[#161816]">{r.item_name}</td>
                  <td className="py-2 px-4 text-[#464B46]">{r.category}</td>
                  <td className="py-2 px-4 font-semibold text-[#161816]">{r.condition}</td>
                  <td className="py-2 px-4 text-[#5B605B]">{r.month_name}</td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums">{r.age_years}y</td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums text-[#5B605B]">
                    {formatINR(r.original_price)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-extrabold tabular-nums text-[#184D38]">
                    {formatINR(r.sold_price)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-bold tabular-nums">{r.retention_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
