# Projet Onboarding – Projet de fin d'année

## Présentation du projet

Dans le cadre de mon projet de fin d'année, j'ai travaillé sur un module de gestion de l'arrivée de nouveaux collaborateurs et de leurs demandes de logiciels.

Le travail a porté sur l'analyse du fonctionnement attendu, la conception de la base de données, le développement des écrans et des traitements, ainsi que la représentation des différentes étapes de validation.

**Ce projet a été réalisé uniquement dans un environnement de développement et de test, hors production.** Les tables créées ou ajoutées pour ce projet n'ont pas été déployées en production. Les travaux n'ont pas eu d'impact sur les données de production de l'entreprise.

## Objectifs

Le module a été conçu pour faciliter le suivi des arrivées et des demandes de logiciels associées. Il permet notamment de structurer les informations d'onboarding, de retrouver les dossiers, de suivre les demandes et de représenter leur circuit de validation.

## Fonctionnalités

- Création, consultation, modification et recherche de fiches d'onboarding.
- Aide à la saisie et vérification de certaines informations, notamment pour limiter les doublons.
- Sélection de logiciels à partir d'un catalogue.
- Suivi des demandes de logiciels et de leurs statuts.
- Gestion des étapes de validation et des décisions d'approbation ou de refus.
- Historique et traçabilité des opérations prévues dans le modèle de données.

Le développement initial s'appuyait sur le framework interne de l'entreprise. Certaines fonctionnalités ne peuvent donc pas être exécutées en dehors de cet environnement.

## Technologies utilisées

- **SQL Server et T-SQL** : création des tables, définition des clés et des contraintes, mise en place des relations.
- **PHP** : traitements côté serveur et gestion des formulaires.
- **JavaScript** : interactions dans les interfaces, contrôles et traitements côté navigateur.
- **Modélisation de données** : MCD, MLD, MPD et diagramme de base de données.

## Base de données

J'ai conçu et ajouté les tables nécessaires au fonctionnement du module dans l'environnement de développement. Le schéma présenté dans ce dépôt est une version de démonstration dans laquelle certains noms ont été remplacés.

### Onboarder
Suivi des informations d'onboarding.

### SoftwareCatalogDemo
Catalogue des logiciels.

### SoftwareRequest
Enregistrement des demandes de logiciels.

### Approval
Suivi des validations et des décisions.

### Notification
Notifications associées aux demandes.

### AuditLog
Historique des actions.

Le script SQL présente la structure des tables, les clés primaires et étrangères ainsi que les contraintes utilisées. Il ne contient pas d'export des données de production.

## Diagrammes et documentation

Plusieurs documents ont été réalisés pour expliquer la conception du projet :

- **Logigramme** : déroulement des principales étapes du processus.
- **MCD** : entités et associations identifiées pendant la conception.
- **MLD** : traduction du modèle conceptuel en tables et relations.
- **MPD** : organisation physique des données pour SQL Server.
- **Diagramme SQL** : représentation des relations entre les tables dans la base de développement.

Ces documents permettent de suivre le passage du besoin fonctionnel à la structure de la base de données. Les versions publiques doivent être vérifiées et, si nécessaire, anonymisées.

## Démonstrations

Des vidéos de démonstration ont également été réalisées pour présenter les parcours d'onboarding, les demandes de logiciels et les différentes décisions de validation. Elles ne sont destinées à être publiées qu'après vérification des informations visibles et des autorisations nécessaires.

## Organisation du dépôt

```text
onboarding-portfolio/
├── README.md
├── sql/
│   └── schema.sql
└── docs/
    ├── logigramme_simplifie.pptx
    ├── MCD_corrige.pptx
    ├── MLD.pptx
    └── MPD.pptx
```

Cette arborescence correspond à l'organisation prévue pour la version publique du projet.

## Installation et utilisation

Le fichier `sql/schema.sql` est prévu pour SQL Server. Il doit être exécuté dans une base locale ou de test et vérifié avant utilisation.

Le dépôt a pour objectif de présenter le travail de conception et de développement réalisé pendant le projet de fin d'année. Il ne contient pas l'ensemble des composants du framework interne et ne constitue donc pas une application autonome prête à être installée.

## Confidentialité

Le projet a été développé hors production. Pour la version destinée à GitHub, les références internes identifiées sont remplacées lorsque cela est nécessaire, et le code dépendant du framework propriétaire n'est pas inclus.

La publication des schémas, des diagrammes, des captures et des vidéos reste soumise à la vérification de leur contenu et à l'autorisation de l'entreprise lorsque celle-ci est requise. Le fait que le projet ait été réalisé hors production ne suffit pas, à lui seul, à autoriser la diffusion de tous ses éléments.

## Compétences mises en pratique

Ce projet m'a permis de travailler sur l'analyse fonctionnelle, la modélisation relationnelle, SQL Server, le développement PHP et JavaScript, la gestion des étapes de validation, les tests en environnement de développement et la documentation technique.
