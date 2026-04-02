export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  introParagraphs: string[];
  sections: LegalSection[];
}
