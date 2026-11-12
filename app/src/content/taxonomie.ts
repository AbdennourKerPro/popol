import { BookOpen, Briefcase, Globe, GraduationCap, HandHeart, HeartPulse, House, Landmark, Leaf, MapPin, Music, Scale, Shield, Sprout, Train, Wallet, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import taxonomie from '../../data/taxonomie.json';

export type Theme = keyof typeof taxonomie.themes;

/** Display of the themes. Their ids are the vocabulary of data/taxonomie.json. */
export const THEMES: Record<Theme, { label: string; icon: LucideIcon }> = {
  pouvoir_achat: { label: 'Pouvoir d’achat', icon: Wallet },
  fiscalite: { label: 'Impôts et richesse', icon: Scale },
  travail_retraite: { label: 'Travail et retraites', icon: Briefcase },
  logement: { label: 'Logement', icon: House },
  sante: { label: 'Santé et solidarités', icon: HeartPulse },
  education: { label: 'École et recherche', icon: GraduationCap },
  ecologie: { label: 'Écologie', icon: Leaf },
  energie_transports: { label: 'Énergie et transports', icon: Train },
  services_publics: { label: 'Services publics et territoires', icon: MapPin },
  democratie: { label: 'Démocratie', icon: Landmark },
  justice_securite: { label: 'Justice et sécurité', icon: Shield },
  egalite: { label: 'Égalité et droits', icon: HandHeart },
  culture_sport: { label: 'Culture et sport', icon: Music },
  numerique: { label: 'Numérique et espace', icon: Wifi },
  international: { label: 'Paix et international', icon: Globe },
  agriculture: { label: 'Agriculture et alimentation', icon: Sprout },
  migrations: { label: 'Migrations et nationalité', icon: BookOpen },
};

export const THEME_IDS = Object.keys(THEMES) as Theme[];
export const PUBLIC_IDS = Object.keys(taxonomie.publics);
