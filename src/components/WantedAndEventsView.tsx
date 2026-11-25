import { useState } from 'react';
import { ArrowRight, Bell, Calendar, CheckCircle2, MapPin, PlusCircle, Ticket } from 'lucide-react';
import type {
  AppNotification,
  Branch,
  Category,
  CollegeEvent,
  ListingItem,
  LostFoundPost,
  NeedRequest,
  Semester,
  UserProfile,
} from '../shared/types.ts';
import { formatINR } from '../lib/media.ts';
import { LostFoundBoard } from './LostFoundBoard.tsx';

interface WantedAndEventsViewProps {
  currentUser: UserProfile;
  needs: NeedRequest[];
  events: CollegeEvent[];
  notifications: AppNotification[];
  listings: ListingItem[];
  lostFoundPosts: LostFoundPost[];
  onNeedCreated: (need: NeedRequest) => void;
  onEventCreated: (event: CollegeEvent) => void;
  onSelectListing: (item: ListingItem) => void;
  onFilterByEvent: (eventId: string) => void;
  onMarkNotificationsRead: () => void;
  onLostFoundCreated: (post: LostFoundPost) => void;
  onLostFoundToggled: (post: LostFoundPost) => void;
}

const CATEGORIES: Category[] = [
  'Books',
  'Calculators',
  'Cycles',
  'Lab Gear',
  'Electronics',
  'Hostel Items',
];
const BRANCHES: Branch[] = ['All', 'CSE', 'ECE', 'ME', 'CE', 'EE'];
const SEMESTERS: Semester[] = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];

export function WantedAndEventsView({
  currentUser,
  needs,
  events,
  notifications,
  listings,
  lostFoundPosts,
  onNeedCreated,
  onEventCreated,
  onSelectListing,
  onFilterByEvent,
  onMarkNotificationsRead,
  onLostFoundCreated,
  onLostFoundToggled,
}: WantedAndEventsViewProps) {
  const [subTab, setSubTab] = useState<'wanted' | 'events' | 'lost-found'>('wanted');

  // Need form
  const [needTitle, setNeedTitle] = useState('');
  const [needCat, setNeedCat] = useState<Category>('Calculators');
  const [needBranch, setNeedBranch] = useState<Branch>('ME');
  const [needSem, setNeedSem] = useState<Semester>('Sem 3');
  const [needBudget, setNeedBudget] = useState<number>(800);
  const [needNotes, setNeedNotes] = useState('');
  const [needFeedback, setNeedFeedback] = useState<string | null>(null);

  // Event form
  const [evtName, setEvtName] = useState('');
  const [evtType, setEvtType] = useState('Hackathon');
  const [evtDate, setEvtDate] = useState(
    new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10)
  );
  const [evtVenue, setEvtVenue] = useState('Innovation Hall');
  const [evtBundle, setEvtBundle] = useState('Rent power strips, extension boards & laptop stands');

  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needTitle.trim()) return;
    const res = await fetch('/api/needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: needTitle,
        category: needCat,
        branch: needBranch,
        semester: needSem,
        max_budget: needBudget,
        requester_id: currentUser.id,
        notes: needNotes,
      }),
    });
    const data = await res.json();
    if (res.ok && data.need) {
      onNeedCreated(data.need);
      setNeedFeedback(
        data.need.senior_match_count > 0
          ? `Posted! ${data.need.senior_match_count} senior(s) already have a match.`
          : `Saved! You'll be notified the second a senior lists "${needTitle}".`
      );
      setNeedTitle('');
      setNeedNotes('');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtName.trim()) return;
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: evtName,
        event_type: evtType,
        event_date: evtDate,
        venue: evtVenue,
        organizer: currentUser.nickname,
        bundle_suggestion: evtBundle,
      }),
    });
    const data = await res.json();
    if (res.ok && data.event) {
      onEventCreated(data.event);
      setEvtName('');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-[#DBEAFE] nb-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-md border-2 border-[#161816] bg-white px-2.5 py-0.5 font-mono text-[11px] font-extrabold uppercase">
            Campus Hub
          </span>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-[#161816] tracking-tight">
            Wanted Alerts, College Events &amp; Lost and Found
          </h1>
        </div>

        <div className="flex items-center border-2 border-[#161816] rounded-xl bg-white shadow-[3px_3px_0px_#161816] overflow-hidden self-start">
          {(
            [
              { id: 'wanted', label: `Wanted (${needs.length})` },
              { id: 'events', label: `Events (${events.length})` },
              { id: 'lost-found', label: `Lost & Found (${lostFoundPosts.length})` },
            ] as const
          ).map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 text-xs font-extrabold transition-colors whitespace-nowrap ${
                idx > 0 ? 'border-l-2 border-[#161816]' : ''
              } ${
                subTab === t.id
                  ? 'bg-[#FFE047] text-[#161816]'
                  : 'bg-white text-[#464B46] hover:bg-[#FFFBF0]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'wanted' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleCreateNeed}
            className="lg:col-span-5 bg-white nb-card rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-[#184D38]" />
              <h2 className="font-display text-lg font-extrabold text-[#161816]">
                Post What You Need
              </h2>
            </div>

            <input
              type="text"
              required
              value={needTitle}
              onChange={(e) => setNeedTitle(e.target.value)}
              placeholder="e.g., Casio fx-991EX or Mechanics Book"
              className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none"
            />

            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNeedCat(c)}
                  className={`nb-btn-sm px-2.5 py-1.5 text-xs font-bold ${
                    needCat === c ? 'bg-[#FFE047] text-[#161816]' : 'bg-white text-[#2F342F]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={needBranch}
                onChange={(e) => setNeedBranch(e.target.value as Branch)}
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                value={needSem}
                onChange={(e) => setNeedSem(e.target.value as Semester)}
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={50}
                value={needBudget}
                onChange={(e) => setNeedBudget(Number(e.target.value))}
                placeholder="Max ₹"
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 font-mono text-xs font-bold tabular-nums"
              />
            </div>

            <textarea
              rows={2}
              value={needNotes}
              onChange={(e) => setNeedNotes(e.target.value)}
              placeholder="Pickup preference or exam deadline..."
              className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs"
            />

            {needFeedback && (
              <p className="rounded-lg border-2 border-[#161816] bg-[#D1FAE5] px-3 py-2 text-xs font-bold text-[#144230] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{needFeedback}</span>
              </p>
            )}

            <button
              type="submit"
              className="nb-btn w-full bg-[#184D38] px-4 py-3 text-sm font-extrabold text-white"
            >
              Post Need &amp; Enable Alerts
            </button>
          </form>

          <div className="lg:col-span-7 space-y-5">
            {/* Notification feed */}
            <div className="bg-[#FEF08A] nb-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-display text-base font-extrabold text-[#161816]">
                  <Bell className="h-4 w-4 text-[#161816]" />
                  Live Match Notifications
                </span>
                {notifications.some((n) => !n.is_read) && (
                  <button
                    type="button"
                    onClick={onMarkNotificationsRead}
                    className="text-xs font-extrabold text-[#184D38] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.slice(0, 4).map((n) => {
                const target = listings.find((l) => l.id === n.listing_id);
                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border-2 border-[#161816] p-3 flex items-center justify-between gap-3 text-xs ${
                      n.is_read ? 'bg-white' : 'bg-[#D1FAE5]'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-[#161816]">{n.title}</p>
                      <p className="font-medium text-[#2F342F] mt-0.5">{n.message}</p>
                    </div>
                    {target && (
                      <button
                        type="button"
                        onClick={() => onSelectListing(target)}
                        className="nb-btn-sm px-2.5 py-1.5 bg-white font-extrabold text-[#184D38] shrink-0"
                      >
                        View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Open Needs */}
            <div className="space-y-3">
              {needs.map((n) => {
                const matched = listings.filter((l) => n.matched_listing_ids.includes(l.id));
                return (
                  <div
                    key={n.id}
                    className="bg-white nb-card rounded-xl p-5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-[#5B605B]">
                          <span className="text-[#184D38]">{n.category}</span> · {n.branch} · {n.semester}
                        </div>
                        <h3 className="mt-0.5 font-display text-base font-extrabold text-[#161816]">
                          {n.title}
                        </h3>
                      </div>
                      <span className="rounded-md border border-[#161816] bg-[#FFE047] px-2.5 py-1 font-mono text-sm font-extrabold text-[#161816] tabular-nums">
                        Max {formatINR(n.max_budget)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#2F342F]">{n.notes}</p>
                    <div className="pt-2 border-t-2 border-[#161816]/15 flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {n.requester_avatar} {n.requester_nickname} ({n.requester_trust})
                      </span>
                      {n.senior_match_count > 0 && matched[0] ? (
                        <button
                          type="button"
                          onClick={() => onSelectListing(matched[0])}
                          className="inline-flex items-center gap-1 font-extrabold text-[#184D38] hover:underline"
                        >
                          <span>{n.senior_match_count} senior(s) have this</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-[#853D06] font-bold">
                          Watching for senior listings...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleCreateEvent}
            className="lg:col-span-4 bg-white nb-card rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-[#853D06]" />
              <h2 className="font-display text-lg font-extrabold text-[#161816]">
                Organiser: Post Campus Event
              </h2>
            </div>
            <input
              type="text"
              required
              value={evtName}
              onChange={(e) => setEvtName(e.target.value)}
              placeholder="Event name (e.g., Spring Robotics Sprint)"
              className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-sm font-medium"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={evtType}
                onChange={(e) => setEvtType(e.target.value)}
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              >
                <option>Hackathon</option>
                <option>Cultural Fest</option>
                <option>Techfest</option>
                <option>Farewell</option>
                <option>Fresher&apos;s Week</option>
              </select>
              <input
                type="date"
                required
                value={evtDate}
                onChange={(e) => setEvtDate(e.target.value)}
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              />
            </div>
            <input
              type="text"
              value={evtVenue}
              onChange={(e) => setEvtVenue(e.target.value)}
              placeholder="Venue"
              className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
            />
            <textarea
              rows={2}
              value={evtBundle}
              onChange={(e) => setEvtBundle(e.target.value)}
              placeholder="Recommended bundle (e.g., rent blazers or power strips)"
              className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="nb-btn w-full bg-[#184D38] px-4 py-3 text-sm font-extrabold text-white"
            >
              Create Event Bundle
            </button>
          </form>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <article
                key={ev.id}
                className="bg-white nb-card rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded border border-[#161816] bg-[#FEF08A] px-2 py-0.5 font-extrabold text-[#161816]">
                      {ev.event_type}
                    </span>
                    <span className="font-mono font-extrabold text-[#184D38] tabular-nums">
                      In {ev.days_remaining} days
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-[#161816]">{ev.name}</h3>
                  <p className="text-xs font-semibold text-[#464B46] flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {ev.event_date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {ev.venue}
                    </span>
                  </p>
                  <p className="text-xs text-[#2F342F]">{ev.description}</p>
                  <p className="text-xs font-bold text-[#144230] bg-[#D1FAE5] border border-[#161816] rounded-lg px-3 py-2">
                    Bundle: {ev.bundle_suggestion}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-[#161816]/15 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#5B605B]">By {ev.organizer}</span>
                  <button
                    type="button"
                    onClick={() => onFilterByEvent(ev.id)}
                    className="inline-flex items-center gap-1 font-extrabold text-[#184D38] hover:underline"
                  >
                    <span>Browse {ev.listing_count} items</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {subTab === 'lost-found' && (
        <LostFoundBoard
          posts={lostFoundPosts}
          onCreated={onLostFoundCreated}
          onToggled={onLostFoundToggled}
        />
      )}
    </section>
  );
}
