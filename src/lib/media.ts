import type { Category } from '../shared/types.ts';

export const HERO_IMAGE_URL = '/src/assets/images/hero_campus_gear_1795599430284.jpg';
export const HERO_VIDEO_URL = '/media/clips/calculators.mp4';

export const CATEGORY_IMAGES: Record<Category, string> = {
  Calculators: '/src/assets/images/item_calculator_1795599432629.jpg',
  Books: '/src/assets/images/item_textbooks_1795599430630.jpg',
  Cycles: '/src/assets/images/item_cycle_1795599431096.jpg',
  'Lab Gear': '/src/assets/images/item_lab_gear_1795599431786.jpg',
  Electronics: '/src/assets/images/item_electronics_1795600721498.jpg',
  'Hostel Items': '/src/assets/images/item_hostel_items_1795600721925.jpg',
};

export const CATEGORY_VIDEOS: Record<Category, string> = {
  Calculators: '/media/clips/calculators.mp4',
  Books: '/media/clips/books.mp4',
  Cycles: '/media/clips/cycles.mp4',
  'Lab Gear': '/media/clips/lab_gear.mp4',
  Electronics: '/media/clips/electronics.mp4',
  'Hostel Items': '/media/clips/hostel_items.mp4',
};

export function getCategoryImage(category: Category): string {
  return CATEGORY_IMAGES[category] || HERO_IMAGE_URL;
}

export function getCategoryVideo(category: Category): string {
  return CATEGORY_VIDEOS[category] || HERO_VIDEO_URL;
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export interface MediaLightboxPayload {
  title: string;
  subtitle?: string;
  imageUrl: string;
  videoUrl: string;
  initialMode: 'image' | 'video';
  mascotEmoji?: string;
  mascotLine?: string;
}
