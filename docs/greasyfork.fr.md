# OpenAI Status Companion

Consultez l’état officiel des services OpenAI sans quitter votre conversation. Ce script utilisateur indépendant utilise les données de **status.openai.com** ; il n’est pas un produit OpenAI et ne mesure ni la disponibilité de votre compte personnel ni celle d’un site tiers.

## Sites pris en charge

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Informations et fonctionnalités

- En position automatique, le bouton d’état suit la barre latérale gauche. Le bouton, le panneau et les notifications se déplacent pour laisser accessibles les menus, les champs de saisie et les autres commandes. Ils peuvent disparaître temporairement si la place manque.
- Consultez les composants par groupe, les incidents en cours, les maintenances planifiées et l’heure de la dernière actualisation réussie.
- Choisissez la [langue de l’interface](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md) ou laissez le script suivre celle de la page ou du navigateur. Les titres et les messages officiels des incidents s’affichent dans leur langue d’origine.
- Le script peut suivre le thème clair ou sombre du site. Vous pouvez aussi choisir un thème et un coin de l’écran. Le clavier permet de naviguer et la touche Échap ferme le panneau.
- L’état des services est actualisé toutes les 60 secondes tant que la page est visible. L’actualisation est suspendue en arrière-plan. Les requêtes expirent après 15 secondes. En cas d’échec, le panneau indique qu’il affiche les dernières données mises en cache.
- Si le script utilise l’ancienne API, les sections dont les données n’ont pas pu être vérifiées sont signalées.

## Installation et utilisation

Installez un gestionnaire de scripts utilisateur tel que Tampermonkey, puis cliquez sur **Installer ce script** ci-dessus. Ouvrez un site pris en charge, cliquez sur le bouton d’état, puis utilisez le bouton en forme de roue dentée pour accéder aux préférences. Si votre gestionnaire nécessite une configuration du navigateur pour exécuter les scripts utilisateur, suivez ses instructions d’installation officielles.

## Confidentialité et autorisations

Le script envoie des requêtes GET anonymes à `status.openai.com`, sans les cookies de votre compte. Il vérifie la position, la taille et la visibilité des éléments de la page et consulte les paramètres de langue et de thème. Il ne lit ni ne transmet vos requêtes, vos conversations ou vos jetons de compte. Vos préférences et les informations servant à éviter les notifications en double sont enregistrées localement. Le script n’inclut ni suivi d’utilisation, ni publicité, ni code exécutable distant, ni service de traduction tiers.

## Code source et assistance

[Code source, documentation et suivi des problèmes](https://github.com/laipeng101/openai-status-companion). Licence MIT. Le script utilisateur complet et lisible est hébergé ici ; le code source et les descriptions localisées sont synchronisés automatiquement par un webhook déclenché lors des push GitHub. Installez le script et ses mises à jour via Greasy Fork.

Les tests comprennent des vérifications automatisées et des contrôles de l’affichage sur une page de test locale dans Chrome, sur ordinateur et à 390 px de largeur. Des contrôles ont aussi été effectués sur Leopard-X avec des données d’état publiques recueillies auparavant. Le [document de validation](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) présente les résultats et le périmètre des tests. Les mises à jour des sites peuvent modifier le placement.

[Journal des modifications](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [Langues disponibles](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
