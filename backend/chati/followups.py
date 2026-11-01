def suggest_followups(answer, rows, focus_measure_id=None):
    """Suggestions are grounded in a server-known measure, not a generated ID."""
    by_id = {r['id']: r for r in rows if r['type'] == 'mesure'}
    cited = [m.id for m in answer.measures] + [i for b in answer.blocks for i in b.source_ids]
    identifier = focus_measure_id if focus_measure_id in by_id else next((i for i in cited if i in by_id), None)
    if not identifier or answer.status in {'clarification', 'not_in_corpus'}:
        return []
    row = by_id[identifier]
    measure = row['texte']
    return [
        {'label': 'Expliquer avec un exemple', 'question': f'Peux-tu expliquer simplement cette mesure, avec un exemple concret sourcé ? « {measure} »',
         'measure_id': identifier, 'measure_title': row['sous_section'], 'research': True},
        {'label': 'Qu’est-ce qui changerait aujourd’hui ?', 'question': f'Pour cette mesure, quelle est la situation actuelle en France et qu’est-ce qui changerait si elle était appliquée ? Vérifie les règles actuelles sur Internet. « {measure} »',
         'measure_id': identifier, 'measure_title': row['sous_section'], 'research': True},
        {'label': 'Comprendre les avantages et les limites', 'question': f'Quels avantages attendus, limites et conditions de réussite peut-on expliquer pour cette mesure ? Appuie les effets évoqués sur des sources externes et distingue les hypothèses des résultats démontrés. « {measure} »',
         'measure_id': identifier, 'measure_title': row['sous_section'], 'research': True},
    ]
