# Installation et compilation Windows

## État de livraison

**L’installateur et l’exécutable graphique ne sont pas fournis dans cette livraison**, car l’installation npm est bloquée dans l’environnement de travail. Le collecteur `build/native/OrbitBridge.exe` est compilé, mais n’a pas d’interface utilisateur et n’est pas l’application Orbit.

## Construire sur un poste Windows x64 avec accès réseau

1. Extraire `Orbit-2.0-sources.zip` dans un dossier utilisateur.
2. Installer Node.js 24 depuis son site officiel, si nécessaire. Le .NET Framework Windows 4.x fournit le compilateur C# utilisé par le projet.
3. Ouvrir un terminal dans le dossier extrait et exécuter :

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:native
npm run test:desktop
npm run dist
```

La première installation génère le lockfile réel. Ne pas utiliser `npm ci` avant de disposer de ce lockfile. Le premier packaging télécharge le runtime Electron et les outils NSIS officiels utilisés par electron-builder.

Le workflow `.github/workflows/windows.yml` prépare également un build Windows déclenchable dans un dépôt GitHub. Aucun dépôt n’a été créé ou envoyé et aucun workflow distant n’a été lancé pendant cette réalisation.

## Installer un build réussi

Ouvrir `release/Orbit-2.0.0-Installation.exe`. L’installation est prévue **par utilisateur**, sans élévation, avec un raccourci **Orbit** dans le menu Démarrer et une désinstallation standard Windows. Aucun lancement automatique avec Windows n’est activé par l’installateur.

Le programme doit être démarré depuis son raccourci ou `Orbit.exe` installé. Il possède sa propre fenêtre, ses commandes de fenêtre et son icône de notification. L’utilisateur final n’a pas besoin de Node.js et ne doit pas garder de terminal ouvert.

Le build n’est pas signé dans ce projet. SmartScreen peut donc afficher un avertissement de réputation. Il n’est pas présenté comme un logiciel signé ; ne pas désactiver les protections Windows pour installer ce projet.

## Version portable

`Orbit-2.0.0-Portable.exe` est la cible portable configurée. Elle n’utilise pas Node.js externe et ne nécessite pas un terminal. Les préférences restent dans le dossier utilisateur Electron, pas nécessairement à côté de l’exécutable portable. L’option de lancement avec Windows est réservée à la version installée.

## Vérifications indispensables avant diffusion

- Installer depuis le `.exe`, puis déplacer le dossier source afin de vérifier son indépendance.
- Démarrer depuis le menu Démarrer ; confirmer absence de terminal et de navigateur.
- Vérifier `resources/native/OrbitBridge.exe` et les icônes packagées.
- Lire CPU/GPU/RAM, volumes, périphériques et écrans dans l’application installée.
- Modifier le volume et vérifier depuis Windows, puis vérifier la synchronisation en sens inverse.
- Vérifier les images de compte accessibles et le choix/suppression d’un avatar Orbit.
- Activer puis désactiver le démarrage Windows ; vérifier également dans les Applications de démarrage de Windows.
- Tester le lancement `--startup`, le démarrage réduit et le comportement de fermeture choisi.
- Fermer, réouvrir, déplacer sur un écran d’un autre DPI, changer de thème et vérifier la persistance.
- Désinstaller normalement et confirmer que les préférences sont conservées, sauf remise à zéro volontaire.

Ces étapes ne sont pas déclarées validées ici : aucun installateur n’a pu être généré dans l’environnement restreint.
