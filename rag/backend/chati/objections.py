"""Recognise a doubt or an objection in the user's question.

An objection (« c’est irréaliste », « qui paie ? »…) is answered to convince: with the
programme's own arguments and, when web research is available, verified examples from
other countries and the legal basis. Text quoted between « » (a measure the user clicked)
is not read: a measure about « le financement des retraites » is not an objection.
"""
import re

QUOTED = re.compile(r'«[^»]*»')
FINANCING = re.compile(
    r"\bfinanc|\bpa(?:ie|ient|iera|ieront|ierait|yer|yera|yerait)\b|\bco[uû]t(?:e|ent|era|erait|s)?\b|"
    r"\bdettes?\b|\bd[ée]ficits?\b|\bbudg[ée]t|\bargent\b|\bcaisses?\s+(?:sont|est)\s+vides?|\bles\s+moyens\b",
    re.IGNORECASE)
DOUBT = re.compile(
    r"\birr[ée]alis|\br[ée]alis(?:te|able)s?\b|\b(?:in)?faisables?\b|\butopi|\bimpossibles?\b|\bcr[ée]dibles?\b|"
    r"\bchim[èe]r|\bd[ée]magog|\bpopulis|\bp[ée]nuries?\b|\bfuir\b|\bfuite\b|partir\s+[àa]\s+l['’][ée]tranger|"
    r"\bs['’]exiler|\bd[ée]trui|\bfaillite|\bruiner?\b|\bbureaucrati|\bmarchera\b|\bfonctionnera\b|"
    r"n['’]est-ce\s+pas|,\s*non\s*\?|\btrop\s+(?:cher|co[uû]teu)|\bsuivre\s*\?|\bpas\s+(?:possible|tenable|r[ée]aliste)|"
    r"\bna[ïi]f|\bça\s+ne\s+(?:va|marche|cr[ée]e)|\bca\s+ne\s+(?:va|marche|cr[ée]e)|\bon\s+va\s+manquer|\bmanquer\s+de\b",
    re.IGNORECASE)


def _unquoted(text: str) -> str:
    return QUOTED.sub(' ', text)


def is_financing(text: str) -> bool:
    return bool(FINANCING.search(_unquoted(text)))


def is_objection(text: str) -> bool:
    """A doubt about feasibility, realism or effects, or a question about the cost or financing."""
    text = _unquoted(text)
    return bool(DOUBT.search(text) or FINANCING.search(text))
