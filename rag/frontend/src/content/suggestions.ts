/** Home suggestions, one per major theme, with the part of the programme it belongs to (1 to 6, checked
 * against the measures each question retrieves). data/faq-questions.txt keeps the same questions
 * (tests/test_cache.py) and none of them is an objection (tests/test_objections.py). */
export const SUGGESTIONS = [
  { partie: 3, text: 'Quelles mesures pour rendre le logement plus accessible ?', category: 'Logement' },
  { partie: 1, text: 'Que prévoit le programme pour la transition écologique ?', category: 'Écologie' },
  { partie: 2, text: 'Quelles propositions pour les salaires et le pouvoir d’achat ?', category: 'Travail' },
  { partie: 4, text: 'Comment améliorer l’accès aux soins et à l’hôpital ?', category: 'Santé' },
  { partie: 3, text: 'Que prévoit le programme pour les retraites ?', category: 'Retraites' },
  { partie: 4, text: 'Quelles mesures pour l’école et les études ?', category: 'Éducation' },
  { partie: 5, text: 'Que changerait la 6e République pour les citoyens ?', category: 'Démocratie' },
  { partie: 2, text: 'Comment le programme veut-il rendre l’impôt plus juste ?', category: 'Fiscalité' },
  { partie: 5, text: 'Que prévoit le programme pour les services publics dans les territoires ?', category: 'Territoires' },
  { partie: 3, text: 'Quelles mesures pour l’égalité entre les femmes et les hommes ?', category: 'Égalité' },
  { partie: 1, text: 'Que propose le programme pour les transports du quotidien ?', category: 'Transports' },
  { partie: 6, text: 'Quelle politique internationale le programme propose-t-il pour la paix ?', category: 'International' },
];
export type Suggestion = (typeof SUGGESTIONS)[number];

/** Four suggestions drawn at random. */
export const pickSuggestions = () => [...SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4);

export const FOR_ME = 'Qu’est-ce que le programme changerait concrètement pour moi ?';

/** Non-breaking space before French double punctuation, so that « ? » never starts a line. */
export const insecable = (text: string) => text.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
