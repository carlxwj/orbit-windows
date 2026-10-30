# Orbit 2.0

### Votre PC, en un coup d'œil.

**Application de bureau pour Windows 11 · Electron · React · TypeScript · C#**

[![Source checks](https://github.com/carlxwj/orbit-windows/actions/workflows/checks.yml/badge.svg)](https://github.com/carlxwj/orbit-windows/actions/workflows/checks.yml)
[![Windows build](https://github.com/carlxwj/orbit-windows/actions/workflows/windows.yml/badge.svg)](https://github.com/carlxwj/orbit-windows/actions/workflows/windows.yml)

Orbit est une application de bureau conçue pour explorer son ordinateur depuis une interface claire, moderne et personnalisable. Elle réunit les informations matérielles, les mesures de performance et les périphériques dans un seul espace, sans passer par une page web.

> **English summary:** Orbit is a privacy-conscious Windows 11 desktop application for exploring hardware, live performance, displays, storage, peripherals, and system information. It combines an Electron/React interface with a local C# collector. Hardware readings depend on what Windows and the device manufacturers expose.

**Statut du projet :** développement et validation en cours. Le code source est disponible ; le lancement de l'interface, la compatibilité matérielle et les installateurs doivent encore être vérifiés sur des configurations Windows réelles avant toute distribution générale.

**Vérification continue :** [Tests de la source](https://github.com/carlxwj/orbit-windows/actions/workflows/checks.yml) · [Compilation Windows](https://github.com/carlxwj/orbit-windows/actions/workflows/windows.yml)

**Dossier technique approfondi (30 pages) :** [Lire l'étude de cas complète — conception, problèmes résolus, architecture et tests (PDF)](docs/ETUDE_DE_CAS_TECHNIQUE_ORBIT_2.pdf)

Le workflow Windows a produit avec succès les cibles installable et portable le 30 octobre 2026. Ces exécutables ne sont pas signés et leur création ne garantit pas encore la compatibilité avec tous les matériels. Les fichiers de compilation sont disponibles comme artefacts des exécutions GitHub Actions, selon leur durée de conservation.

---

## Pourquoi Orbit ?

Les informations d'un PC sont réparties entre de nombreux écrans et utilitaires Windows. Orbit cherche à les rendre plus faciles à consulter : **voir l'essentiel immédiatement, explorer les détails lorsque c'est nécessaire et conserver le contrôle de ses données**.

L'interface s'inspire des applications de bureau modernes : navigation latérale, cartes lisibles, thèmes clair/sombre, graphiques et raccourcis clavier. Le projet est une application Electron autonome, **pas un simple site `index.html` ouvert dans un navigateur**.

## Fonctionnalités

| Espace | Informations et fonctions prévues dans le code |
| --- | --- |
| **Vue d'ensemble** | Synthèse du PC, état de la collecte et indicateurs essentiels. |
| **Performances** | Mesures et courbes CPU, RAM, GPU, disque et réseau selon la disponibilité des sources Windows. |
| **Matériel** | Processeur, carte graphique, mémoire, carte mère, BIOS et inventaire technique. |
| **Périphériques** | Claviers, souris et autres appareils USB/HID/Bluetooth ; regroupement et personnalisation de leurs fiches. |
| **Écrans** | Résolution, fréquence d'actualisation, informations EDID et état HDR lorsque Windows les fournit. |
| **Stockage** | Disques physiques, partitions, volumes, capacités et certaines informations de santé disponibles. |
| **Réseau** | Interfaces réseau, statistiques, Wi-Fi et informations de connexion exposées par le système. |
| **Audio** | Sorties audio Windows, volume et sourdine via les interfaces système prises en charge. |
| **Profil** | Nom du compte Windows et photo locale lorsqu'elle est accessible, avec possibilité d'avatar personnalisé. |
| **Concentration** | Minuteur et préférences dédiées à la concentration. |
| **Personnalisation** | Thèmes, préférences locales, barre latérale, navigation rapide et recherche `Ctrl + K`. |

### Une information inconnue reste inconnue

Orbit **n'invente pas les mesures**. Un périphérique sans niveau de batterie exploitable affiche une valeur indisponible : c'est notamment possible avec une souris ou un clavier sans fil connecté par un récepteur USB 2,4 GHz. Les protocoles de fabricants non documentés ne sont pas interrogés expérimentalement.

De même, les relevés de température, de GPU, de batterie ou d'écran dépendent de Windows, des pilotes et des interfaces réellement exposées. Certaines fonctions peuvent être partielles ou indisponibles selon le matériel.

## Technologies

| Couche | Technologies |
| --- | --- |
| Interface | React 19, TypeScript, Vite, CSS, Lucide React |
| Application de bureau | Electron 45, processus principal et preload |
| Collecte système | C# / .NET Framework 4.x, API Windows, WMI, SMBIOS, DXGI, HID et autres sources disponibles |
| Communication | IPC Electron contrôlé et échanges locaux JSON avec `OrbitBridge.exe` |
| Tests et qualité | Node.js Test Runner, ESLint, TypeScript, Playwright (scénarios préparés) |
| Distribution | electron-builder, installateur NSIS et cible portable pour Windows x64 |

## Architecture

```text
┌───────────────────────────────────┐
│ Interface React / TypeScript      │
│ Pages, graphiques et préférences  │
└────────────────┬──────────────────┘
                 │ API limitée window.orbit
┌────────────────▼──────────────────┐
│ Electron preload (contextBridge)  │
│ Vérification et isolation IPC     │
└────────────────┬──────────────────┘
                 │
┌────────────────▼──────────────────┐
│ Electron main                     │
│ Fenêtre, données locales, collecte│
└────────────────┬──────────────────┘
                 │ JSON local stdin/stdout
┌────────────────▼──────────────────┐
│ OrbitBridge.exe — C#              │
│ APIs système Windows              │
└───────────────────────────────────┘
```

Le code de l'interface est séparé de la récupération des données matérielles. Cette séparation facilite la maintenance, les tests et la limitation des privilèges.

Pour approfondir : [architecture technique](docs/ARCHITECTURE.md) et [sources et limites des mesures](docs/HARDWARE.md).

## Installation et développement

### Prérequis

- **Windows 11 x64** ;
- **Node.js 22.18 ou supérieur** et npm ;
- **PowerShell** ;
- compilateur C# du **.NET Framework 4.x** (`csc.exe`) disponible sur Windows pour construire le collecteur local.

Depuis le dossier du projet :

```powershell
npm ci
npm run dev
```

`npm run dev` compile d'abord le collecteur C#, construit l'interface, puis lance la fenêtre Electron en mode développement. Aucune application web hébergée ni aucun serveur HTTP de développement n'est nécessaire.

### Vérifier le code

```powershell
npm run typecheck
npm run lint
npm test
npm run native
npm run test:native
```

### Construire l'application Windows

```powershell
npm run build
npm run dist
```

Si la compilation et le packaging réussissent, les exécutables installable et portable sont produits dans `release/`. **Ces exécutables ne sont pas conservés dans ce dépôt Git.** Le build n'est pas signé numériquement dans la configuration fournie.

Les scénarios Electron/Playwright peuvent être lancés sur un poste Windows configuré :

```powershell
npm run test:desktop
```

Consultez le [guide d'installation](docs/INSTALLATION.md) et le [guide de distribution](docs/DEPLOIEMENT.md) avant toute publication d'un exécutable.

## Qualité et état des vérifications

Sur la copie source préparée le **30 octobre 2026** :

- **22 tests unitaires sur 22 réussis** ;
- vérification TypeScript réussie ;
- ESLint terminé sans avertissement ;
- analyse locale de secrets réalisée sur la copie destinée à GitHub.

**À valider séparément sur Windows :** lancement complet de l'interface, compilation et exécution du bridge sur le poste cible, mesures de matériel réel, tests de compatibilité, comportement multiécran, création et installation des `.exe`, désinstallation et tests de sécurité en conditions réelles.

Ces tests ne garantissent pas l'absence de bugs ou de vulnérabilités. Voir [validation](docs/VALIDATION.md) et [audit du projet](docs/AUDIT.md).

## Confidentialité et sécurité

Orbit est conçu pour fonctionner **principalement en local**, sans compte Orbit, publicité, police distante ni télémétrie de diagnostic envoyée à un service distant dans la version actuelle.

- L'interface Electron utilise l'isolation de contexte, le sandbox et une passerelle IPC restreinte.
- Le collecteur est un programme local ; il ne demande pas de mots de passe Microsoft et ne collecte pas de jetons de connexion.
- Les préférences sont conservées localement et les informations indisponibles ne sont pas remplacées par de fausses valeurs.
- Les journaux de diagnostic sont conçus pour être limités et expurgés.

**Attention :** les noms de PC, identifiants matériels, adresses réseau, captures et journaux exportés peuvent être personnels. Ne publiez pas de diagnostics bruts. Aucun système informatique ne peut être garanti sans faille.

En savoir plus : [sécurité et données](docs/SECURITE_DONNEES.md) · [politique de sécurité](SECURITY.md).

## Organisation du dépôt

```text
src/                   Interface et pages React
src/pages/             Vues Vue d'ensemble, Matériel, Écrans, etc.
electron/main/          Fenêtre Electron, collecte et IPC
electron/preload/       API contrôlée exposée à React
system/native/         Collecteurs C# pour les API Windows
system/collectors/     Normalisation des informations système
shared/                Contrats, logique et validations
scripts/               Développement, tests et packaging
tests/                 Tests unitaires
e2e/                   Scénarios desktop Playwright
assets/                Identité visuelle et licences tierces
docs/                  Documentation technique et sécurité
.github/workflows/      Vérifications et compilation Windows
```

## Documentation

- [Installation et compilation](docs/INSTALLATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Comprendre les mesures matérielles](docs/HARDWARE.md)
- [Validation et tests](docs/VALIDATION.md)
- [Sécurité et confidentialité](docs/SECURITE_DONNEES.md)
- [Construction et distribution](docs/DEPLOIEMENT.md)
- [Contribuer au projet](docs/COMMENT_CONTRIBUER.md)
- [Compétences et parcours informatique](docs/COMPETENCES_ET_PARCOURS.md)

## Objectifs d'amélioration

- Tester l'application sur plusieurs PC Windows et sur des configurations mono/multi-GPU.
- Valider les informations d'écrans, les périphériques radio et les cas où les batteries ne sont pas détectables.
- Finaliser les contrôles qualité des installateurs, les signatures et la distribution.
- Améliorer l'accessibilité et la robustesse des vues à différentes résolutions et échelles Windows.

Ces éléments sont des **objectifs**, pas des fonctionnalités présentées comme déjà vérifiées.

## À propos

Orbit 2.0 est un projet personnel de développement logiciel visant à réunir **interface utilisateur, architecture desktop, programmation système et sécurité des données** dans une seule application.

Développé par [carlxwj](https://github.com/carlxwj).

**Licence :** code source actuellement `UNLICENSED` — tous droits réservés. La publication sur GitHub n'autorise pas automatiquement la redistribution ou la réutilisation du code. Voir également [mentions des composants tiers](THIRD_PARTY_NOTICES.md).
