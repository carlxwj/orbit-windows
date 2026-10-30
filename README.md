# Orbit 2.0 — application Windows d'observation du PC

**Electron · React · TypeScript · Vite · .NET / C# · Windows 11 · application locale**

> **English:** Orbit is a desktop system-monitoring app for Windows. It exposes hardware, device, display and performance information through an Electron UI and a local native C# bridge. It is not a browser-only HTML dashboard.

## Objectif

Proposer une application de bureau native dans son usage, au design épuré, pour comprendre son propre PC : processeur, carte graphique, mémoire, écrans, périphériques, réseau, disques, batterie lorsqu'elle est exposée par Windows et outils de concentration. **Le fait qu'un périphérique utilise un dongle USB/2,4 GHz ne garantit pas que Windows connaisse sa batterie.** Une valeur inconnue reste affichée comme telle, sans fabrication de pourcentage.

## Fonctionnalités visibles dans les sources

- Tableau de bord matériel : CPU, GPU, RAM, carte mère, BIOS, mesures et graphiques.
- Moniteurs : résolution, fréquence, écran, HDR et autres informations selon disponibilité Windows.
- Stockage : disques physiques, volumes, capacité et données de santé exposées.
- Périphériques : HID, USB, Bluetooth, identifiants et autonomie *lorsqu'elle est disponible*.
- Réseau et audio : informations et fonctions disponibles depuis Windows.
- Profil local Windows : nom et image si accessible ; avatar personnalisé en option.
- Concentration, thèmes, préférences, raccourcis et recherche de fonctionnalités.
- Traitement principalement **local**, sans API web de synchronisation des mesures dans la version fournie.

## Architecture source

```text
src/                 Interface React + TSX, pages et composants
electron/main/       Processus Electron, IPC et contrôles d'accès
electron/preload/    Passerelle contrôlée exposée à l'UI
shared/              Contrats et validations partagées
system/              Collecte Windows, bridge et code C# natif
scripts/             Développement, build Windows, packaging et tests
assets/              Icônes et mentions tierces
 docs/                Architecture, matériel, sécurité, installation, validation
 tests/               Tests de logique/sécurité Node
 e2e/                 Scénario de test Electron/Playwright
 .github/workflows/   Construction Windows prévue par le projet
```

## Installer et tester sur Windows

**Prérequis :** Windows 11 x64, Node.js **22.18+**, npm, PowerShell, outillage système décrit dans [Installation](docs/INSTALLATION.md). Un build natif .NET sous Windows est nécessaire pour créer le collecteur `OrbitBridge.exe` ; il n'est pas versionné.

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run native
npm run test:native
npm run build
npm run dist
```

La sortie `release/` contient les artefacts Windows après compilation, mais **n'est pas conservée dans GitHub**. Cette archive inclut le `package-lock.json` permettant une installation reproductible via `npm ci`.

## Tests exécutés

- **22 tests unitaires réussis / 22** sur le projet nettoyé, le 30/10/2026 (Node.js).
- **TypeScript et ESLint** : contrôles validés en utilisant temporairement les dépendances originales, puis en les retirant.
- **Non vérifiés sur Windows dans ce passage** : compilation du bridge C#, lancement réel Electron, compatibilité GPU, intégration du profil Microsoft, capteurs matériels, installation et signature des exécutables.
- Les tests de sécurité inspectent certaines protections IPC, du protocole et de l'accès aux chemins ; ils ne sont pas une garantie absolue de sûreté.

## Documentation

- [Architecture et composants](docs/ARCHITECTURE.md)
- [Prérequis et build Windows](docs/INSTALLATION.md)
- [Informations matérielles / limites](docs/HARDWARE.md)
- [Données personnelles et sécurité](docs/SECURITE_DONNEES.md)
- [Validation et tests](docs/VALIDATION.md)
- [Workflow de livraison](docs/DEPLOIEMENT.md)
- [Compétences pour l'université](docs/COMPETENCES_ET_PARCOURS.md)
- [Signalements](SECURITY.md)

## Vie privée et licence

Orbit traite des informations susceptibles d'identifier une machine (nom du PC, identifiants matériels, réseaux, utilisateur Windows). Ne jamais partager de diagnostics bruts ou de logs non expurgés. Ce dépôt ne contient aucun installateur ni binaire natif. Le paquet déclare `UNLICENSED` ; tous droits réservés tant qu'une licence adaptée n'est pas décidée. Respecter les licences des composants tiers (voir `THIRD_PARTY_NOTICES.md`).
