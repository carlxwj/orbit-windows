# Sécurité et confidentialité — Orbit 2.0

## Données traitées

Les informations de diagnostic Windows peuvent inclure : nom d'utilisateur, nom d'ordinateur, UUID/marque/modèle du matériel, numéros de série, adresses IP/MAC locales, interfaces réseau, noms de périphériques et chemins. Ces données ne sont pas des secrets d'authentification, mais elles peuvent identifier une machine ou une personne.

## Principes attendus

1. **Traitement local par défaut** : aucune télémétrie réseau de diagnostics sans consentement explicite et description claire.
2. **Privilèges limités** : demander les autorisations Windows strictement nécessaires ; ne pas exiger une élévation administrateur pour consulter une simple température.
3. **IPC minimal** : préchargement et canal typé, origine/fenêtre validées, pas d'évaluation arbitraire de code depuis le renderer.
4. **Accès aux fichiers borné** : chemins sélectionnés et validés, pas d'exposition libre du disque ou de secrets du profil.
5. **Logs expurgés** : ne pas publier de rapports bruts avec identifiants matériels, SSID, noms ou chemins personnels.
6. **Aucune donnée inventée** : une batterie inconnue reste inconnue, notamment pour les périphériques radio dont le récepteur n'expose pas l'état de charge.
7. **Mises à jour et packaging** : audit des dépendances et vérification/signature des installateurs avant distribution.

## Ce que le code fait déjà et ce qu'il reste à confirmer

Les contrats et contrôles partagés vivent dans `shared/security.ts` et `shared/contracts.ts`. Les processus Electron sont dans `electron/main/` et `electron/preload/`. Des tests ciblent l'IPC et le protocole local. **Ces contrôles statiques et unitaires ne prouvent pas l'absence de vulnérabilité runtime.** Tester sur un Windows réel avec antivirus, permissions standards et périphériques variés.

## Ce qu'il ne faut pas versionner

`node_modules/`, binaires de sortie, installateurs, fichiers de profil, logs de diagnostic, exports système, clés de signature, certificats privés `.pfx/.p12` et captures avec adresses ou numéros de série. Les icônes et leurs licences tierces sont conservées.

## Incidents

Si un rapport a été publié par erreur, retirer la copie visible, traiter les historiques et révoquer les credentials réellement concernés. Une simple suppression dans le dernier commit ne suffit pas.
