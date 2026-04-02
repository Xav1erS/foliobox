export interface EditorialCTA {
  label: string;
  href: string;
}

export interface EditorialSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface EditorialQuote {
  quote: string;
  insertAfterSection: number;
}

export interface EditorialContent {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  introParagraphs: string[];
  previewTitle: string;
  previewParagraphs: string[];
  sections: EditorialSection[];
  quotes: EditorialQuote[];
  cta: EditorialCTA;
}
