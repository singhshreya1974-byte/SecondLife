import type { Category, ConditionName, ItemMascot, ListingType } from '../src/shared/types.ts';

interface MascotInput {
  title?: string;
  category: Category;
  age_years: number;
  condition: ConditionName;
  transaction_type: ListingType;
}

const CATEGORY_CHARACTER: Record<Category, { name: string; emoji: string }> = {
  Books: { name: 'PageBuddy', emoji: '📘' },
  Calculators: { name: 'CalcBot', emoji: '🧮' },
  Cycles: { name: 'Spokey', emoji: '🚲' },
  'Lab Gear': { name: 'BeakerPal', emoji: '🧪' },
  Electronics: { name: 'VoltLoop', emoji: '🔋' },
  'Hostel Items': { name: 'KettlePal', emoji: '☕' },
};

export function generateItemMascot(input: MascotInput): ItemMascot {
  const char = CATEGORY_CHARACTER[input.category] || { name: 'Loopie', emoji: '🌱' };
  const ageRounded = Math.max(0.5, Number(input.age_years) || 1);
  const agePhrase =
    ageRounded < 1
      ? 'less than a year'
      : ageRounded === 1
        ? 'one year'
        : `${ageRounded} years`;

  // Transaction-type overrides for Rent & Borrow per Section 10 examples
  if (input.transaction_type === 'rent') {
    if (input.category === 'Electronics') {
      return {
        name: char.name,
        emoji: char.emoji,
        line: "I'm only visiting your desk for a week—charged up and ready for your sprint!",
      };
    }
    if (input.category === 'Hostel Items') {
      return {
        name: char.name,
        emoji: char.emoji,
        line: "I'm only visiting your desk for a week! Look sharp at the event and bring me back clean.",
      };
    }
    return {
      name: char.name,
      emoji: char.emoji,
      line: "I'm only visiting your desk for a week—rent me for the exam or fest, then pass me along!",
    };
  }

  if (input.transaction_type === 'borrow') {
    return {
      name: char.name,
      emoji: char.emoji,
      line: `Borrow me for free on campus! I've held up great over ${agePhrase}—just bring me back when you're done.`,
    };
  }

  if (input.transaction_type === 'swap') {
    return {
      name: char.name,
      emoji: char.emoji,
      line: `Trade me fairly! After ${agePhrase} of campus duty in ${input.condition.toLowerCase()} shape, I'm ready for a swap.`,
    };
  }

  // SELL templates by category, age, and condition
  switch (input.category) {
    case 'Cycles':
      return {
        name: char.name,
        emoji: char.emoji,
        line: `Hi! I'm a bicycle. I've been around for ${agePhrase}, but I've still got plenty of campus rides left in me!`,
      };
    case 'Books': {
      const sems = Math.max(1, Math.round(ageRounded * 2));
      return {
        name: char.name,
        emoji: char.emoji,
        line: `Hey! I've survived ${sems} ${sems === 1 ? 'semester' : 'semesters'} in ${input.condition.toLowerCase()} shape. Ready to help you survive yours?`,
      };
    }
    case 'Calculators':
      return {
        name: char.name,
        emoji: char.emoji,
        line: `Psst! Exams are coming. After ${agePhrase} of formulas, I'm still dialed in for those equations.`,
      };
    case 'Lab Gear':
      return {
        name: char.name,
        emoji: char.emoji,
        line: `Lab bell ringing? I've clocked ${agePhrase} at the workbench and I'm still accurate for your practicals.`,
      };
    case 'Electronics':
      return {
        name: char.name,
        emoji: char.emoji,
        line: `Zero lag, ${input.condition.toLowerCase()} exterior, and ${agePhrase} of hostel reliability—plug me in!`,
      };
    case 'Hostel Items':
    default:
      return {
        name: char.name,
        emoji: char.emoji,
        line: `Hostel MVP for ${agePhrase}! Still going strong for late-night study sessions.`,
      };
  }
}
