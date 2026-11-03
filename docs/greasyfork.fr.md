# OpenAI Status Companion

Consultez l’état officiel des services OpenAI sans quitter votre conversation. Ce script utilisateur indépendant utilise les données de **status.openai.com** ; il n’est pas un produit OpenAI et ne mesure ni la disponibilité de votre compte personnel ni celle d’un site tiers.

## Sites pris en charge

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Informations et fonctionnalités

- En mode de position automatique, un bouton d’état compact se place à côté de la barre latérale gauche et suit son ouverture, sa fermeture et ses changements de largeur. Sur un écran étroit, le bouton reste dans un coin et le panneau reste dans les limites de la zone d’affichage.
- Groupes de composants officiels, incidents en cours, maintenances planifiées et heure de la dernière récupération réussie.
- 13 langues d’interface : anglais, chinois simplifié et traditionnel, espagnol, hindi, portugais du Brésil, japonais, coréen, français, allemand, indonésien, arabe et russe. La langue de la page ou du navigateur est détectée automatiquement ; une sélection manuelle est également disponible. L’arabe utilise une disposition de droite à gauche. Les titres et messages des incidents officiels restent dans leur langue d’origine ; aucun service de traduction n’est utilisé.
- Suivi du thème clair ou sombre du site, choix manuel du thème et du coin d’affichage, navigation au clavier et fermeture avec Échap.
- Les pages visibles sont actualisées toutes les 60 secondes ; les requêtes périodiques sont suspendues en arrière-plan. Les requêtes expirent après 15 secondes. En cas d’échec de l’actualisation, les données en cache sont conservées et clairement signalées.
- Les données de compatibilité incomplètes sont explicitement marquées comme non vérifiées et ne sont pas présentées comme une confirmation que tout fonctionne.

## Installation et utilisation

Installez un gestionnaire de scripts utilisateur tel que Tampermonkey, puis cliquez sur **Installer ce script** ci-dessus. Ouvrez un site pris en charge, cliquez sur le bouton d’état, puis utilisez le bouton en forme de roue dentée pour accéder aux préférences. Si votre gestionnaire nécessite une configuration du navigateur pour exécuter les scripts utilisateur, suivez ses instructions d’installation officielles.

## Confidentialité et autorisations

Les requêtes d’état sont des requêtes GET anonymes vers `status.openai.com`, sans les cookies de votre compte. Le script examine la géométrie de la barre latérale ainsi que les attributs de langue et de thème de la page ; il ne lit ni ne transmet vos prompts, conversations ou jetons de compte. Seules ses préférences et une empreinte des notifications d’état sont enregistrées localement. Aucun outil d’analyse d’utilisation, publicité, dépendance exécutable distante ou service de traduction tiers n’est inclus.

## Code source et assistance

[Code source, documentation et suivi des problèmes](https://github.com/laipeng101/openai-status-companion). Licence MIT. Le script utilisateur complet et lisible est hébergé ici ; le code source et les descriptions localisées sont synchronisés automatiquement par un webhook déclenché lors des push GitHub. Installez le script et ses mises à jour via Greasy Fork.

Les tests comprennent des régressions automatisées, des vérifications de pages de test dans Chrome aux formats bureau et 390 px de large, ainsi qu’une intégration à la mise en page réelle de Leopard-X en rejouant des données d’état publiques. Consultez le [document de validation](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) du dépôt pour connaître les résultats et les limites des vérifications. La mise en page des sites pris en charge peut évoluer.
