import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Bike,
  BookOpen,
  Calculator,
  CheckCircle2,
  Cpu,
  Film,
  FlaskConical,
  Lamp,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Ticket,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AppNotification,
  Branch,
  Category,
  CollegeEvent,
  ConditionSticker,
  ImpactStats,
  ListingItem,
  LostFoundPost,
  NeedRequest,
  RentalRecord,
  Semester,
  SwapProposal,
  UserProfile,
} from './shared/types.ts';
import {
  formatINR,
  HERO_IMAGE_URL,
  HERO_VIDEO_URL,
  type MediaLightboxPayload,
} from './lib/media.ts';
import { ListingCard } from './components/ListingCard.tsx';
import { ItemDetailModal } from './components/ItemDetailModal.tsx';
import { MediaLightboxModal } from './components/MediaLightboxModal.tsx';
import { SellStudio } from './components/SellStudio.tsx';
import { WantedAndEventsView } from './components/WantedAndEventsView.tsx';
import { MyTradesView } from './components/MyTradesView.tsx';
import { ProfileAndDataView } from './components/ProfileAndDataView.tsx';
import { DashboardView, type DashboardRoleView } from './components/DashboardView.tsx';
import { ConditionStickerBadge, VerifiedCampusMark } from './components/ConditionSticker.tsx';

type ActiveTab =
  | 'marketplace'
  | 'dashboard'
  | 'sell'
  | 'wanted-events'
  | 'trades'
  | 'profile-data';

const CATEGORY_TILES: {
  id: Category;
  icon: typeof BookOpen;
  bg: string;
}[] = [
  { id: 'Books', icon: BookOpen, bg: 'bg-[#DBEAFE]' },
  { id: 'Calculators', icon: Calculator, bg: 'bg-[#FEF08A]' },
  { id: 'Cycles', icon: Bike, bg: 'bg-[#D1FAE5]' },
  { id: 'Lab Gear', icon: FlaskConical, bg: 'bg-[#DDD6FE]' },
  { id: 'Electronics', icon: Cpu, bg: 'bg-[#FCA5A5]' },
  { id: 'Hostel Items', icon: Lamp, bg: 'bg-[#FFE047]' },
];

const BRANCHES: Branch[] = ['All', 'CSE', 'ECE', 'ME', 'CE', 'EE'];
const SEMESTERS: Semester[] = [
  'All',
  'Sem 1',
  'Sem 2',
  'Sem 3',
  'Sem 4',
  'Sem 5',
  'Sem 6',
  'Sem 7',
  'Sem 8',
];
const STICKERS: ('All' | ConditionSticker)[] = [
  'All',
  'Like New',
  'Well Loved',
  'Battle-Scarred',
];
const TYPES = [
  { id: 'all', label: 'All Deals', activeBg: 'bg-[#161816] text-white' },
  { id: 'sale', label: 'Buy (SELL)', activeBg: 'bg-[#FFE047] text-[#161816]' },
  { id: 'swap', label: 'Swap', activeBg: 'bg-[#DDD6FE] text-[#161816]' },
  { id: 'borrow', label: 'Borrow (Free)', activeBg: 'bg-[#5EEAD4] text-[#161816]' },
  { id: 'rent', label: 'Rent', activeBg: 'bg-[#FCA5A5] text-[#161816]' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('marketplace');
  const [dashboardRole, setDashboardRole] = useState<DashboardRoleView>('user');

  // Marketplace filters
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [allListingsForCounts, setAllListingsForCounts] = useState<ListingItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | Category>('All');
  const [stickerFilter, setStickerFilter] = useState<'All' | ConditionSticker>('All');
  const [typeFilter, setTypeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState<Branch>('All');
  const [semesterFilter, setSemesterFilter] = useState<Semester>('All');
  const [eventFilter, setEventFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [eventBannerDismissed, setEventBannerDismissed] = useState(false);

  // Campus entities
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState('USR-28');
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [needs, setNeeds] = useState<NeedRequest[]>([]);
  const [swaps, setSwaps] = useState<SwapProposal[]>([]);
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lostFoundPosts, setLostFoundPosts] = useState<LostFoundPost[]>([]);
  const [impact, setImpact] = useState<ImpactStats | null>(null);

  const [selectedItem, setSelectedItem] = useState<ListingItem | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaLightboxPayload | null>(null);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5000);
  }, []);

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (categoryFilter !== 'All') params.set('category', categoryFilter);
      if (stickerFilter !== 'All') params.set('condition', stickerFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (branchFilter !== 'All') params.set('branch', branchFilter);
      if (semesterFilter !== 'All') params.set('semester', semesterFilter);
      if (eventFilter !== 'All') params.set('event_id', eventFilter);
      if (maxPrice) params.set('max_price', maxPrice);
      params.set('sort', sortOrder);

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingListings(false);
    }
  }, [
    searchQuery,
    categoryFilter,
    stickerFilter,
    typeFilter,
    branchFilter,
    semesterFilter,
    eventFilter,
    maxPrice,
    sortOrder,
  ]);

  const fetchCampusData = useCallback(async () => {
    try {
      const [uRes, eRes, nRes, sRes, rRes, ntfRes, lfRes, impRes, allLRes] =
        await Promise.all([
          fetch('/api/users'),
          fetch('/api/events'),
          fetch('/api/needs'),
          fetch('/api/swaps'),
          fetch('/api/rentals'),
          fetch('/api/notifications'),
          fetch('/api/lost-found'),
          fetch('/api/impact'),
          fetch('/api/listings'),
        ]);
      const [uD, eD, nD, sD, rD, ntfD, lfD, impD, allLD] = await Promise.all([
        uRes.json(),
        eRes.json(),
        nRes.json(),
        sRes.json(),
        rRes.json(),
        ntfRes.json(),
        lfRes.json(),
        impRes.json(),
        allLRes.json(),
      ]);
      setUsers(uD.users || []);
      setEvents(eD.events || []);
      setNeeds(nD.needs || []);
      setSwaps(sD.swaps || []);
      setRentals(rD.rentals || []);
      setNotifications(ntfD.notifications || []);
      setLostFoundPosts(lfD.posts || []);
      setImpact(impD);
      setAllListingsForCounts(allLD.listings || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    fetchCampusData();
  }, [fetchCampusData]);

  const currentUser: UserProfile = users.find((u) => u.id === currentUserId) ||
    users[0] || {
      id: 'USR-28',
      nickname: 'QuietReader',
      branch: 'ME',
      year: 2,
      hostel: 'Hostel B',
      avatar_emoji: '🌱',
      profile_stickers: ['🌱 Eco Warrior'],
      theme_color: '#184D38',
      bio: 'Campus student',
      status_line: '😎 Hunting Deals',
      completed_trades: 3,
      cancelled_trades: 0,
      avg_response_mins: 15,
      condition_accuracy: 4.8,
      rent_on_time: 1,
      rent_late: 0,
      campus_verified: false,
      trust_badge: {
        level: 'Reliable',
        score: 72,
        summary: 'Reliable (72/100)',
        breakdown: [],
      },
    };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkNotificationsRead = async () => {
    const res = await fetch('/api/notifications/read', { method: 'POST' });
    const data = await res.json();
    setNotifications(data.notifications || []);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStickerFilter('All');
    setTypeFilter('all');
    setBranchFilter('All');
    setSemesterFilter('All');
    setEventFilter('All');
    setMaxPrice('');
    setSortOrder('newest');
  };

  const hasFilters =
    Boolean(searchQuery) ||
    categoryFilter !== 'All' ||
    stickerFilter !== 'All' ||
    typeFilter !== 'all' ||
    branchFilter !== 'All' ||
    semesterFilter !== 'All' ||
    eventFilter !== 'All' ||
    Boolean(maxPrice);

  const navTabs: { id: ActiveTab; label: string }[] = [
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sell', label: 'List in 45s' },
    { id: 'wanted-events', label: 'Wanted & Events' },
    { id: 'profile-data', label: 'Insights' },
  ];

  const openDashboardRole = (role: DashboardRoleView) => {
    setDashboardRole(role);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBF0] text-[#161816]">
      {/* Clean Neo-Brutalist Header with Quick User / Seller View Switcher */}
      <header className="bg-[#FFFBF0] border-b-2 border-[#161816] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className="nb-btn-sm bg-[#FFE047] px-3 py-1.5 font-display text-sm sm:text-base font-extrabold tracking-tight text-[#161816] whitespace-nowrap shrink-0"
          >
            🌱 Second Life
          </button>

          {/* Segmented Tab Box */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center border-2 border-[#161816] rounded-xl bg-white shadow-[3px_3px_0px_#161816] overflow-hidden"
          >
            {navTabs.map((nav, idx) => {
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveTab(nav.id)}
                  className={`px-3.5 py-2 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                    idx > 0 ? 'border-l-2 border-[#161816]' : ''
                  } ${
                    isActive
                      ? 'bg-[#FFE047] text-[#161816]'
                      : 'bg-white text-[#2F342F] hover:bg-[#FFFBF0]'
                  }`}
                >
                  {nav.label}
                </button>
              );
            })}
          </nav>

          {/* Dual Role View Quick Toggle + Persona Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:inline-flex items-center rounded-xl border-2 border-[#161816] bg-white shadow-[2px_2px_0px_#161816] overflow-hidden">
              <button
                type="button"
                onClick={() => openDashboardRole('user')}
                title="Open Personalised User / Buyer Dashboard"
                className={`px-2.5 py-1.5 text-[11px] font-extrabold inline-flex items-center gap-1 ${
                  activeTab === 'dashboard' && dashboardRole === 'user'
                    ? 'bg-[#5EEAD4] text-[#161816]'
                    : 'bg-white text-[#161816] hover:bg-[#FFFBF0]'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{currentUser.avatar_emoji} User</span>
              </button>
              <button
                type="button"
                onClick={() => openDashboardRole('seller')}
                title="Open Seller Dashboard"
                className={`px-2.5 py-1.5 text-[11px] font-extrabold border-l-2 border-[#161816] inline-flex items-center gap-1 ${
                  activeTab === 'dashboard' && dashboardRole === 'seller'
                    ? 'bg-[#184D38] text-white'
                    : 'bg-white text-[#161816] hover:bg-[#FFFBF0]'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                <span>Seller</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNotifDrawerOpen(true)}
              aria-label="Campus alerts"
              className="nb-btn-sm relative bg-[#FEF08A] p-2 text-[#161816]"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-[#184D38] text-white font-mono text-[10px] font-extrabold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sell')}
              className="nb-btn-sm px-3.5 py-1.5 text-xs font-extrabold text-white bg-[#184D38] whitespace-nowrap shrink-0"
            >
              + List
            </button>
          </div>
        </div>

        {/* Mobile / Tablet nav */}
        <div className="flex lg:hidden items-center gap-2 overflow-x-auto px-4 py-2 border-t-2 border-[#161816] bg-white">
          {navTabs.map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => setActiveTab(nav.id)}
              className={`nb-btn-sm whitespace-nowrap shrink-0 px-3 py-1 text-xs font-extrabold ${
                activeTab === nav.id ? 'bg-[#FFE047] text-[#161816]' : 'bg-[#FFFBF0] text-[#464B46]'
              }`}
            >
              {nav.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => openDashboardRole('seller')}
            className="nb-btn-sm whitespace-nowrap shrink-0 px-3 py-1 text-xs font-extrabold bg-[#D1FAE5] text-[#144230]"
          >
            🏪 Seller View
          </button>
        </div>
      </header>

      <main className="flex-1">
        {activeTab === 'marketplace' && (
          <div>
            {/* Compact, Decluttered Hero Banner + Clickable Hero Photo & Video */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4 space-y-4">
              <div className="bg-[#FFE047] nb-card-lg rounded-2xl p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#161816] bg-white px-2.5 py-0.5 text-xs font-extrabold">
                      <span>{currentUser.avatar_emoji}</span>
                      <span>{currentUser.nickname}</span>
                      <VerifiedCampusMark verified={currentUser.campus_verified} />
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#161816]/80">
                      {impact
                        ? `${formatINR(impact.total_rupees_saved)} saved · ${impact.total_kg_waste_avoided} kg avoided`
                        : 'Loading impact...'}
                    </span>
                  </div>

                  <div className="bg-white border-2 border-[#161816] rounded-xl px-4 py-3 shadow-[4px_4px_0px_#161816] -rotate-[0.4deg]">
                    <h1
                      className="font-display font-extrabold tracking-tight text-[#161816]"
                      style={{
                        fontSize: 'clamp(1.5rem, 2.8vw, 2.3rem)',
                        lineHeight: 1.15,
                      }}
                    >
                      Give campus gear a{' '}
                      <span className="inline-block bg-[#5EEAD4] border-2 border-[#161816] px-2 py-0.5 rounded-lg">
                        SECOND LIFE!
                      </span>
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => openDashboardRole('user')}
                      className="nb-btn-sm inline-flex items-center gap-1.5 bg-[#5EEAD4] px-4 py-2 text-xs font-extrabold text-[#161816]"
                    >
                      <span>{currentUser.avatar_emoji} My User Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDashboardRole('seller')}
                      className="nb-btn-sm inline-flex items-center gap-1.5 bg-white px-4 py-2 text-xs font-extrabold text-[#161816]"
                    >
                      <Store className="h-3.5 w-3.5" />
                      <span>Seller Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sell')}
                      className="nb-btn-sm inline-flex items-center gap-1.5 bg-[#184D38] px-4 py-2 text-xs font-extrabold text-white"
                    >
                      <span>List in 45s</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Clickable Hero Photo + Clickable Video Tour */}
                <div className="lg:col-span-5 relative rounded-xl overflow-hidden nb-card bg-white aspect-[16/9]">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMedia({
                        title: 'Campus Gear Showcase',
                        subtitle: 'Calculators, Textbooks, Cycles & Lab Gear — Seeded Fair Prices',
                        imageUrl: HERO_IMAGE_URL,
                        videoUrl: HERO_VIDEO_URL,
                        initialMode: 'image',
                        mascotEmoji: '🌱',
                        mascotLine: "Don't buy new when someone on campus already has what you need!",
                      })
                    }
                    className="w-full h-full block cursor-zoom-in"
                    title="Click image to view larger"
                  >
                    <img
                      src={HERO_IMAGE_URL}
                      alt="Sunlit campus student desk with scientific calculator, textbooks, and compass"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMedia({
                        title: 'Campus Gear Video Tour',
                        subtitle: '4-second Gear Inspection Preview',
                        imageUrl: HERO_IMAGE_URL,
                        videoUrl: HERO_VIDEO_URL,
                        initialMode: 'video',
                        mascotEmoji: '🎬',
                        mascotLine: 'Click any item photo or Video button across cards to inspect gear!',
                      })
                    }
                    className="nb-btn-sm absolute bottom-2.5 right-2.5 bg-[#FFE047] px-3 py-1 text-xs font-extrabold text-[#161816] inline-flex items-center gap-1.5"
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Watch Video</span>
                  </button>
                </div>
              </div>

              {/* Compact 3-Highlight Pastel Strip (decluttered) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === 'sale' ? 'all' : 'sale')}
                  className="bg-[#DBEAFE] nb-btn-sm rounded-xl px-4 py-2.5 text-left flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-extrabold text-[#161816]">
                    1. 🧾 Receipt-Fitted Fair Pricing
                  </span>
                  <span className="text-[11px] font-bold text-[#1E3A8A] shrink-0">Buy →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === 'borrow' ? 'all' : 'borrow')}
                  className="bg-[#FEF08A] nb-btn-sm rounded-xl px-4 py-2.5 text-left flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-extrabold text-[#161816]">
                    2. 🔁 Swaps &amp; Free Lab Borrow
                  </span>
                  <span className="text-[11px] font-bold text-[#161816] shrink-0">Borrow →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('trades')}
                  className="bg-[#D1FAE5] nb-btn-sm rounded-xl px-4 py-2.5 text-left flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-extrabold text-[#161816]">
                    3. ⭐ Active Trades &amp; Reviews
                  </span>
                  <span className="text-[11px] font-bold text-[#144230] shrink-0">Open →</span>
                </button>
              </div>

              {/* Compact Category Pills */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {CATEGORY_TILES.map(({ id, icon: Icon, bg }) => {
                  const count = allListingsForCounts.filter((l) => l.category === id).length;
                  const active = categoryFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategoryFilter(active ? 'All' : id)}
                      className={`nb-btn-sm flex items-center justify-between gap-2 px-3 py-2 text-left ${
                        active ? 'bg-[#184D38] text-white' : `${bg} text-[#161816]`
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold truncate">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{id}</span>
                      </span>
                      <span className="rounded border border-[#161816] bg-white px-1.5 font-mono text-[10px] font-extrabold text-[#161816] tabular-nums">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dismissible Upcoming Campus Events Strip */}
              {events.length > 0 && !eventBannerDismissed && (
                <div className="bg-white nb-card rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#853D06]">
                    <Ticket className="h-3.5 w-3.5 shrink-0" />
                    <span>Events:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {events.slice(0, 4).map((ev) => {
                      const active = eventFilter === ev.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setEventFilter(active ? 'All' : ev.id)}
                          className={`nb-btn-sm px-2.5 py-0.5 text-[11px] font-bold ${
                            active ? 'bg-[#FFE047] text-[#161816]' : 'bg-[#FFFBF0] text-[#161816]'
                          }`}
                        >
                          {ev.name} · {ev.days_remaining}d
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setEventBannerDismissed(true)}
                      aria-label="Dismiss event banner"
                      className="p-1 rounded hover:bg-[#EFEFE9] text-[#5B605B]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Streamlined Filter Bar + Listings Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-5">
              <div className="bg-white nb-card rounded-2xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161816]"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Casio, CLRS, Hero cycle, lab coat borrow..."
                      className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] pl-10 pr-4 py-2 text-sm font-medium focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTypeFilter(t.id)}
                        className={`nb-btn-sm px-2.5 py-1.5 text-xs font-extrabold ${
                          typeFilter === t.id ? t.activeBg : 'bg-white text-[#2F342F]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowMoreFilters((s) => !s)}
                      className={`nb-btn-sm px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 ${
                        showMoreFilters ? 'bg-[#FFE047] text-[#161816]' : 'bg-[#FFFBF0] text-[#161816]'
                      }`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Filters</span>
                    </button>

                    {hasFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-[#184D38] hover:underline px-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Secondary Filters (Branch, Semester, Price, Stickers, Sort) */}
                {showMoreFilters && (
                  <div className="pt-3 border-t-2 border-[#161816]/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Filter by branch"
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value as Branch)}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-1.5 text-xs font-bold"
                      >
                        {BRANCHES.map((b) => (
                          <option key={b} value={b}>
                            {b === 'All' ? 'All Branches' : `Branch: ${b}`}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="Filter by semester"
                        value={semesterFilter}
                        onChange={(e) => setSemesterFilter(e.target.value as Semester)}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-1.5 text-xs font-bold"
                      >
                        {SEMESTERS.map((s) => (
                          <option key={s} value={s}>
                            {s === 'All' ? 'All Semesters' : s}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="Filter by max price"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-1.5 text-xs font-bold"
                      >
                        <option value="">Any Price</option>
                        <option value="500">Under ₹500</option>
                        <option value="1000">Under ₹1,000</option>
                        <option value="2500">Under ₹2,500</option>
                        <option value="4000">Under ₹4,000</option>
                      </select>

                      <select
                        aria-label="Sort listings"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-1.5 text-xs font-bold"
                      >
                        <option value="newest">Newest</option>
                        <option value="best_deal">Best Deal vs Fair Price</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {STICKERS.map((st) => {
                        const active = stickerFilter === st;
                        if (st === 'All') {
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setStickerFilter('All')}
                              className={`nb-btn-sm px-2.5 py-1 text-xs font-extrabold ${
                                active ? 'bg-[#161816] text-white' : 'bg-white text-[#464B46]'
                              }`}
                            >
                              All
                            </button>
                          );
                        }
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStickerFilter(active ? 'All' : st)}
                            className={`rounded-lg transition-transform ${
                              active ? 'scale-105 ring-2 ring-[#184D38]' : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            <ConditionStickerBadge condition={st} size="sm" tilted={false} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {loadingListings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-80 rounded-2xl bg-white nb-card animate-pulse"
                    />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="bg-[#FEF08A] nb-card rounded-2xl p-8 text-center space-y-3">
                  <p className="font-display text-lg font-extrabold text-[#161816]">
                    No active listings match those filters right now.
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="nb-btn-sm bg-white px-4 py-2 text-xs font-extrabold"
                    >
                      Clear Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('wanted-events')}
                      className="nb-btn-sm bg-[#184D38] px-4 py-2 text-xs font-extrabold text-white"
                    >
                      Post a Wanted Alert
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {listings.map((item) => (
                    <ListingCard
                      key={item.id}
                      item={item}
                      onSelect={(it) => setSelectedItem(it)}
                      onOpenMedia={(media) => setActiveMedia(media)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            users={users}
            roleView={dashboardRole}
            onChangeRoleView={setDashboardRole}
            onSwitchUser={(id) => {
              setCurrentUserId(id);
              showToast('Switched campus persona!');
            }}
            onSelectListing={(it) => setSelectedItem(it)}
            onOpenMedia={(media) => setActiveMedia(media)}
            onOpenSellStudio={() => setActiveTab('sell')}
            onRefreshAll={(msg) => {
              fetchListings();
              fetchCampusData();
              if (msg) showToast(msg);
            }}
          />
        )}

        {activeTab === 'sell' && (
          <SellStudio
            currentUser={currentUser}
            events={events}
            onOpenMedia={(media) => setActiveMedia(media)}
            onCreated={(newListing, triggeredNtfs) => {
              fetchListings();
              fetchCampusData();
              const priceLabel =
                newListing.transaction_type === 'borrow'
                  ? 'Free Borrow'
                  : formatINR(newListing.asking_price);
              if (triggeredNtfs.length > 0) {
                showToast(
                  `Listed "${newListing.title}" (${priceLabel}) — ${triggeredNtfs.length} junior Need alert(s) notified!`
                );
              } else {
                showToast(`Published "${newListing.title}" (${priceLabel})!`);
              }
              setDashboardRole('seller');
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'wanted-events' && (
          <WantedAndEventsView
            currentUser={currentUser}
            needs={needs}
            events={events}
            notifications={notifications}
            listings={allListingsForCounts}
            lostFoundPosts={lostFoundPosts}
            onNeedCreated={() => {
              fetchCampusData();
              showToast('Wanted alert posted!');
            }}
            onEventCreated={() => {
              fetchCampusData();
              showToast('Campus event published!');
            }}
            onSelectListing={(it) => setSelectedItem(it)}
            onFilterByEvent={(evId) => {
              setEventFilter(evId);
              setActiveTab('marketplace');
            }}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onLostFoundCreated={() => {
              fetchCampusData();
              showToast('Posted to Campus Lost & Found!');
            }}
            onLostFoundToggled={() => fetchCampusData()}
          />
        )}

        {activeTab === 'trades' && (
          <MyTradesView
            currentUser={currentUser}
            users={users}
            swaps={swaps}
            rentals={rentals}
            onRefreshAll={(msg) => {
              fetchListings();
              fetchCampusData();
              if (msg) showToast(msg);
            }}
          />
        )}

        {activeTab === 'profile-data' && (
          <ProfileAndDataView
            currentUser={currentUser}
            users={users}
            impact={impact}
            onSwitchUser={(id) => {
              setCurrentUserId(id);
              showToast('Switched active campus persona');
            }}
            onProfileUpdated={() => {
              fetchCampusData();
              fetchListings();
              showToast('Campus profile updated!');
            }}
          />
        )}
      </main>

      <footer className="border-t-2 border-[#161816] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-[#2F342F]">
          <p className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#184D38]" />
            GREEN · Second Life — Seeded with 200 synthetic campus sales (seed 42) in SQLite.
          </p>
          <div className="flex items-center gap-5">
            <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-[#184D38] font-bold underline">
              OpenAPI Docs (/docs)
            </a>
            <button
              type="button"
              onClick={() => setActiveTab('trades')}
              className="hover:text-[#184D38] font-bold underline"
            >
              Swaps &amp; Reviews
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile-data')}
              className="hover:text-[#184D38] font-bold underline"
            >
              Pitch Data Insights
            </button>
          </div>
        </div>
      </footer>

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          currentUser={currentUser}
          onClose={() => setSelectedItem(null)}
          onOpenMedia={(media) => setActiveMedia(media)}
          onRefresh={(updated, msg) => {
            if (updated) setSelectedItem(updated);
            fetchListings();
            fetchCampusData();
            if (msg) showToast(msg);
          }}
        />
      )}

      {activeMedia && (
        <MediaLightboxModal media={activeMedia} onClose={() => setActiveMedia(null)} />
      )}

      {/* Alerts Drawer */}
      {notifDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#161816]/50"
          role="dialog"
          aria-modal="true"
          aria-label="Campus match notifications"
        >
          <div className="w-full max-w-md bg-[#FFFBF0] h-full border-l-2 border-[#161816] shadow-2xl flex flex-col">
            <div className="px-5 py-4 bg-[#FFE047] border-b-2 border-[#161816] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#161816]" />
                <h2 className="font-display text-base font-extrabold text-[#161816]">
                  Campus Alerts ({unreadCount} unread)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNotifDrawerOpen(false)}
                className="nb-btn-sm p-1.5 bg-white text-[#161816]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {notifications.map((n) => {
                const target = allListingsForCounts.find((l) => l.id === n.listing_id);
                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border-2 border-[#161816] p-3.5 space-y-1.5 shadow-[2px_2px_0px_#161816] ${
                      n.is_read ? 'bg-white' : 'bg-[#D1FAE5]'
                    }`}
                  >
                    <p className="text-xs font-extrabold text-[#161816]">{n.title}</p>
                    <p className="text-xs font-medium text-[#2F342F]">{n.message}</p>
                    {target && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotifDrawerOpen(false);
                          setSelectedItem(target);
                        }}
                        className="text-xs font-extrabold text-[#184D38] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Inspect Listing</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t-2 border-[#161816] bg-white flex justify-between items-center">
              <button
                type="button"
                onClick={handleMarkNotificationsRead}
                className="text-xs font-extrabold text-[#184D38] hover:underline"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotifDrawerOpen(false);
                  setActiveTab('wanted-events');
                }}
                className="nb-btn-sm px-3.5 py-2 bg-[#184D38] text-xs font-extrabold text-white"
              >
                Open Wanted Board
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-md bg-[#161816] text-white border-2 border-[#FFE047] px-4 py-3 rounded-xl shadow-[4px_4px_0px_#FFE047] flex items-center gap-2.5 text-xs font-bold"
        >
          <CheckCircle2 className="h-4 w-4 text-[#5EEAD4] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
