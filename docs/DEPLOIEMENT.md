# Construire, distribuer et valider Orbit

## Pipeline local Windows

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run native
npm run test:native
npm run build
npm run test:desktop
npm run dist
```

Les scripts `scripts/build-native.ps1` et `scripts/build.mjs` compilent les couches natives et web. `electron-builder.yml` définit les artefacts d'installation NSIS et portable, dont les fichiers se trouvent dans `release/` **après compilation**.

## Contrôles avant distribution

- Installer depuis une session utilisateur Windows standard, puis désinstaller proprement.
- Confirmer l'absence de demande d'élévation injustifiée et tester la signature Authenticode si une signature est fournie.
- Vérifier les fonctionnalités lorsque les capteurs GPU ou les batteries ne sont **pas** exposés.
- Vérifier les cas multi-GPU, plusieurs écrans, VPN, réseau déconnecté, PC en veille et redémarrage.
- Auditer les autorisations du runtime Electron et l'exposition d'API preload.
- Exécuter le contrôle des secrets et vérifier qu'aucun nom de machine ou diagnostic personnel n'est embarqué.
- Documenter précisément les tests réels effectués (modèle de Windows, version, résultats), sans publier de détails uniques de l'ordinateur.

## GitHub Releases

Le **code source** versionné doit rester distinct des **installateurs distribués**. Les Releases peuvent contenir des exécutables construits depuis un état de source daté après validation sur Windows ; ne pas les stocker dans l'historique Git. Vérifier les licences des composants, la provenance des builds et les mises à jour de sécurité.
