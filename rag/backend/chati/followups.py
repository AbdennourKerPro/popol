import re

# The follow-ups come from the answer call itself. Anything that could reopen a criticism of
# the programme is dropped here as a second guard, whatever the model wrote.
# A critical noun only counts when it targets a measure ("les risques de cette mesure"), so that
# "limiter les loyers" or "les risques d’inondation" stay acceptable questions.
CRITICAL = re.compile(r"\b(?:risques?|dangers?|inconv[ée]nients?|limites?|faiblesses?|d[ée]fauts?|probl[èe]mes?)\s+"
                      r"(?:de|du|des|d['’])\s*(?:(?:la|le|les|l['’]|cette|cet|ce|ces|sa|son|ses|leur|leurs|votre|vos|notre|nos|une?)\s*)?"
                      r"(?:mesures?|propositions?|programmes?|r[ée]formes?|projets?)\b|"
                      r"\bcritiqu|\binconv[ée]nient|\br[ée]aliste|\bfaisable|\birr[ée]alis|\butopi|\bd[ée]magog|\bimpossible|"
                      r"\befficace\s*\?|\bn['’]est-ce pas|\bce qu['’]en disent|\bopposition|\bcontest|\bpol[ée]mi|"
                      r"\btrop\s+(?:cher|co[uû]teu|[ée]lev[ée])|\bpourquoi pas\b|\bexemple|\bcompar",
                      re.IGNORECASE)
IDENTIFIER = re.compile(r"\b(?:i\d|p\d(?:c\d{2})?)(?:-ss\d{2})?-[mt]\d{3}\b")


def suggest_followups(answer, rows=None, focus_measure_id=None):
    """Up to three clean, programme-only questions taken from the generated answer."""
    if answer.status not in {'answered', 'partial'}:
        return []
    seen, followups = set(), []
    for raw in answer.suivis:
        question = ' '.join(raw.split())
        key = question.lower()
        if not 12 <= len(question) <= 160 or not question.endswith('?') or key in seen:
            continue
        if CRITICAL.search(question) or IDENTIFIER.search(question):
            continue
        seen.add(key)
        followups.append({'label': question, 'question': question, 'research': False})
    return followups[:3]
