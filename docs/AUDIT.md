# Audit Orbit 1.0 → 2.0

Archive examinée : `Dashboard-Windows.zip`, 12 fichiers. Comparaison intégrale de chaque entrée texte avec le dossier de travail : identique. La copie originale reste disponible dans `legacy/Orbit-1.0-original.zip`. Les anciens fichiers dépliés sont également conservés dans `legacy/v1/`, sans faire partie du logiciel distribué.

| Fichier original | Fonction | Décision 2.0 |
| --- | --- | --- |
| `package.json` | Node seul, aucun bundler ni packaging | Electron, React, TypeScript, Vite, esbuild, electron-builder |
| `server.mjs` | HTTP local, CPU/RAM Node, actions protégées par origine et jeton | Suppression du serveur actif ; IPC explicite, origine et fenêtre vérifiées |
| `public/index.html` | Structure monolithique, quelques pages | Composants React et 11 pages chargées à la demande |
| `public/app.js` | Rendu, recherche, graphiques, état, préférences et minuteur réunis | Stores séparés, recherche typée, graphiques réutilisables, minuteur dans le processus principal |
| `public/styles.css` | Dashboard web vert sauge | Thèmes perle/graphite, bleu/lavande, matière Mica et verre limité |
| `public/icon.svg` | Première identité verte | Icône Orbit originale, PNG et ICO multi-résolution |
| `scripts/snapshot.ps1` | PnP/CIM, netsh, disques et batterie | Collecteur .NET : SetupAPI, HID, DXGI, SMBIOS, Win32, WLAN, RAS, IOCTL et WMI |
| `scripts/audio.ps1` | Core Audio, lancement et compilation PowerShell par appel | Portage du même contrat Core Audio dans un exécutable persistant ; lecture, volume et muet conservés |
| `test/server.test.mjs` | CPU différentiel et sécurité HTTP | Tests de calcul conservés conceptuellement, protections HTTP remplacées par tests IPC/protocole |
| `Demarrer.cmd` | Console et ouverture du navigateur | Archivé ; démarrage normal prévu par l’installateur et Electron |
| `README.md` | Guide de la version navigateur | Réécrit avec les limites et les résultats réels |
| `.gitignore` | Exclusions minimales | Exclusion des builds, dépendances, caches et captures de tests |

## Faiblesses corrigées

- Pas d’intégration bureau, d’installateur ou de zone de notification.
- PowerShell et compilation C# relancés pour l’audio, même sans interaction.
- Déduplication des périphériques par nom, qui fusionnait parfois des appareils distincts.
- CPU calculé au moment d’une requête HTTP : plusieurs clients pouvaient influencer l’intervalle de mesure.
- UI et historique reconstruits depuis un fichier unique.
- Informations matérielles limitées à quelques classes Windows et aux accès du processus PowerShell.
- Minuteur lié à la page navigateur ; pas de notification native ni de continuité en arrière-plan.

La migration ne conserve aucun serveur HTTP actif, aucun secret de session HTTP et aucun lanceur de navigateur.
