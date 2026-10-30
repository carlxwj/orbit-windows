# Rapport de validation — 30 octobre 2026

## Réalisé

| Vérification | Résultat |
| --- | --- |
| Audit des 12 fichiers de l’archive et comparaison au dossier | Identiques ; originaux conservés |
| `npm run native` | Réussi : C# compilé en x64, icône PNG et ICO multi-résolution générées |
| `npm test` | **22 tests réussis, 0 échec** |
| Syntaxe des fichiers `.ts` par le parseur intégré Node | 20 fichiers acceptés ; ne remplace pas `tsc` et n’inclut pas les `.tsx` |
| `npm run test:native` | Protocole, mesures et inventaire partiel réels validés |
| `npm run benchmark:native` | Test court du collecteur seul après chauffe, intervalle 1 seconde |

Les essais natifs ont réellement lu :

- 8 cœurs physiques via la topologie Win32 et le modèle CPU via les sources Windows disponibles.
- Une **NVIDIA GeForce RTX 5060** via DXGI/NVML.
- Deux barrettes **DDR4 de 16 Go**, configurées à **3 200 MT/s**, via SMBIOS.
- Deux volumes et deux disques physiques via les API de stockage, malgré les refus WMI.
- Un écran actif à **239,765 Hz** lors des premiers essais, puis **241 Hz** lors du dernier, sans remplacement par une valeur commerciale.
- Les interfaces réseau actives et leurs compteurs.
- Le volume réel et six sorties audio, **sans modification du volume pendant ces essais**.
- L’inventaire PnP/HID et son regroupement par conteneur. Le nombre d’interfaces varie lorsque Windows énumère des périphériques.

La photo de compte n’était pas accessible ; elle n’est pas déclarée testée avec succès. Les tests ne certifient pas les noms commerciaux exacts des périphériques, ni leurs batteries propriétaires.

## Tests unitaires

Calcul CPU différentiel ; zéro réel et donnée absente ; remise à zéro/changement d’interface réseau ; regroupement HID par conteneur ; appareils distincts de même nom ; récepteur sans batterie ; Bluetooth ; validations des préférences et de l’audio ; économie et suspension ; recherche ; expiration et pause du minuteur ; persistance atomique ; journal expurgé ; défaut du collecteur ; continuité CPU/RAM ; VRAM moderne sans AdapterRAM ; RAM et SMBIOS ; multi-GPU avec correspondance ambiguë refusée ; fréquence d’écran fractionnaire ; associations disque/volume ; origine IPC ; traversées de chemins et extensions interdites.

Les cas multi-GPU, multi-écran et batteries connues sont des **fixtures unitaires**, pas une validation physique de ces matériels. Aucune fixture n’alimente l’interface de production.

## Consommation mesurée

Test court après chauffe : environ 8,1 secondes, 8 mesures, environ **0,77 % d’un cœur CPU** pour le collecteur et **67 Mio de working set**. Ce n’est ni une moyenne longue durée, ni le coût complet d’Electron/React. À 3 secondes et en économie arrière-plan, la cadence diminue ; aucun chiffre non mesuré n’est promis pour l’application complète.

## Bloqué par l’environnement

`npm install` échoue avec **EACCES** lors des requêtes vers `registry.npmjs.org`. Les dépendances ne sont pas installées.

| Commande | Résultat réel |
| --- | --- |
| `npm run typecheck` | Impossible : `tsc` absent |
| `npm run lint` | Impossible : `eslint` absent |
| `npm run dist` | Le collecteur natif compile, puis le build JS échoue : `esbuild` absent |
| `npm run test:desktop` | Non exécuté : Electron et Playwright absents |
| Installation/désinstallation | Non exécutées ; aucun installateur généré |

Les composants React, le preload et le packaging sont **implémentés mais non validés par compilation/exécution** ici. Aucune capture visuelle du nouveau renderer n’est présentée comme une vérification réussie.

## Matrice desktop préparée, à exécuter

Les scénarios Playwright/Electron couvrent la navigation des dix entrées latérales, le profil, Ctrl+K, les thèmes, les dimensions 900×620 / 1280×720 / 1920×1080 / 2560×1440 et les échelles 100/125/150 %, l’absence de débordement, le minuteur, l’audio et l’avatar. Ils écrivent leurs captures dans `test-results/`. Ils utilisent un dossier de préférences temporaire distinct et ne modifient pas le volume Windows.

Restent à confirmer physiquement : écran secondaire et hot-plug, entrée/sortie de veille, vrais périphériques Bluetooth avec batterie standard, capteurs absents et présents, contrôle réel du volume, notifications, lancement Windows, fonctionnement en arrière-plan, fermeture/réouverture et tests de la version installée indépendante du dossier source.

Le package n’est pas signé. La validation de signature, SmartScreen et la conformité des notices finales sont des étapes distinctes d’une compilation réussie.
