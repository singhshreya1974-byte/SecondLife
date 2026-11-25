import { useState } from 'react';
import { CalendarClock, CheckCircle2, Repeat, Star, XCircle } from 'lucide-react';
import type { RentalRecord, SwapProposal, UserProfile } from '../shared/types.ts';
import { formatINR } from '../lib/media.ts';

interface MyTradesViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  swaps: SwapProposal[];
  rentals: RentalRecord[];
  onRefreshAll: (msg?: string) => void;
}

export function MyTradesView({
  currentUser,
  users,
  swaps,
  rentals,
  onRefreshAll,
}: MyTradesViewProps) {
  const [revieweeId, setRevieweeId] = useState(users[0]?.id || 'USR-01');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [rating, setRating] = useState(5);
  const [accurate, setAccurate] = useState(true);
  const [comment, setComment] = useState('Exact condition as described, super smooth handover!');
  const [reviewSaved, setReviewSaved] = useState<string | null>(null);

  const handleSwapDecision = async (id: string, status: 'accepted' | 'declined') => {
    const res = await fetch(`/api/swaps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      onRefreshAll(`Swap ${id} ${status}.`);
    }
  };

  const handleReturnRental = async (id: string, return_timeliness: 'on_time' | 'late') => {
    const res = await fetch(`/api/rentals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_timeliness }),
    });
    if (res.ok) {
      onRefreshAll(
        `Rental marked returned (${return_timeliness === 'on_time' ? 'on time' : 'late'}) — renter trust badge updated!`
      );
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/trades/TRD-${Date.now().toString().slice(-4)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewer_id: currentUser.id,
        reviewee_id: revieweeId,
        role,
        rating,
        condition_accurate: accurate,
        comment,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setReviewSaved(
        `Review saved! ${data.updated_user?.nickname} now has trust level "${data.updated_user?.trust_badge.level}" (${data.updated_user?.trust_badge.score}/100).`
      );
      onRefreshAll('Trade review submitted and trust scores updated!');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-[#FEF08A] nb-card rounded-2xl p-5 sm:p-6">
        <span className="inline-block rounded-md border-2 border-[#161816] bg-white px-2.5 py-0.5 font-mono text-[11px] font-extrabold uppercase">
          Active Campus Trades
        </span>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-[#161816] tracking-tight">
          Swaps, Rentals/Borrows &amp; Mutual Trade Reviews
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Swaps */}
          <div className="bg-white nb-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-[#4338CA]" />
              <h2 className="font-display text-lg font-extrabold text-[#161816]">
                Swap Proposals ({swaps.length})
              </h2>
            </div>

            {swaps.length === 0 ? (
              <p className="text-xs font-medium text-[#5B605B]">No swap proposals yet.</p>
            ) : (
              <div className="space-y-3">
                {swaps.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-[#5B605B]">
                          {s.proposer_nickname} ({s.proposer_trust}) wants{' '}
                          <strong className="text-[#161816]">{s.listing_title}</strong>
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-[#161816]">
                          Offered: {s.offered_item} ({formatINR(s.offered_value)})
                        </p>
                      </div>
                      <span className="rounded border border-[#161816] bg-[#DDD6FE] px-2 py-0.5 font-mono text-xs font-bold text-[#161816] shrink-0">
                        {s.balance_text}
                      </span>
                    </div>

                    {s.unbalanced_warning && (
                      <p className="text-[11px] font-bold text-[#853D06]">
                        {s.unbalanced_warning}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t-2 border-[#161816]/15 text-xs">
                      <span className="capitalize font-bold text-[#2F342F]">
                        Status: {s.status}
                      </span>
                      {s.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSwapDecision(s.id, 'accepted')}
                            className="nb-btn-sm inline-flex items-center gap-1 bg-[#184D38] px-3 py-1.5 text-xs font-extrabold text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwapDecision(s.id, 'declined')}
                            className="nb-btn-sm inline-flex items-center gap-1 bg-[#FCA5A5] px-3 py-1.5 text-xs font-extrabold text-[#161816]"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rentals & Free Borrows */}
          <div className="bg-white nb-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#184D38]" />
              <h2 className="font-display text-lg font-extrabold text-[#161816]">
                Active &amp; Past Rentals / Borrows ({rentals.length})
              </h2>
            </div>

            {rentals.length === 0 ? (
              <p className="text-xs font-medium text-[#5B605B]">No rentals or borrows booked yet.</p>
            ) : (
              <div className="space-y-3">
                {rentals.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-[#161816]">
                          {r.listing_title}
                        </p>
                        <p className="text-xs font-medium text-[#5B605B]">
                          Renter: {r.renter_nickname} ({r.renter_trust}) · {r.start_date} to{' '}
                          {r.end_date}
                        </p>
                      </div>
                      <div className="text-right font-mono text-xs tabular-nums">
                        <span className="font-extrabold text-[#184D38] block">
                          {r.total_rent === 0 ? 'FREE BORROW' : formatINR(r.total_rent)}
                        </span>
                        <span className="text-[#5B605B]">Dep {formatINR(r.deposit)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t-2 border-[#161816]/15 text-xs">
                      <span className="font-bold text-[#161816]">
                        {r.status === 'active'
                          ? 'Out on campus'
                          : `Returned (${r.return_timeliness === 'on_time' ? 'On time' : 'Late'})`}
                      </span>
                      {r.status === 'active' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleReturnRental(r.id, 'on_time')}
                            className="nb-btn-sm bg-[#5EEAD4] px-3 py-1.5 text-xs font-extrabold text-[#161816]"
                          >
                            Returned On Time
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReturnRental(r.id, 'late')}
                            className="nb-btn-sm bg-[#FCA5A5] px-3 py-1.5 text-xs font-extrabold text-[#161816]"
                          >
                            Returned Late
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Post-Trade Review Form */}
        <form
          onSubmit={handleSubmitReview}
          className="lg:col-span-5 bg-white nb-card rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-[#853D06]" />
            <h2 className="font-display text-lg font-extrabold text-[#161816]">
              Rate a Trade Partner
            </h2>
          </div>
          <p className="text-xs font-medium text-[#464B46]">
            Both buyers and sellers rate each other after a handover, updating their Trust Badge score.
          </p>

          <div>
            <label className="block text-xs font-bold text-[#161816] mb-1">
              Who did you trade with?
            </label>
            <select
              value={revieweeId}
              onChange={(e) => setRevieweeId(e.target.value)}
              className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-bold"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.avatar_emoji} {u.nickname} ({u.trust_badge.level} · {u.completed_trades} trades)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#161816] mb-1">Their Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'buyer' | 'seller')}
                className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-bold"
              >
                <option value="seller">Seller</option>
                <option value="buyer">Buyer / Renter</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#161816] mb-1">Star Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-bold"
              >
                <option value={5}>5 ★ Smooth</option>
                <option value={4}>4 ★ Good</option>
                <option value={3}>3 ★ Okay</option>
                <option value={2}>2 ★ Rough</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAccurate(!accurate)}
            className={`nb-btn-sm w-full px-3 py-2 text-xs font-extrabold text-left ${
              accurate ? 'bg-[#D1FAE5] text-[#144230]' : 'bg-[#FCA5A5] text-[#161816]'
            }`}
          >
            {accurate ? '✓ Condition matched stickers accurately' : '✕ Condition was worse than listed'}
          </button>

          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs"
          />

          {reviewSaved && (
            <p className="rounded-lg border-2 border-[#161816] bg-[#D1FAE5] px-3 py-2 text-xs font-bold text-[#144230]">
              {reviewSaved}
            </p>
          )}

          <button
            type="submit"
            className="nb-btn w-full bg-[#184D38] px-4 py-3 text-sm font-extrabold text-white"
          >
            Submit Trade Review
          </button>
        </form>
      </div>
    </section>
  );
}
