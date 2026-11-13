/** Active mascot. Set to 'chat' to bring Chati, the cat, back (drawing kept in components/MascotCat.tsx). */
export const MASCOTTE: 'tortue' | 'chat' = 'tortue';

const MARQUES = {
  tortue: { nom: 'Tortue', sousTitre: 'la tortue sagace', salutation: 'Salut ! Je suis ', surnom: 'la tortue sagace', dessine: 'La tortue dessine…' },
  chat: { nom: 'Chati', sousTitre: 'le chat insoumis', salutation: 'Salut ! Moi c’est ', surnom: 'Chati', dessine: 'Chati dessine…' },
};
export const MARQUE = MARQUES[MASCOTTE];
