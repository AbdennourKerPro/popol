"""Small, hand-checkable lexicon used to widen lexical queries.

Each group lists equivalent ways to name one topic of the programme. When a query
contains any term of a group, the other terms are added to the lexical query. Terms
are matched after accent/case folding, as whole words or phrases. This only helps
retrieval: it never changes a source or an answer.
"""
import re
import unicodedata

GROUPS = [
    "apl|aide personnalisee au logement|aide au logement|allocation logement",
    "inondation|crue|debordement|cours d eau|riviere|submersion",
    "recepisse|controle d identite|tracabilite des controles|controle au facies",
    "esat|travail protege|structure protegee|etablissement et service d aide par le travail",
    "aesh|accompagnant des eleves en situation de handicap|accompagnement scolaire handicap",
    "creche|petite enfance|mode de garde|garde d enfants|tout petits",
    "psychologue|sante mentale|psychiatrie|souffrance psychique",
    "etudiant|vie etudiante|universite|crous|enseignement superieur",
    "loyer|encadrement des loyers|bail|locataire",
    "retraite|pension|annuite|trimestre|age de depart",
    "chomage|assurance chomage|demandeur d emploi|indemnisation chomage",
    "smic|salaire minimum",
    "impot|fiscalite|taxe|imposition|prelevement",
    "isf|impot sur la fortune|patrimoine",
    "nucleaire|centrale|epr|reacteur",
    "pesticide|phytosanitaire|produit chimique|intrant|engrais",
    "licenciement|plan social|licenciement boursier|suppression d emploi",
    "ame|aide medicale d etat|soins des etrangers",
    "police|force de l ordre|igpn|iggn|gendarmerie",
    "etranger|immigration|migrant|sans papiers|titre de sejour",
    "handicap|personne handicapee|accessibilite",
    "numerique|internet|dematerialisation|en ligne",
    "guichet|accueil physique|service public de proximite",
    "securite sociale|secu|remboursement des soins|mutuelle",
    "ehpad|maison de retraite|grand age|dependance|personne agee",
    "logement social|hlm|logement public",
    "ric|referendum d initiative citoyenne|referendum",
    "reduflation|shrinkflation",
    "agriculteur|paysan|exploitation agricole|agriculture",
    "prix|inflation|pouvoir d achat|cout de la vie",
]


def _fold(text):
    text = "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))
    return " " + " ".join(re.findall(r"[a-z0-9]+", text)) + " "


_GROUPS = [[_fold(t).strip() for t in g.split("|")] for g in GROUPS]


def expansion(query: str) -> list[str]:
    """Extra lexical terms for a query (empty if no group matches)."""
    folded = _fold(query)
    extra = []
    for group in _GROUPS:
        if any(f" {term} " in folded for term in group):
            extra.extend(t for t in group if f" {t} " not in folded)
    return extra
