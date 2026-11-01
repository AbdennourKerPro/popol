#!/usr/bin/env python3
"""Materialize explicit Codex annotations after reading all repeat responses.

No model call and no automatic semantic judge. Every score/coverage below is an
assessor judgment. Exact excerpts are checked against the saved complete answer.
"""
import hashlib
import json
from pathlib import Path
from prepare_human_review import BENCH, REPEAT, JUDGMENTS, lines, read, write


def p(coverage, excerpt, reason):
    return [coverage, excerpt, reason]


def c(number, scores, points, sources, limits, clarity):
    return {'id': f'CH2-{number:03d}', 'scores': scores, 'points': points,
            'sources': sources, 'limits': limits, 'clarity': clarity}


REVIEWS = [
 c(1,[2,2,2,2],[p(1,'les LBO ne seraient possibles que si les salariés reprennent l’entreprise','L’exception salariée et le refus de l’interdiction absolue sont explicités.')],
   'La condition vient de s01-ss04-m004, sans demander au lexique de la prouver.', 'Aucun ratio de dette ni autre repreneur ajouté.', 'Le « Non » corrige directement la prémisse.'),
 c(2,[2,2,2,2],[p(1,'la dette détenue par la Banque centrale européenne en dette perpétuelle, à taux zéro','BCE, perpétuité et taux zéro sont tous couverts ; la fiche confirme l’absence d’intérêt.')],
   'La mesure BCE prouve le taux zéro ; la définition générale n’est pas utilisée à contre-sens.', 'Pas d’annulation de toute dette, publique ou privée.', 'Transformation demandée résumée en une phrase ciblée.'),
 c(3,[2,2,2,2],[p(1,'les communes, les départements et les régions','Les trois échelons sont nommés.'),p(1,'La dotation des communes serait indexée sur l’inflation','L’indice et le bénéficiaire sont exacts.')],
   's02-ss05-m001 soutient les échelons et m005 la dotation.', 'Pas de formule ou montant de dotation ajouté.', 'Les deux réponses sont séparées en deux phrases.'),
 c(4,[2,2,2,2],[p(1,'200 €','Montant rattaché aux dons aux partis.'),p(1,'une durée minimale de 10 ans','Le minimum et le pantouflage sont conservés.')],
   'Les mesures de dons et de pantouflage sont citées pour leurs chiffres respectifs.', 'Ni périodicité des dons ni point de départ du délai inventé.', 'Les deux paramètres et leurs objets restent distincts.'),
 c(5,[2,2,2,2],[p(1,'700 000 logements par an','Objectif et périodicité exacts.'),p(1,'rénovation obligatoire des passoires avant leur mise en location','Obligation placée avant la location.')],
   'm001 et m002 de Rénovation portent les deux propositions.', 'Aucune date d’application ou classe DPE ajoutée.', 'Phrase directe sur l’objectif et la condition locative.'),
 c(6,[2,2,2,2],[p(1,'l’abolition de l’obsolescence programmée, l’allongement des garanties','Les deux composantes de la première mesure sont présentes.'),p(1,'un service public de la réparation et du réemploi','Les deux missions du service sont conservées.')],
   'Les citations de Consommation soutiennent durée et service public.', 'La fiche précise que durée et modalités ne sont pas détaillées.', 'Les trois éléments demandés sont regroupés sans confusion.'),
 c(8,[2,2,2,2],[p(1,'0,7 % du revenu national','Le taux est rattaché au revenu national, sans substitution PIB.'),p(1,'conditionnée au respect des droits humains','La condition est appliquée à l’aide au Sahel.')],
   'm001 et m005 de Développement sont les preuves des deux volets.', 'Aucune conversion en euros ni condition supplémentaire.', 'Taux et condition sont chacun sur leur phrase.'),
 c(9,[2,2,2,2],[p(1,'le droit de mourir dans la dignité, avec assistance','L’assistance est conservée.'),p(1,'l’accès aux soins palliatifs. Tous deux seraient inscrits dans la Constitution','Deuxième droit et constitutionnalisation des deux sont couverts.')],
   'La mesure unique de Fin de vie contient les deux droits.', 'Aucun critère médical ou droit actuel décrit.', 'Les deux droits puis leur statut proposé sont lisibles.'),
 c(10,[2,2,2,2],[p(1,'des protections périodiques gratuites','Gratuité correctement énoncée.'),p(1,'le remboursement du traitement de la ménopause','Remboursement correctement énoncé.')],
   'Les deux mesures de Santé des femmes soutiennent leurs objets respectifs.', 'Aucun taux ou restriction ajouté.', 'Réponse courte adaptée aux deux propositions.'),
 c(11,[2,2,2,2],[p(1,'Le bac professionnel rétabli est prévu en 4 ans','La durée est associée au cursus, sans calendrier de mise en œuvre.'),p(1,'elle est soumise à une condition de ressources','La gratuité des internats est explicitement conditionnelle.')],
   'Le bac et les internats sont appuyés par m005 et m009.', 'Aucun plafond de ressources inventé.', 'La réponse corrige explicitement « sans condition ».'),
 c(12,[2,2,2,2],[p(1,'4 heures obligatoires d’EPS','Nombre et obligation sont présents.'),p(1,'obligatoire l’apprentissage de la natation','La natation n’est pas transformée en option.')],
   'Les deux sources Sport à l’école correspondent aux deux enseignements.', 'Pas de périodicité des quatre heures ou de séances inventée.', 'Les deux éléments sont immédiatement identifiables.'),
 c(13,[2,2,2,2],[p(1,'moyens humains renforcés, et l’infiltration est présentée comme prioritaire','Moyens et priorité sont tous deux présents.'),p(1,'Le contrôle est confié au juge judiciaire','La catégorie de juge est exacte.')],
   'Renseignement et juge judiciaire viennent des deux mesures citées.', 'Ni acte contrôlé ni procédure d’autorisation précisée sans texte.', 'Moyens, priorité et contrôle restent séparés.'),
 c(14,[2,2,2,2],[p(1,'le non-alignement au maintien du dialogue avec le monde entier','La fausse opposition non-alignement/dialogue est corrigée.'),p(1,'refus de toute alliance militaire permanente en Asie-Pacifique','Portée géographique et permanence conservées.')],
   'Les deux mesures de Diplomatie soutiennent le non-alignement et la limite des alliances.', 'Aucune interdiction mondiale de coopération déduite.', 'Le « Non » initial répond à la prémisse.'),
 c(15,[2,2,2,2],[p(1,'au titre de leurs fonctions','La restriction vise le rôle officiel des élus.'),p(1,'un refus de tout financement public des cultes','Position générale correctement donnée.')],
   'Les deux mesures de Laïcité portent les règles générales ; le Concordat est un complément séparé appuyé par l’annexe.', 'Aucune interdiction de pratique privée ni sanction créée.', 'La réponse principale est distinguée du complément local.'),
 c(16,[2,2,2,2],[p(1,'les pôles Arctique et Antarctique comme des biens communs','Les deux pôles et leur statut proposé sont cités.'),p(1,'les grands fonds marins et la haute mer','Les espaces explicitement protégés sont nommés.')],
   'Deux sources de la rubrique internationale prouvent chacun des volets.', 'Aucune annexion ou frontière inventée.', 'Statut des pôles et espaces marins sont distingués.'),
 c(17,[2,2,2,2],[p(1,'une entreprise qui fraude ne pourrait plus négocier sa sanction','La fin de négociation est correctement énoncée.'),p(1,'les entreprises publient toutes les aides publiques qu’elles reçoivent','Portée de publicité des aides complète.')],
   'Les sources Fraude m002/m005 correspondent aux deux changements.', 'La réponse note que les modalités de publication manquent ; aucune peine créée.', 'Le lien entre publication et visibilité est simple et sans assimilation à une suppression.'),
 c(18,[2,2,2,2],[p(1,'aider les ménages surendettés et à garantir leur accès aux services bancaires de base','Aide et accès bancaire sont présents.'),p(1,'soutenir les ménages face à leurs dettes tout en préservant cet accès bancaire','L’intérêt est une reformulation du soutien et de l’accès explicitement proposés.')],
   'La mesure m012 soutient les deux composantes ; aucun avantage externe empirique allégué.', 'Le texte ne garantit ni effacement des dettes ni modalités précises.', 'Réponse directement reliée aux deux difficultés du ménage.'),
 c(19,[2,2,2,2],[p(1,'mettre fin à l’étalement urbain','La paraphrase est retrouvée et l’objectif est exact.')],
   's03-ss02-m009 donne la proposition exacte.', 'Aucun hectare, calendrier ou arrêt de toute construction affirmé.', 'La proposition et sa limite de détail sont courtes.'),
 c(20,[2,2,2,2],[p(1,'interdire l’élevage et le commerce de fourrure','Les deux activités de la mesure sont conservées.'),p(1,'interdire la présence d’animaux sauvages dans les cirques','Animaux sauvages et cirques restent le périmètre.')],
   'Deux citations Condition animale soutiennent chacun des usages.', 'Pas d’interdiction de tout élevage ou de tout animal domestique.', 'Deux propositions nettement présentées.'),
 c(21,[2,2,2,2],[p(1,'un moratoire sur les forages en Méditerranée et sur l’extraction minière profonde','Les deux objets du moratoire sont repris sans fixer une nouvelle aire de l’extraction.')],
   'La mesure Biodiversité m009 est reprise fidèlement.', 'La réponse réserve explicitement portée et modalités.', 'Réponse proportionnée à la question précise de moratoire.'),
 c(22,[2,2,2,2],[p(1,'d’individualiser et d’automatiser les droits','Les deux mécanismes généraux sont présents.'),p(1,'de lutter contre le non-recours','Le non-recours est explicite.'),p(1,'On peut en attendre, par interprétation','Le bénéfice d’accès est formulé conditionnellement et identifié comme interprétation dans le même bloc.')],
   'Les deux mesures Pauvreté soutiennent mécanismes et objectif ; l’effet attendu n’est pas présenté comme preuve observée.', 'Aucun effet chiffré ni disparition garantie, modalités non précisées.', 'Mécanismes, intérêt et limites sont ordonnés.'),
 c(23,[2,2,2,2],[p(1,'créer un service public de la publication scientifique','Service public correctement identifié.'),p(1,'des revues scientifiques francophones en accès libre','Accès libre explicitement rattaché à cette mesure, pas à la revue de haut niveau.'),p(1,'Ce sont des effets attendus ou des interprétations des mesures','L’intérêt de diffusion et de consultation est prudent et distingue la revue facultative.')],
   'Trois sources distinguent publication publique, accès libre et haut niveau ; la troisième n’est pas utilisée comme preuve de gratuité.', 'Pas de gratuité de toutes les publications ni de fonctionnement inventé.', 'Les propositions sont séparées de leur intérêt attendu.'),
 c(24,[2,2,2,2],[p(1,'une aide juridictionnelle augmentée et le rétablissement de tribunaux de proximité','Aide et proximité toutes deux couvertes.'),p(1,'en citant le divorce','La gratuité des procédures courantes et son exemple sont donnés juste avant cet extrait.')],
   'm003/m005 justifient les attentes ; les moyens et recrutements complémentaires sont appuyés par m001.', 'Aucune gratuité universelle de tout avocat ou de toute procédure.', 'La réponse et les fiches expliquent aide, distance et coût.'),
 c(25,[2,2,2,2],[p(1,'700 000 logements par an','Nombre limité aux logements et périodicité annuelle.'),p(1,'rénovation complète des réseaux d’eau','Le chantier eau est explicite.'),p(1,'modernisation du réseau électrique','Le chantier électricité est explicite.'),p(1,'à titre d’interprétation et sans que le résumé garantisse ces effets','Les intérêts des trois chantiers sont ensuite développés et dans chaque fiche, avec prudence.')],
   'Les trois mesures correspondent aux trois chantiers et ne partagent pas le chiffre 700 000.', 'Pas d’économies, de fuites ou gains de fiabilité chiffrés.', 'Réponse principale factuelle, puis intérêts et fiches par chantier.'),
 c(26,[2,2,2,2],[p(1,'une taxe sur les retransmissions et les transferts','Les deux assiettes financent le sport amateur dans le même bloc.'),p(1,'interdire la publicité pour les paris sportifs','Il s’agit bien de publicité, pas d’interdiction du jeu.'),p(1,'créer une association sportive dans chaque école primaire','Périmètre primaire universel conservé.'),p(1,'ces effets sont des interprétations','Le financement est attribué au texte et les deux autres intérêts sont séparés comme interprétations.')],
   'Les trois citations Sport/EPS soutiennent chaque proposition.', 'Pas de taux de taxe ni de résultat démontré inventé.', 'Trois volets puis distinction objectifs/effets, avec fiches séparées.'),
 c(27,[2,2,2,2],[p(1,'un programme de dépollution des orbites','Le volet spatial est présent.'),p(1,'une baisse de leur consommation et une autorisation obligatoire','Les deux éléments data centers sont présents.'),p(1,'Les deux sujets sont traités séparément','Le bloc distingue effectivement les deux objets sous deux lignes nommées.')],
   'Les mesures Espace et Numérique/environnement correspondent chacune à leur ligne.', 'Consommation non chiffrée ; pas de transformation de l’autorisation en interdiction.', 'Deux puces identifient les milieux distincts.'),
 c(28,[2,2,2,2],[p(1,'le soutien à la pêche artisanale et la lutte contre la pêche illégale','Les deux éléments pêche sont couverts.'),p(1,'une structure commune de dépollution','La mesure est bien placée dans le contexte méditerranéen.'),p(1,'une force commune de sécurité civile','La nature civile est conservée.'),p(1,'Ces champs d’action se distinguent par leur objet','La distinction pêche/dépollution/intervention est développée sans devenir une force militaire.')],
   'Citations principales soutiennent pêche, dépollution et secours. Les compléments pêche électrique, moyens sous-marins, normes et plan général ont chacun une source et gardent leurs limites dans les fiches.', 'Aucun pays, budget ni impact chiffré inventé ; le plan général de dépollution n’est pas réattribué à la Méditerranée.', 'Les compléments sont plus longs mais les trois fonctions restent lisibles.'),
 c(29,[2,2,2,2],[p(1,'les entreprises publieraient toutes les aides publiques reçues','La transparence n’est pas confondue avec la suppression.'),p(1,'le Crédit d’impôt recherche serait supprimé « au profit du public »','Suppression et destination gardées ensemble.'),p(1,'l’évaluation confiée à des pairs élus','HCERES supprimé et pairs élus dans le même bloc.'),p(1,'Trois propositions distinctes','La réponse et les trois fiches distinguent transparence, financement et évaluation.')],
   'Les trois mesures justifient les registres ; le sigle HCERES est développé grâce au lexique.', 'Le dispositif remplaçant le CIR n’est pas inventé.', 'Trois propositions et fiches distinctes malgré le statut partial.'),
 c(32,[2,2,2,2],[p(1,'pour les communes','Le référent de la coopération est nommé.'),p(1,'le refus des fusions forcées','La fausse conséquence d’une fusion imposée est corrigée.')],
   'Liberté de coopération et refus de fusion sont chacun cités.', 'Pas de procédure ou seuil de fusion ajouté.', 'Le Non répond directement au suivi et explique le lien.'),
 c(33,[2,2,2,2],[p(1,'des contractuels de la recherche','Le secteur implicite est explicitement résolu.'),p(1,'la titularisation des contractuels','La mesure attendue est donnée.')],
   'La source Recherche m012 soutient titularisation et complément d’abrogation.', 'Pas de généralisation à tous les secteurs ni calendrier individuel.', 'La recherche est nommée dans la réponse, pas seulement dans l’historique.'),
 c(34,[2,2,2,2],[p(1,'Pour le HCERES','Le bloc sépare cette branche de la phrase « Pour l’ANR », avec une réponse distincte pour chaque objet.'),p(1,'il ne dit pas explicitement que les grands instituts les remplaceraient','Le transfert exhaustif de missions n’est pas inventé ; les deux organismes ne sont pas confondus.')],
   'm010 et m006 sont cités chacun pour leur branche.', 'Les missions de l’ANR restent explicitement non attribuées.', 'Réponse conditionnelle distinguant les deux organismes, admise sans question de clarification supplémentaire.'),
 c(35,[2,2,2,2],[p(1,'700 000 logements par an','Objectif annuel correctement donné.'),p(1,'ne permet pas de chiffrer la baisse annuelle de votre facture','Le gain individuel est refusé faute de données, sans valeur inventée.')],
   'L’objectif est sourcé par m001 ; le chauffage au fioul complémentaire par m004.', 'Ni prix de l’énergie ni performance ni montant individuel supposés.', 'Le connu et l’impossibilité de calcul individuel sont séparés.'),
 c(36,[2,2,2,2],[p(1,'plafonner les frais bancaires','La proposition connue est donnée.'),p(1,'le montant exact du plafond mensuel en euros n’est pas indiqué','La limite cible bien le montant et sa mensualité.')],
   'La mesure bancaire m011 soutient le plafonnement sans prétendre fournir son montant.', 'Pas de reprise du plafond des dons ou d’un barème actuel.', 'La proposition et le paramètre manquant sont dans une phrase claire.'),
 c(37,[2,2,2,2],[p(1,'un service public de la publication scientifique','Le service demandé est nommé.'),p(1,'aucune enveloppe annuelle pour financer ce service','Le manque de budget est correctement rattaché au service précis.')],
   'm005 soutient le service ; m009 est un complément vrai sur l’accès libre.', 'Le budget général de recherche n’est pas attribué au service.', 'Le complément reste distinct de la limite budgétaire.'),
 c(39,[2,2,2,2],[p(1,'leur interdiction dans les jours précédant une élection','La période relative est reprise.'),p(1,'Il ne précise pas le nombre exact de jours','L’absence de durée chiffrée est explicite.')],
   'La mesure Sondages m019 porte la proposition et son manque de durée détaillée.', 'Aucun délai légal actuel ou règle permanente inventés.', 'La réponse courte distingue les jours précédents d’un nombre exact.'),
 c(40,[2,2,2,2],[p(1,'il ne dit pas que ces logements sont déjà tous isolés','La fausse réalisation et l’économie annuelle ne sont pas affirmées.'),p(1,'une citation inventée','Le bloc refuse explicitement de l’attribuer au résumé ; le quote est la vraie mesure.')],
   'La citation littérale est exactement la mesure d’isolation, pas celle demandée par la fabrication.', 'Objectif distingué du bilan, sans économie par ménage inventée.', 'Le refus puis la citation réelle sont nets.')
]


def main():
    refs = {r['id']: r for r in lines(BENCH / 'references.jsonl')}
    raw = {r['id']: r for r in lines(REPEAT / 'responses.jsonl')}
    focused = {c['id']: c for c in read(REPEAT / 'audit-focused.json')['cases']}
    output = dict(focused)
    for spec in REVIEWS:
        identifier = spec['id']; response = raw[identifier]['answer']
        texts = [b['text'] for b in response['blocks']] + [m['explanation'] for m in response['measures']] + [m['expected_benefit'] for m in response['measures']]
        assert len(spec['points']) == len(refs[identifier]['criteria']), identifier
        for point in spec['points']:
            assert any(point[1] in text for text in texts), (identifier, point[1])
        notes = ' '.join(point[2] for point in spec['points'])
        conditional = {}
        if identifier == 'CH2-034':
            conditional = {'if_hceres_branch': [1], 'if_anr_branch': [1]}
        if identifier == 'CH2-040':
            conditional = {'if_isolation_target_given': [1]}
        output[identifier] = {'id': identifier, 'scores': spec['scores'],
            'dimension_reasons': {'accuracy': notes, 'sources': spec['sources'], 'limits': spec['limits'], 'clarity': spec['clarity']},
            'criteria': [point[0] for point in spec['points']],
            'criteria_evidence': [{'id': criterion['id'], 'coverage': point[0], 'answer_excerpt': point[1], 'reason': point[2]}
                for criterion, point in zip(refs[identifier]['criteria'], spec['points'])],
            'conditional': conditional, 'critical_errors': [], 'false_absence': False,
            'borderline_for_human_review': False, 'notes': notes + ' ' + spec['limits']}
    assert len(output) == 40 and set(output) == set(refs)
    write(REPEAT / 'audit-decisions.json', {
        'assessment_benchmark_version': read(BENCH / 'manifest.json')['version'],
        'assessment_gold_sha256': hashlib.sha256((BENCH / 'references.jsonl').read_bytes()).hexdigest(),
        'amendment': 'benchmarks/chati-v2/amendment-CH2-007.json',
        'reviewer': 'Codex de cette session : relecture des 40 réponses complètes, du corrigé et des sources. Pas de jugement humain. Scores explicites, extraits contrôlés et raisons propres aux critères/dimensions ; aucun taux de fidélité lien par lien revendiqué.',
        'responses_sha256': read(REPEAT / 'run.json')['responses_sha256'],
        'conditional_rationale': {'CH2-034': 'Les deux branches HCERES/ANR sont développées, sans transfert des missions inventé.',
                                  'CH2-040': 'L’objectif réel est développé et cité exactement.'},
        'cases': [output[identifier] for identifier in sorted(output)]})
    print('Forty explicit repeat judgments saved; raw responses and baseline audit preserved.')


if __name__ == '__main__':
    main()
