# Architecture Orbit 2.0

```text
React (sandbox, aucune API Node)
  ↓ fonctions explicites de window.orbit
Preload contextBridge (typé, IPC non exposé)
  ↓ canaux orbit:* validés
Processus principal Electron
  ├─ fenêtre, Mica, tray, lancement Windows, fichiers de préférences
  ├─ FocusTimer : échéance, une seule alarme de fin
  └─ Monitor
      ├─ Node os : CPU différentiel et RAM utilisable
      └─ NativeBridge → stdin/stdout JSON → OrbitBridge.exe
          ├─ Core Audio COM
          ├─ DXGI, NVML et PDH
          ├─ SMBIOS, topologie CPU et registre Windows public
          ├─ SetupAPI et descripteurs HID
          ├─ QueryDisplayConfig, EnumDisplaySettings et EDID
          ├─ volumes .NET et IOCTL de stockage en lecture seule
          └─ WMI/CIM, WLAN, RAS, capteurs déjà exposés
```

## Interface et mémoire

- Pages React chargées à la demande ; aucune bibliothèque de graphiques lourde.
- Courbes SVG bornées à 180 points. Les données nulles créent des ruptures ; elles ne sont pas interpolées.
- États système, préférences, inventaire, minuteur et historique dans des stores distincts.
- Le shell ne s’abonne pas aux mesures rapides. Le pied de fenêtre et les pages concernées le font.
- Pas de police distante, de télémétrie, de publicité ou de compte Orbit.
- React et Lucide sont des dépendances de compilation : le code renderer est bundlé ; les sources de ces paquets ne sont pas ajoutées comme dépendances Node du produit.

## Cadences

| Données | Cadence |
| --- | --- |
| CPU, RAM, GPU, compteurs disque, réseau, audio | 1/3/5/10 secondes, configurable ; 3 secondes par défaut |
| Fenêtre masquée ou réduite, économie activée | Une mesure par minute |
| Inventaire statique | Au lancement, après notification de matériel et toutes les 5 minutes en premier plan |
| Capteurs LibreHardwareMonitor déjà exposés | Au plus toutes les 30 secondes, en tâche séparée |
| Veille Windows | Collecte suspendue ; compteurs différentiels réinitialisés au réveil |
| Historique optionnel | Dernière heure, au plus 1 200 mesures ; écriture au plus une fois par minute |
| Minuteur | Une échéance et un timeout de fin dans Electron ; compteur d’affichage seulement sur la page visible |

Les mesures rapides et l’inventaire possèdent chacun un verrou empêchant leur chevauchement avec eux-mêmes. Les opérations natives ont un délai maximum et un nombre de requêtes en attente limité. Un dépassement termine le processus natif pour éviter l’accumulation de tâches abandonnées. Une collecte échouée n’est pas relancée en boucle à chaque échantillon.

Lors d’un lancement masqué avec Windows, l’inventaire matériel détaillé est différé jusqu’à la première ouverture. Le démarrage ne lance pas une analyse WMI complète dans le seul but de garder une icône dans la zone de notification.

## Sécurité

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`. Le renderer est chargé depuis `orbit://app/`, sans serveur HTTP, même en développement. Toute connexion HTTP/HTTPS/WebSocket du renderer est refusée. Pas de navigation distante, de nouvelles fenêtres ou de webviews. CSP locale.

Chaque appel IPC vérifie la WebContents propriétaire, la frame principale et l’URL locale. Les préférences, valeurs audio, commandes de fenêtre, actions du minuteur et cibles système sont validées. Les réglages Windows sont une liste fermée. Un lecteur ne peut être ouvert que s’il figure dans l’inventaire et correspond à une lettre locale.

Les images sont choisies par un dialogue natif, limitées à 10 Mo puis converties en PNG. Les images de compte Windows proviennent uniquement du cache local du SID de l’utilisateur actif. Aucun mot de passe ou jeton Microsoft n’est collecté.

Le programme natif ne reçoit aucune commande de shell. Les appels PowerShell restants concernent les outils de compilation et d’archivage. Les lectures HID se limitent aux descripteurs et à un rapport standard Battery Strength déclaré par le périphérique : aucun identifiant propriétaire, aucun rapport de sortie ni écriture de firmware.

NVML est chargé uniquement depuis System32 ou le répertoire NVIDIA NVSMI officiel, avec recherche des dépendances limitée. Aucun pilote ou module constructeur n’est redistribué ou installé.

Le journal `diagnostics.log` est local et borné à environ 256 Ko. Il enregistre uniquement des codes de fournisseur et des états, sans noms, messages, adresses, SID ou identifiants matériels. Les préférences sont écrites de manière atomique et sérialisée.

## Ressources packagées

Le JavaScript est dans `app.asar`. `OrbitBridge.exe` et les icônes sont dans `resources/native/` et `resources/assets/` grâce à `extraResources`. Aucun script ne dépend du chemin du projet source.
