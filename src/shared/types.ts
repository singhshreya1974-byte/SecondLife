export type Category =
  | 'Books'
  | 'Calculators'
  | 'Cycles'
  | 'Lab Gear'
  | 'Electronics'
  | 'Hostel Items';

export type ConditionName = 'Like New' | 'Good' | 'Fair' | 'Worn';
export type ConditionSticker = 'Like New' | 'Well Loved' | 'Battle-Scarred';

export type ListingType = 'sale' | 'swap' | 'borrow' | 'rent';
export type Branch = 'All' | 'CSE' | 'ECE' | 'ME' | 'CE' | 'EE';
export type Semester =
  | 'All'
  | 'Sem 1'
  | 'Sem 2'
  | 'Sem 3'
  | 'Sem 4'
  | 'Sem 5'
  | 'Sem 6'
  | 'Sem 7'
  | 'Sem 8';

export type TrustLevel =
  | 'New here'
  | 'Newbie'
  | 'Reliable'
  | 'Trusted'
  | 'Campus Legend';

export interface TrustBreakdownItem {
  label: string;
  value: string;
  impact: string;
}

export interface TrustBadge {
  level: TrustLevel;
  score: number;
  summary: string;
  breakdown: TrustBreakdownItem[];
}

export interface UserProfile {
  id: string;
  nickname: string;
  branch: string;
  year: number;
  hostel: string;
  avatar_emoji: string;
  profile_stickers: string[];
  theme_color: string;
  bio: string;
  status_line: string;
  completed_trades: number;
  cancelled_trades: number;
  avg_response_mins: number;
  condition_accuracy: number;
  rent_on_time: number;
  rent_late: number;
  campus_verified: boolean;
  trust_badge: TrustBadge;
}

export interface PastSaleRecord {
  id: string;
  item_name: string;
  category: Category;
  subcategory: string;
  condition: ConditionName;
  age_years: number;
  original_price: number;
  sold_price: number;
  retention_pct: number;
  month_sold: number;
  month_name: string;
  listing_type: ListingType;
  branch: string;
  semester: string;
  is_outlier: number;
}

export interface ReceiptStep {
  label: string;
  delta: number;
  running_total: number;
  note: string;
}

export interface PriceSuggestion {
  fair_price: number;
  quick_sale_price: number;
  patient_price: number;
  rent_price_per_week: number;
  suggested_deposit: number;
  swap_value: number;
  confidence: 'High' | 'Medium' | 'Low';
  similar_count: number;
  normalized_category: Category;
  normalized_condition: ConditionName;
  condition_sticker: ConditionSticker;
  inferred_original_price: number;
  warnings: string[];
  comparables: PastSaleRecord[];
  why_this_price: {
    receipt_steps: ReceiptStep[];
    receipt_line: string;
    summary: string;
    best_time_to_list: string;
  };
}

export interface BidEntry {
  id: string;
  listing_id: string;
  bidder_id: string;
  bidder_nickname: string;
  bidder_avatar: string;
  bidder_trust: TrustLevel;
  amount: number;
  created_at: string;
}

export interface CounterOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  buyer_nickname: string;
  buyer_trust: TrustLevel;
  offer_amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface SwapProposal {
  id: string;
  listing_id: string;
  listing_title?: string;
  proposer_id: string;
  proposer_nickname: string;
  proposer_trust: TrustLevel;
  offered_item: string;
  offered_value: number;
  target_value: number;
  value_balance_diff: number;
  balance_text: string;
  unbalanced_warning?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface RentalRecord {
  id: string;
  listing_id: string;
  listing_title?: string;
  renter_id: string;
  renter_nickname: string;
  renter_trust: TrustLevel;
  start_date: string;
  end_date: string;
  weekly_rate: number;
  deposit: number;
  total_rent: number;
  status: 'active' | 'returned';
  return_timeliness: 'on_time' | 'late' | null;
  created_at: string;
}

export interface ItemMascot {
  name: string;
  emoji: string;
  line: string;
}

export interface ListingItem {
  id: string;
  title: string;
  category: Category;
  subcategory: string;
  condition: ConditionName;
  condition_sticker: ConditionSticker;
  age_years: number;
  original_price: number;
  asking_price: number;
  negotiable: boolean;
  suggested_price: number;
  quick_sale_price: number;
  patient_price: number;
  fairness_tag: 'Steal' | 'Fair' | 'Overpriced';
  rent_per_week: number;
  suggested_deposit: number;
  transaction_type: ListingType;
  listing_types: ListingType[];
  swap_for: string;
  swap_categories: Category[];
  swap_multi_ok: boolean;
  borrow_min_days: number | null;
  borrow_max_days: number | null;
  collection_location: string;
  borrow_conditions: string;
  available_from: string | null;
  available_until: string | null;
  image_url?: string | null;
  video_url?: string | null;
  mascot: ItemMascot;
  description: string;
  monologue: string;
  addons: string[];
  handwritten_notes: boolean;
  color: string;
  edition: string;
  branch: string;
  semester: string;
  custom_note: string;
  seller_id: string;
  seller: UserProfile;
  event_id: string | null;
  event_name?: string | null;
  leaving_campus_date: string | null;
  days_until_leaving: number | null;
  allow_bidding: boolean;
  bids: BidEntry[];
  counter_offers: CounterOffer[];
  status: 'available' | 'reserved' | 'rented' | 'swapped';
  created_at: string;
}

export interface CollegeEvent {
  id: string;
  name: string;
  event_type: string;
  event_date: string;
  days_remaining: number;
  venue: string;
  organizer: string;
  bundle_suggestion: string;
  description: string;
  listing_count: number;
}

export interface NeedRequest {
  id: string;
  title: string;
  category: Category;
  branch: string;
  semester: string;
  max_budget: number;
  requester_id: string;
  requester_nickname: string;
  requester_avatar: string;
  requester_trust: TrustLevel;
  notes: string;
  created_at: string;
  senior_match_count: number;
  matched_listing_ids: string[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  listing_id: string | null;
  need_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface LostFoundPost {
  id: string;
  post_type: 'lost' | 'found';
  title: string;
  location: string;
  description: string;
  poster_name: string;
  contact_note: string;
  status: 'open' | 'reunited';
  created_at: string;
}

export interface ImpactStats {
  total_rupees_saved: number;
  total_kg_waste_avoided: number;
  active_listings_count: number;
  past_sales_count: number;
  per_category: {
    category: Category;
    rupees_saved: number;
    kg_waste_avoided: number;
    count: number;
  }[];
  findings: {
    title: string;
    metric: string;
    detail: string;
  }[];
}

export interface SellerOfferItem extends CounterOffer {
  listing_title: string;
  asking_price: number;
  floor_check: 'no_floor' | 'meets_floor' | 'below_floor';
}

export interface SellerListingStatus {
  listing: ListingItem;
  has_private_floor: boolean;
  pending_offers_count: number;
  bids_count: number;
}

export interface DashboardData {
  user: UserProfile;
  user_view: {
    recommended_listings: ListingItem[];
    outgoing_offers: (CounterOffer & { listing_title: string })[];
    outgoing_bids: (BidEntry & { listing_title: string })[];
    my_swaps: SwapProposal[];
    my_rentals: RentalRecord[];
    my_needs: NeedRequest[];
  };
  seller_view: {
    my_listings: SellerListingStatus[];
    incoming_offers: SellerOfferItem[];
    incoming_swaps: SwapProposal[];
    incoming_rentals: RentalRecord[];
    potential_earnings: number;
    pending_actions_count: number;
  };
}
