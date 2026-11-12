#!/usr/bin/env python3
"""Manage beta invitation links in Firestore (run from your own machine, never from the web app).

  python scripts/beta_admin.py create "Prénom Nom" [--limit 5] [--days 30]
  python scripts/beta_admin.py list
  python scripts/beta_admin.py revoke <id>      # id = the first characters shown by `list`
  python scripts/beta_admin.py restore <id>
  python scripts/beta_admin.py budget           # today's global usage
  python scripts/beta_admin.py feedback         # ratings: totals by rating, reason and theme

Credentials: Application Default Credentials. Either `gcloud auth application-default login`
or GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json (kept outside the repository).
Set FIREBASE_PROJECT_ID, and BETA_BASE_URL (public address of the app) to print complete links.

The link is shown ONCE: only its SHA-256 is stored, so it cannot be shown again.
"""
import argparse
import asyncio
from collections import Counter
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from chati.config import Settings  # noqa: E402
from chati.quota import FirestoreStore  # noqa: E402


def feedback_summary(docs):
    """Totals of the anonymous ratings (last 90 days): by rating, by reason, and by theme."""
    if not docs:
        return 'Aucun avis enregistré.'
    ratings = Counter(d.get('rating') for d in docs)
    reasons = Counter(d.get('reason') for d in docs if d.get('rating') == 'down')
    themes = {rating: Counter(t for d in docs if d.get('rating') == rating for t in d.get('themes', [])) for rating in ('up', 'down')}
    days = sorted(d['day'] for d in docs if d.get('day'))
    lines = [f"{len(docs)} avis" + (f" du {days[0]} au {days[-1]}" if days else '') + f" : {ratings['up']} 👍, {ratings['down']} 👎"]
    if reasons:
        lines.append('\nMotifs des avis négatifs :')
        lines += [f"  {reason or 'sans motif':12} {count}" for reason, count in reasons.most_common()]
    lines.append('\nPar thème des sources citées :')
    for theme in sorted(set(themes['up']) | set(themes['down']), key=lambda t: -(themes['up'][t] + themes['down'][t])):
        lines.append(f"  {theme:20} 👍 {themes['up'][theme]:3}  👎 {themes['down'][theme]:3}")
    return '\n'.join(lines)


async def main(args):
    settings = Settings()
    store = FirestoreStore(settings)
    if args.command == 'create':
        token = await store.create_invite(args.label, args.limit, args.days)
        base = os.environ.get('BETA_BASE_URL', 'https://<adresse-de-la-beta>').rstrip('/')
        limit = args.limit or settings.invite_daily_limit
        print(f"Invitation créée pour « {args.label} » : {limit} questions par jour"
              + (f", valable {args.days} jours" if args.days else ", sans date d'expiration"))
        print(f"\n  {base}/#t={token}\n")
        print("Ce lien n'est affiché qu'une fois et donne accès à la bêta : transmettez-le de façon privée.")
    elif args.command in {'revoke', 'restore'}:
        invites, _ = await store.report()
        matches = [i for i in invites if i['id'].startswith(args.id)]
        if len(matches) != 1:
            sys.exit(f"{len(matches)} invitation(s) correspondent à « {args.id} » : précisez l'identifiant.")
        await store.set_active(matches[0]['id'], args.command == 'restore')
        print(f"{matches[0].get('label')} : {'réactivée' if args.command == 'restore' else 'désactivée'}.")
    elif args.command == 'feedback':
        print(feedback_summary(await store.feedback_report()))
    else:
        invites, budget = await store.report()
        if args.command == 'list':
            print(f"{'id':12} {'étiquette':24} {'actif':6} {'aujourd’hui':12} expiration")
            for i in sorted(invites, key=lambda x: str(x.get('label'))):
                limit = i.get('daily_limit') or settings.invite_daily_limit
                print(f"{i['id'][:10]:12} {str(i.get('label'))[:24]:24} {'oui' if i.get('active', True) else 'NON':6} {str(i['today']) + '/' + str(limit):12} {i.get('expires_at') or '-'}")
        print(f"\nBudget global du jour : {budget.get('requests', 0)}/{settings.daily_request_cap} requêtes, "
              f"{budget.get('tokens', 0)}/{settings.daily_token_cap} tokens")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('create'); create.add_argument('label'); create.add_argument('--limit', type=int); create.add_argument('--days', type=int)
    for name in ('revoke', 'restore'):
        sub.add_parser(name).add_argument('id')
    sub.add_parser('list'); sub.add_parser('budget'); sub.add_parser('feedback')
    asyncio.run(main(parser.parse_args()))
