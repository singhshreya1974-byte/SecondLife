import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Check,
  Clock,
  Film,
  HandHeart,
  Image as ImageIcon,
  Info,
  Lock,
  Repeat,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
} from 'lucide-react';
import type {
  AppNotification,
  Branch,
  Category,
  CollegeEvent,
  ConditionSticker,
  ItemMascot,
  ListingItem,
  ListingType,
  PriceSuggestion,
  Semester,
  UserProfile,
} from '../shared/types.ts';
import {
  formatINR,
  getCategoryImage,
  getCategoryVideo,
  type MediaLightboxPayload,
} from '../lib/media.ts';
import { CONDITION_META, ConditionStickerBadge } from './ConditionSticker.tsx';

interface SellStudioProps {
  currentUser: UserProfile;
  events: CollegeEvent[];
  onCreated: (listing: ListingItem, notifications: AppNotification[]) => void;
  onOpenMedia?: (media: MediaLightboxPayload) => void;
}

const PRESETS: {
  label: string;
  title: string;
  category: Category;
  subcategory: string;
  mrp: number;
  age: number;
  sticker: ConditionSticker;
  branch: Branch;
  semester: Semester;
  addons: string[];
  color: string;
  defaultTx: ListingType;
}[] = [
  {
    label: 'Scientific Calculator',
    title: 'Casio fx-991EX ClassWiz',
    category: 'Calculators',
    subcategory: 'Scientific',
    mrp: 1200,
    age: 2,
    sticker: 'Well Loved',
    branch: 'ME',
    semester: 'Sem 3',
    addons: ['Slide-on hard cover', 'Fresh button cell'],
    color: 'Matte Black',
    defaultTx: 'sale',
  },
  {
    label: 'Core Textbook',
    title: 'CLRS Introduction to Algorithms',
    category: 'Books',
    subcategory: 'CS Core',
    mrp: 1050,
    age: 1,
    sticker: 'Like New',
    branch: 'CSE',
    semester: 'Sem 3',
    addons: ['Sticky index tabs'],
    color: 'Navy Blue',
    defaultTx: 'swap',
  },
  {
    label: 'Hostel Cycle',
    title: 'Hero Sprint Single-Speed Cycle',
    category: 'Cycles',
    subcategory: 'Single Speed',
    mrp: 6500,
    age: 2,
    sticker: 'Well Loved',
    branch: 'All',
    semester: 'All',
    addons: ['U-Lock + 2 keys', 'Bottle cage'],
    color: 'Forest Green',
    defaultTx: 'sale',
  },
  {
    label: 'Free Lab Coat (Borrow)',
    title: 'White Cotton Lab Coat (Size M)',
    category: 'Lab Gear',
    subcategory: 'Lab Wear',
    mrp: 500,
    age: 1,
    sticker: 'Like New',
    branch: 'All',
    semester: 'Sem 1',
    addons: ['Safety goggles'],
    color: 'Crisp White',
    defaultTx: 'borrow',
  },
  {
    label: 'Power Bank (Rent)',
    title: 'Anker 20000mAh Power Bank',
    category: 'Electronics',
    subcategory: 'Power',
    mrp: 2400,
    age: 1,
    sticker: 'Like New',
    branch: 'All',
    semester: 'All',
    addons: ['Braided USB-C cable'],
    color: 'Graphite',
    defaultTx: 'rent',
  },
  {
    label: 'Kettle + Desk Lamp',
    title: 'Prestige 1.5L Kettle + Study Lamp',
    category: 'Hostel Items',
    subcategory: 'Appliances',
    mrp: 1300,
    age: 1,
    sticker: 'Well Loved',
    branch: 'All',
    semester: 'All',
    addons: ['Detachable base'],
    color: 'Brushed Steel',
    defaultTx: 'sale',
  },
];

const CATEGORIES: Category[] = [
  'Calculators',
  'Books',
  'Cycles',
  'Lab Gear',
  'Electronics',
  'Hostel Items',
];
const STICKERS: ConditionSticker[] = ['Like New', 'Well Loved', 'Battle-Scarred'];
const AGES = [0.5, 1, 2, 3, 4];
const MRP_CHIPS = [500, 850, 1200, 2400, 6500];
const BRANCHES: Branch[] = ['All', 'CSE', 'ECE', 'ME', 'CE', 'EE'];
const SEMESTERS: Semester[] = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
const ADDON_CHIPS = [
  'Slide-on hard cover',
  'Fresh button cell',
  'Braided USB-C cable',
  'Sticky index tabs',
  'U-Lock + 2 keys',
  'Carry pouch',
];
const COLOR_CHIPS = ['Matte Black', 'Forest Green', 'Navy Blue', 'Brushed Steel', 'Warm Silver'];

const TX_MODES: {
  id: ListingType;
  title: string;
  sub: string;
  activeBg: string;
  icon: typeof Tag;
}[] = [
  { id: 'sale', title: 'SELL', sub: 'Fair price + nego', activeBg: 'bg-[#FFE047]', icon: ShieldCheck },
  { id: 'swap', title: 'SWAP', sub: '1-to-1 item trade', activeBg: 'bg-[#DDD6FE]', icon: Repeat },
  { id: 'borrow', title: 'BORROW', sub: 'Free campus lend', activeBg: 'bg-[#5EEAD4]', icon: HandHeart },
  { id: 'rent', title: 'RENT', sub: 'Weekly fee + dep', activeBg: 'bg-[#FCA5A5]', icon: CalendarClock },
];

export function SellStudio({ currentUser, events, onCreated, onOpenMedia }: SellStudioProps) {
  const [transactionType, setTransactionType] = useState<ListingType>('sale');
  const [title, setTitle] = useState('Casio fx-991EX ClassWiz');
  const [category, setCategory] = useState<Category>('Calculators');
  const [subcategory, setSubcategory] = useState('Scientific');
  const [sticker, setSticker] = useState<ConditionSticker>('Well Loved');
  const [ageYears, setAgeYears] = useState<number>(2);
  const [originalPrice, setOriginalPrice] = useState<number>(1200);
  const [branch, setBranch] = useState<Branch>('ME');
  const [semester, setSemester] = useState<Semester>('Sem 3');

  // SELL fields
  const [askingPrice, setAskingPrice] = useState<number>(740);
  const [askingTouched, setAskingTouched] = useState(false);
  const [negotiable, setNegotiable] = useState(true);
  const [minAcceptablePrice, setMinAcceptablePrice] = useState<string>('');
  const [allowBidding, setAllowBidding] = useState(true);

  // SWAP fields
  const [swapFor, setSwapFor] = useState('Sem 4 Textbook or Lab Coat');
  const [swapCategories, setSwapCategories] = useState<Category[]>(['Books']);
  const [swapMultiOk, setSwapMultiOk] = useState(true);

  // BORROW & RENT fields
  const [borrowMinDays, setBorrowMinDays] = useState<number>(1);
  const [borrowMaxDays, setBorrowMaxDays] = useState<number>(7);
  const [collectionLocation, setCollectionLocation] = useState('Central Library Steps');
  const [borrowConditions, setBorrowConditions] = useState('Return clean in original case');
  const [rentPerWeek, setRentPerWeek] = useState<number>(70);
  const [rentDeposit, setRentDeposit] = useState<number>(200);
  const [availableFrom, setAvailableFrom] = useState(new Date().toISOString().slice(0, 10));
  const [availableUntil, setAvailableUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );

  // Customization
  const [eventId, setEventId] = useState<string>('');
  const [leavingDate, setLeavingDate] = useState<string>('');
  const [addons, setAddons] = useState<string[]>(['Slide-on hard cover', 'Fresh button cell']);
  const [handwrittenNotes, setHandwrittenNotes] = useState(false);
  const [color, setColor] = useState('Matte Black');
  const [edition, setEdition] = useState('2nd Edition');
  const [customNote, setCustomNote] = useState('');
  const [customMonologue, setCustomMonologue] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');

  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [mascotPreview, setMascotPreview] = useState<ItemMascot>({
    name: 'CalcBot',
    emoji: '🧮',
    line: "Psst! Exams are coming. After 2 years of formulas, I'm still dialed in for those equations.",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leavingDays = leavingDate
    ? Math.max(0, Math.ceil((new Date(leavingDate).getTime() - Date.now()) / 86400000))
    : null;

  useEffect(() => {
    const controller = new AbortController();
    const apiCond = CONDITION_META[sticker].apiCondition;
    const params = new URLSearchParams({
      category,
      item: title,
      age: String(ageYears),
      condition: apiCond,
      original_price: String(originalPrice),
      type: transactionType,
    });
    if (leavingDays !== null) {
      params.set('leaving_days', String(leavingDays));
    }

    fetch(`/api/price-suggestion?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: PriceSuggestion) => {
        setSuggestion(data);
        if (!askingTouched) {
          setAskingPrice(data.fair_price);
          setRentPerWeek(data.rent_price_per_week);
          if (transactionType === 'rent') {
            setRentDeposit(data.suggested_deposit);
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });

    fetch(
      `/api/mascot-preview?category=${encodeURIComponent(category)}&item=${encodeURIComponent(title)}&age=${ageYears}&condition=${encodeURIComponent(apiCond)}&type=${transactionType}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.mascot) setMascotPreview(d.mascot);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [title, category, sticker, ageYears, originalPrice, transactionType, leavingDays, askingTouched]);

  const toggleAddon = (a: string) => {
    setAddons((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const toggleSwapCat = (c: Category) => {
    setSwapCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setTransactionType(p.defaultTx);
    setTitle(p.title);
    setCategory(p.category);
    setSubcategory(p.subcategory);
    setOriginalPrice(p.mrp);
    setAgeYears(p.age);
    setSticker(p.sticker);
    setBranch(p.branch);
    setSemester(p.semester);
    setAddons(p.addons);
    setColor(p.color);
    setAskingTouched(false);
    setCustomMonologue('');
    if (p.defaultTx === 'borrow') {
      setRentDeposit(0);
    }
  };

  const autoVoice = `Hi, I'm a ${title || 'campus item'}. I survived ${ageYears} ${ageYears === 1 ? 'year' : 'years'} of ${branch === 'All' ? 'campus life' : branch} and I still work!`;
  const liveVoice = customMonologue.trim() || autoVoice;

  const setQuickLeaving = (days: number | null) => {
    if (days === null) {
      setLeavingDate('');
    } else {
      setLeavingDate(new Date(Date.now() + days * 86400000).toISOString().slice(0, 10));
    }
    setAskingTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        title,
        category,
        subcategory,
        condition: CONDITION_META[sticker].apiCondition,
        age: ageYears,
        original_price: originalPrice,
        transaction_type: transactionType,
        listing_types: [transactionType],
        asking_price: transactionType === 'borrow' ? 0 : askingPrice,
        negotiable: transactionType === 'sale' ? negotiable : false,
        min_acceptable_price:
          transactionType === 'sale' && minAcceptablePrice.trim() !== ''
            ? Number(minAcceptablePrice)
            : null,
        swap_for: swapFor,
        swap_categories: swapCategories,
        swap_multi_ok: swapMultiOk,
        borrow_min_days: borrowMinDays,
        borrow_max_days: borrowMaxDays,
        collection_location: collectionLocation,
        borrow_conditions: borrowConditions,
        rent_per_week: transactionType === 'borrow' ? 0 : rentPerWeek,
        suggested_deposit: rentDeposit,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        monologue: liveVoice,
        addons,
        handwritten_notes: handwrittenNotes,
        color,
        edition,
        branch,
        semester,
        custom_note: customNote,
        image_url: customImageUrl || null,
        video_url: customVideoUrl || null,
        seller_id: currentUser.id,
        event_id: eventId || null,
        leaving_campus_date: leavingDate || null,
        allow_bidding: transactionType === 'sale' ? allowBidding : false,
      };

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not publish listing');
      } else if (data.listing) {
        onCreated(data.listing, data.triggered_notifications || []);
      }
    } catch {
      setError('Network error publishing listing');
    } finally {
      setSubmitting(false);
    }
  };

  const minSlide = suggestion ? Math.max(30, suggestion.quick_sale_price - 40) : 100;
  const maxSlide = suggestion ? suggestion.patient_price + 80 : 2000;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 bg-[#FFE047] nb-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-md border-2 border-[#161816] bg-white px-2.5 py-0.5 font-mono text-[11px] font-extrabold uppercase">
            Under-60-Second Studio
          </span>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-[#161816] tracking-tight">
            Sell, Swap, Borrow, or Rent — Tap Chips, Live Fair Price.
          </h1>
        </div>
        <div className="rounded-xl border-2 border-[#161816] bg-white px-4 py-2.5 text-xs font-bold shrink-0">
          Posting as {currentUser.avatar_emoji} {currentUser.nickname}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Unified Form */}
        <div className="lg:col-span-7 space-y-6 bg-white nb-card rounded-2xl p-6">
          {/* 1. Transaction Type Selector */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-[#161816] mb-2.5">
              1. Choose Transaction Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TX_MODES.map((m) => {
                const active = transactionType === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setTransactionType(m.id);
                      if (m.id === 'borrow') setRentDeposit(0);
                    }}
                    className={`nb-btn-sm p-3 text-left flex flex-col gap-1 ${
                      active ? `${m.activeBg} text-[#161816]` : 'bg-[#FFFBF0] text-[#464B46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-extrabold">
                        <Icon className="h-3.5 w-3.5" />
                        {m.title}
                      </span>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-[11px] font-semibold opacity-85">{m.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quick Presets & Title */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-[#161816] mb-2">
              2. Quick Preset or Item Name
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`nb-btn-sm px-3 py-1.5 text-xs font-bold ${
                    title === p.title ? 'bg-[#184D38] text-white' : 'bg-[#FFFBF0] text-[#161816]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Casio fx-991EX Scientific Calculator"
              className="mt-3 w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3.5 py-2.5 text-sm font-semibold focus:bg-white focus:outline-none"
            />
          </div>

          {/* 3. Category & Condition Stickers */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-[#161816] mb-2">
              3. Category &amp; Condition Sticker
            </label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    setAskingTouched(false);
                  }}
                  className={`nb-btn-sm px-3 py-1.5 text-xs font-bold ${
                    category === c ? 'bg-[#FFE047] text-[#161816]' : 'bg-white text-[#2F342F]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STICKERS.map((s) => {
                const selected = sticker === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSticker(s);
                      setAskingTouched(false);
                    }}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border-2 border-[#161816] p-3 text-left transition-all ${
                      selected
                        ? 'bg-[#FEF08A] shadow-[3px_3px_0px_#161816]'
                        : 'bg-[#FFFBF0] hover:bg-white'
                    }`}
                  >
                    <ConditionStickerBadge condition={s} size="md" tilted={selected} />
                    <span className="text-[11px] font-semibold text-[#2F342F]">
                      {CONDITION_META[s].subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Age & MRP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wide text-[#161816] mb-2">
                4. Age (years)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AGES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAgeYears(a);
                      setAskingTouched(false);
                    }}
                    className={`nb-btn-sm px-3 py-1.5 font-mono text-xs font-bold ${
                      ageYears === a ? 'bg-[#184D38] text-white' : 'bg-white text-[#161816]'
                    }`}
                  >
                    {a}y
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wide text-[#161816] mb-2">
                5. Bought at (Original MRP ₹)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {MRP_CHIPS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setOriginalPrice(m);
                      setAskingTouched(false);
                    }}
                    className={`nb-btn-sm px-2.5 py-1 font-mono text-xs font-bold ${
                      originalPrice === m ? 'bg-[#184D38] text-white' : 'bg-white text-[#161816]'
                    }`}
                  >
                    {formatINR(m)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                value={originalPrice}
                onChange={(e) => {
                  setOriginalPrice(Math.max(0, Number(e.target.value)));
                  setAskingTouched(false);
                }}
                className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 font-mono text-sm font-bold tabular-nums focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* 5. Type-Specific Fields */}
          {transactionType === 'sale' && (
            <div className="rounded-2xl border-2 border-[#161816] bg-[#DBEAFE] p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-[#161816] inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Sell Preferences &amp; Private Floor
                </span>
                <button
                  type="button"
                  onClick={() => setNegotiable(!negotiable)}
                  className={`nb-btn-sm px-3 py-1 text-xs font-bold ${
                    negotiable ? 'bg-[#FFE047] text-[#161816]' : 'bg-white text-[#464B46]'
                  }`}
                >
                  {negotiable ? '✓ Negotiable' : 'Fixed Price Only'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#161816] mb-1">
                    Asking Price (₹) — Public
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={askingPrice}
                    onChange={(e) => {
                      setAskingPrice(Math.max(0, Number(e.target.value)));
                      setAskingTouched(true);
                    }}
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-3 py-2 font-mono text-sm font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[#144230] mb-1">
                    <Lock className="h-3 w-3" />
                    Private Minimum Acceptable (Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minAcceptablePrice}
                    onChange={(e) => setMinAcceptablePrice(e.target.value)}
                    placeholder="e.g., 650 (never shown publicly)"
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-3 py-2 font-mono text-sm font-bold tabular-nums"
                  />
                </div>
              </div>
              <p className="text-[11px] font-semibold text-[#1E3A8A]">
                Privacy guarantee: Your minimum acceptable price is stored privately and never exposed in APIs or buyer screens.
              </p>
            </div>
          )}

          {transactionType === 'swap' && (
            <div className="rounded-2xl border-2 border-[#161816] bg-[#DDD6FE] p-4 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[#161816] inline-flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" />
                Swap Exchange Preferences
              </span>
              <input
                type="text"
                value={swapFor}
                onChange={(e) => setSwapFor(e.target.value)}
                placeholder="What item(s) are you looking to receive?"
                className="w-full rounded-lg border-2 border-[#161816] bg-white px-3 py-2 text-xs font-semibold"
              />
              <div>
                <p className="text-[11px] font-bold text-[#161816] mb-1.5">
                  Accepted Swap Categories:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const active = swapCategories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleSwapCat(c)}
                        className={`nb-btn-sm px-2.5 py-1 text-[11px] font-bold ${
                          active ? 'bg-[#FFE047] text-[#161816]' : 'bg-white text-[#464B46]'
                        }`}
                      >
                        {active ? `✓ ${c}` : c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwapMultiOk(!swapMultiOk)}
                className={`nb-btn-sm px-3 py-1.5 text-xs font-bold ${
                  swapMultiOk ? 'bg-[#5EEAD4] text-[#161816]' : 'bg-white text-[#464B46]'
                }`}
              >
                {swapMultiOk ? '✓ Open to multi-item / partial-cash swaps' : 'Single 1-for-1 swap only'}
              </button>
            </div>
          )}

          {(transactionType === 'borrow' || transactionType === 'rent') && (
            <div
              className={`rounded-2xl border-2 border-[#161816] p-4 space-y-3 ${
                transactionType === 'borrow' ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]'
              }`}
            >
              <span className="text-xs font-extrabold uppercase tracking-wide text-[#161816] inline-flex items-center gap-1.5">
                {transactionType === 'borrow' ? (
                  <>
                    <HandHeart className="h-3.5 w-3.5" /> Free Temporary Borrowing Details
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-3.5 w-3.5" /> Rental Rates &amp; Availability
                  </>
                )}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#161816] mb-1">
                    Min Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={borrowMinDays}
                    onChange={(e) => setBorrowMinDays(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#161816] mb-1">
                    Max Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={borrowMaxDays}
                    onChange={(e) => setBorrowMaxDays(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
                {transactionType === 'rent' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#161816] mb-1">
                      Rate / Week (₹)
                    </label>
                    <input
                      type="number"
                      min={10}
                      value={rentPerWeek}
                      onChange={(e) => setRentPerWeek(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-[#161816] mb-1">
                    Optional Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rentDeposit}
                    onChange={(e) => setRentDeposit(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={collectionLocation}
                  onChange={(e) => setCollectionLocation(e.target.value)}
                  placeholder="Collection spot (e.g., Central Library)"
                  className="rounded-lg border-2 border-[#161816] bg-white px-3 py-2 text-xs font-semibold"
                />
                <input
                  type="text"
                  value={borrowConditions}
                  onChange={(e) => setBorrowConditions(e.target.value)}
                  placeholder="Any care/return condition"
                  className="rounded-lg border-2 border-[#161816] bg-white px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#161816] mb-1">
                    Available From
                  </label>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#161816] mb-1">
                    Available Until
                  </label>
                  <input
                    type="date"
                    value={availableUntil}
                    onChange={(e) => setAvailableUntil(e.target.value)}
                    className="w-full rounded-lg border-2 border-[#161816] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Customization & Course Tags */}
          <div className="pt-3 border-t-2 border-[#161816] space-y-4">
            <label className="block text-xs font-extrabold uppercase tracking-wide text-[#161816]">
              6. Add-ons, Branch &amp; Semester Tags
            </label>

            <div className="flex flex-wrap gap-1.5">
              {ADDON_CHIPS.map((a) => {
                const active = addons.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAddon(a)}
                    className={`nb-btn-sm px-2.5 py-1 text-xs font-bold ${
                      active ? 'bg-[#D1FAE5] text-[#144230]' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    {active ? `✓ ${a}` : `+ ${a}`}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setHandwrittenNotes(!handwrittenNotes)}
                className={`nb-btn-sm px-2.5 py-1 text-xs font-bold ${
                  handwrittenNotes ? 'bg-[#FEF08A] text-[#161816]' : 'bg-white text-[#464B46]'
                }`}
              >
                {handwrittenNotes ? '✓ Exam Notes Included' : '+ Exam Notes'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <select
                aria-label="Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value as Branch)}
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    Branch: {b}
                  </option>
                ))}
              </select>
              <select
                aria-label="Semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value as Semester)}
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                aria-label="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              >
                {COLOR_CHIPS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Edition / Size"
                className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-2.5 py-2 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#161816] mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#9F3220]" />
                  Leaving Campus Urgency
                </span>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickLeaving(null)}
                    className={`nb-btn-sm px-2 py-1 text-[11px] font-bold ${
                      !leavingDate ? 'bg-[#161816] text-white' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    No rush
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickLeaving(9)}
                    className={`nb-btn-sm px-2 py-1 text-[11px] font-bold ${
                      leavingDays === 9 ? 'bg-[#FCA5A5] text-[#161816]' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    9 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickLeaving(3)}
                    className={`nb-btn-sm px-2 py-1 text-[11px] font-bold ${
                      leavingDays === 3 ? 'bg-[#FCA5A5] text-[#161816]' : 'bg-white text-[#464B46]'
                    }`}
                  >
                    3 days (-15%)
                  </button>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#161816] mb-1.5">
                  <Ticket className="h-3.5 w-3.5 text-[#853D06]" />
                  Campus Event Tag
                </span>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-1.5 text-xs font-bold"
                >
                  <option value="">Regular Campus Listing</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} (in {ev.days_remaining}d)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Optional pickup / meetup note..."
              className="w-full rounded-lg border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-medium"
            />

            {/* Clickable Photo & Video Upload / URL */}
            <div className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] p-3.5 space-y-2.5">
              <p className="text-xs font-extrabold text-[#161816]">
                7. Photo &amp; Video Clip (Optional — defaults to category showcase)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#161816] flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5 text-[#184D38]" />
                    Photo Upload or URL
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 3 * 1024 * 1024) {
                        setError('Image must be under 3 MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setCustomImageUrl(String(reader.result || ''));
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-[11px] file:mr-2 file:rounded file:border file:border-[#161816] file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-bold"
                  />
                  <input
                    type="url"
                    value={customImageUrl.startsWith('data:') ? '' : customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="Or paste photo URL..."
                    className="w-full rounded-lg border border-[#161816] bg-white px-2.5 py-1 text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#161816] flex items-center gap-1">
                    <Film className="h-3.5 w-3.5 text-[#853D06]" />
                    Video Clip Upload or URL
                  </label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        setError('Video clip must be under 5 MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setCustomVideoUrl(String(reader.result || ''));
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-[11px] file:mr-2 file:rounded file:border file:border-[#161816] file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-bold"
                  />
                  <input
                    type="url"
                    value={customVideoUrl.startsWith('data:') ? '' : customVideoUrl}
                    onChange={(e) => setCustomVideoUrl(e.target.value)}
                    placeholder="Or paste MP4/WebM URL..."
                    className="w-full rounded-lg border border-[#161816] bg-white px-2.5 py-1 text-[11px]"
                  />
                </div>
              </div>

              {onOpenMedia && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenMedia({
                        title: title || 'Listing Preview',
                        subtitle: 'Photo Preview',
                        imageUrl: customImageUrl || getCategoryImage(category),
                        videoUrl: customVideoUrl || getCategoryVideo(category),
                        initialMode: 'image',
                      })
                    }
                    className="nb-btn-sm bg-white px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1"
                  >
                    <ImageIcon className="h-3 w-3" /> Preview Photo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenMedia({
                        title: title || 'Listing Preview',
                        subtitle: 'Video Preview',
                        imageUrl: customImageUrl || getCategoryImage(category),
                        videoUrl: customVideoUrl || getCategoryVideo(category),
                        initialMode: 'video',
                      })
                    }
                    className="nb-btn-sm bg-[#FFE047] px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1"
                  >
                    <Film className="h-3 w-3" /> Preview Video
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pricing Receipt + Little Loops Live Mascot Preview */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
          <div className="bg-white nb-card rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#184D38]">
                  {transactionType === 'borrow'
                    ? 'Free Campus Borrow (₹0)'
                    : `Suggested Fair Benchmark (${suggestion?.confidence ?? '...'})`}
                </p>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span className="font-mono text-4xl font-extrabold text-[#161816] tabular-nums">
                    {transactionType === 'borrow'
                      ? 'FREE'
                      : transactionType === 'rent'
                        ? `${formatINR(suggestion?.rent_price_per_week ?? rentPerWeek)}/wk`
                        : suggestion
                          ? formatINR(suggestion.fair_price)
                          : '...'}
                  </span>
                  {suggestion && (
                    <span className="font-mono text-xs font-semibold text-[#5B605B] tabular-nums">
                      {suggestion.similar_count} similar sales
                    </span>
                  )}
                </div>
              </div>
              <ConditionStickerBadge condition={sticker} size="md" tilted />
            </div>

            {suggestion && (
              <>
                {suggestion.warnings.length > 0 && (
                  <div className="rounded-lg border-2 border-[#161816] bg-[#FEF08A] px-3 py-2 text-[11px] font-bold text-[#161816]">
                    {suggestion.warnings.join(' ')}
                  </div>
                )}

                <div className="space-y-2.5 pt-3 border-t-2 border-[#161816]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#161816]">
                    <Info className="h-3.5 w-3.5 text-[#184D38]" />
                    <span>Why this price (SQLite Fitted Receipt)</span>
                  </div>
                  <p className="font-mono text-[11px] bg-[#FFFBF0] border-2 border-[#161816] rounded-lg px-3 py-2 text-[#161816] leading-relaxed">
                    {suggestion.why_this_price.receipt_line}
                  </p>
                  <p className="text-xs font-medium text-[#2F342F]">
                    {suggestion.why_this_price.summary}
                  </p>
                </div>

                {transactionType === 'sale' && (
                  <div className="pt-3 border-t-2 border-[#161816] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#161816]">
                        Asking Price: {formatINR(askingPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAskingPrice(suggestion.fair_price);
                          setAskingTouched(false);
                        }}
                        className="text-[#184D38] font-extrabold hover:underline"
                      >
                        Snap to Fair ({formatINR(suggestion.fair_price)})
                      </button>
                    </div>
                    <input
                      type="range"
                      min={minSlide}
                      max={maxSlide}
                      step={10}
                      value={askingPrice}
                      onChange={(e) => {
                        setAskingPrice(Number(e.target.value));
                        setAskingTouched(true);
                      }}
                      className="w-full accent-[#184D38]"
                    />
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px] tabular-nums">
                      <button
                        type="button"
                        onClick={() => {
                          setAskingPrice(suggestion.quick_sale_price);
                          setAskingTouched(true);
                        }}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] py-1.5 font-bold hover:bg-[#D1FAE5]"
                      >
                        <span className="block text-[#5B605B]">Quick</span>
                        <span className="text-[#184D38]">{formatINR(suggestion.quick_sale_price)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAskingPrice(suggestion.fair_price);
                          setAskingTouched(false);
                        }}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFE047] py-1.5 font-bold"
                      >
                        <span className="block text-[#161816]">Fair</span>
                        <span className="text-[#161816]">{formatINR(suggestion.fair_price)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAskingPrice(suggestion.patient_price);
                          setAskingTouched(true);
                        }}
                        className="rounded-lg border-2 border-[#161816] bg-[#FFFBF0] py-1.5 font-bold hover:bg-[#FEF08A]"
                      >
                        <span className="block text-[#5B605B]">Patient</span>
                        <span className="text-[#853D06]">{formatINR(suggestion.patient_price)}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Little Loops Live Mascot Preview */}
            <div className="rounded-xl border-2 border-[#161816] bg-[#FEF08A] p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{mascotPreview.emoji}</span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-[#161816] inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#184D38]" />
                  Little Loops Mascot ({mascotPreview.name})
                </span>
              </div>
              <p className="text-xs font-semibold text-[#161816] bg-white border border-[#161816] rounded-lg px-3 py-2">
                &ldquo;{mascotPreview.line}&rdquo;
              </p>
              <textarea
                rows={2}
                value={customMonologue || liveVoice}
                onChange={(e) => setCustomMonologue(e.target.value)}
                aria-label="Personal item voice note"
                className="w-full rounded-lg border-2 border-[#161816] bg-white px-3 py-2 text-xs italic text-[#161816]"
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-[#991B1B] bg-[#FEE2E2] border-2 border-[#161816] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="nb-btn w-full bg-[#184D38] px-5 py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {submitting
                ? 'Publishing...'
                : `Publish ${transactionType.toUpperCase()} Listing`}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
