# Ressources tierces

Orbit utilise React et React DOM (MIT), Lucide (ISC), Electron (MIT et notices Chromium) et les API de Windows. Vite, esbuild, TypeScript, ESLint, Playwright et electron-builder sont des outils de développement et de build.

Les licences des paquets restent disponibles dans leurs distributions npm ; les notices Electron/Chromium accompagnent la distribution du runtime générée par electron-builder. Pour une distribution publique, vérifier les notices incluses dans le build final et conserver les attributions requises.

NVML n’est pas redistribué : la bibliothèque du pilote NVIDIA déjà installé est chargée localement. LibreHardwareMonitor n’est pas redistribué ni installé : son espace WMI est uniquement consulté s’il existe déjà.

La typographie s’appuie sur les polices système Windows. Aucune police Apple n’est distribuée. L’icône PNG/ICO Orbit est générée par `scripts/icons.ps1`.
