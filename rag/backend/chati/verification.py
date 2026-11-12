"""Check before stating an absence: search again for what the answer says is missing."""
from .generation import generate

PER_ASPECT = 4   # new passages added per missing aspect
SEARCH_DEPTH = 15  # how far down each aspect's ranking to look for passages not yet provided
MAX_ASPECTS = 3


def missing_aspects(answer, messages):
    """Search queries for what the answer declares absent; the question itself when a
    non-answer carries no explicit aspect."""
    aspects = [a.strip() for a in answer.not_found if a.strip()][:MAX_ASPECTS]
    if not aspects and answer.status in {'partial', 'not_in_corpus'}:
        aspects = [messages[-1].content[:300]]
    return aspects


async def verify_absences(client, model, retriever, corpus, messages, rows, answer, usage, profile_labels=None):
    """Return (answer, usage, info). `info` is None when nothing was declared absent;
    otherwise it describes the extra search (and `rows` additions) even if it changed nothing."""
    aspects = missing_aspects(answer, messages)
    if not aspects:
        return answer, usage, None, rows
    rankings = await retriever.rank(aspects, client, depth=SEARCH_DEPTH)
    known = {r['id'] for r in rows}
    added = []
    for ranking in rankings:
        new = [i for i in ranking if i not in known and i not in added][:PER_ASPECT]
        added.extend(new)
    info = {'aspects': aspects, 'added_ids': added, 'regenerated': False, 'first_usage': usage}
    if not added:
        return answer, usage, info, rows
    extra_rows = [r for r in corpus.expand(added) if r['id'] not in known]
    info['added_ids'] = [r['id'] for r in extra_rows]
    try:
        better, better_usage = await generate(client, model, messages, rows + extra_rows,
                                              verification={'aspects': aspects}, profile_labels=profile_labels)
    except ValueError:
        return answer, usage, info, rows  # keep the first answer, whose references were valid
    info['regenerated'] = True
    return better, better_usage, info, rows + extra_rows
