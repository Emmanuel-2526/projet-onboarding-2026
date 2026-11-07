# Onboarding

Module PHP/JavaScript intégré à l’intranet pour gérer les fiches des employés et leurs demandes de logiciels.

## Fonctions

- Rechercher et gérer les fiches employé.
- Récupérer depuis l’annuaire les entreprises, équipes, fonctions et managers.
- Générer les initiales, l’adresse e-mail et le nom de compte, et vérifier les doublons.
- Créer des demandes de logiciels à partir du catalogue et afficher leur statut.
- Transmettre les demandes au workflow d’approbation de l’intranet avec `p_SoftwareRequestCreate`.

## Fichiers

- `module1.phpi` : point d’entrée et contrôle des droits.
- `module1search.phpi` : recherche et affichage des employés et logiciels.
- `module1edit.phpi` : formulaires, traitements et appels AJAX.
- `module1.js` : validation, autocomplétion et interactions avec les modales.
- `apps.js` : emplacement réservé aux fonctions JavaScript partagées.
- `*.mp4` : vidéos de démonstration.

## Installation

Le module doit être déployé dans une installation existante de l’Intranet Framework. Il utilise `/app/init.phpi`, les scripts partagés de l’intranet, PHP avec l’extension SQLSRV et une base SQL Server configurée par le framework (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

Les URL définies dans `module1.js` pointent vers `/modules/Dev/module1/`. Si le module est installé ailleurs, mettez à jour `searchTargetRef`, `editURL`, `reloadContent` et `fctAjax`.

Le compte SQL et les droits du module doivent permettre l’accès aux objets suivants :

- `dbo.Onboarder` : fiches employé ;
- `dbo.aADUsers` : annuaire et données de référence ;
- `dbo.bApplicationPrice` : catalogue et prix ;
- `dbo.Approval`, `dbo.Notification`, `dbo.SoftwareRequest`, `dbo.sTasksBG` : demandes et suivi des approbations ;
- `p_SoftwareRequestCreate` : création d’une demande.

Les tables et la procédure stockée doivent déjà exister dans la base. Aucun script de création ou de migration SQL n’est fourni ici.
