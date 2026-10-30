import type { Page } from '../../shared/contracts.ts';
export const fr={
 brand:'Orbit',subtitle:'Votre ordinateur, en toute clarté.',
 pages:{overview:'Accueil',performance:'Performances',hardware:'Matériel',devices:'Périphériques',displays:'Écrans',storage:'Stockage',network:'Réseau',audio:'Audio',account:'Mon compte',focus:'Concentration',settings:'Paramètres'} satisfies Record<Page,string>,
 descriptions:{overview:'L’essentiel de votre PC, au même endroit.',performance:'Des mesures réelles. Une vue plus claire.',hardware:'Les détails qui composent votre ordinateur.',devices:'Vos appareils, leurs connexions et leurs batteries.',displays:'Votre espace de travail, écran par écran.',storage:'Une place pour chaque chose.',network:'Vos connexions et votre activité réseau.',audio:'Le bon volume, au bon endroit.',account:'Votre profil, simplement.',focus:'Un moment pour l’essentiel.',settings:'Un espace qui vous ressemble.'} satisfies Record<Page,string>,
 states:{available:'Disponible',unsupported:'Non disponible',permission_required:'Accès refusé par Windows',temporarily_unavailable:'Temporairement indisponible',error:'Erreur de lecture'},
 category:{keyboard:'Clavier',mouse:'Souris',headset:'Casque',controller:'Manette',audio:'Audio',receiver:'Récepteur',other:'Autre appareil'},
 connection:{usb:'USB',bluetooth:'Bluetooth',wireless_2_4g:'Récepteur USB 2,4 GHz',wireless_receiver:'Récepteur sans fil',unknown:'Connexion non déterminée'},
 presence:{connected:'Présent dans Windows',receiver_present:'Récepteur présent',disconnected:'Déconnecté'},
 unavailable:'Non disponible',loading:'Lecture de votre ordinateur…',local:'Tout reste sur ce PC',
 search:'Rechercher dans Orbit',refresh:'Actualiser l’inventaire',windows:'Ouvrir les paramètres Windows',
 batteryUnknown:'Batterie non communiquée',batteryHelp:'Windows ou le protocole de ce périphérique ne fournit pas son niveau de batterie à Orbit. Une absence de mesure ne signifie pas une batterie vide.',
 hardwareHelp:'Certaines informations nécessitent un pilote ou un fournisseur de capteurs compatible. Orbit n’installe aucun pilote et ne demande pas les droits administrateur.',
 privacy:'Orbit ne collecte aucune télémétrie et ne communique avec aucun serveur. Le matériel, les images et les préférences restent sur votre ordinateur.',
 frequencyHelp:'Les vitesses DDR exposées par SMBIOS sont affichées en MT/s (transferts par seconde), pas comme une fréquence d’horloge en MHz. Aucun timing CAS n’est estimé.',
 radioHelp:'La présence d’un adaptateur ne confirme pas que sa radio est activée. Les raccourcis ouvrent les paramètres Windows, sans changer silencieusement une connexion.',
 profileHelp:'Orbit lit uniquement la photo locale du compte actif lorsqu’elle est accessible. Le type de compte Microsoft ne peut pas être déduit du seul nom Windows.',
 sensorHelp:'Températures et ventilateurs : NVML pour les GPU NVIDIA ; espace WMI LibreHardwareMonitor uniquement s’il existe déjà. Aucun pilote n’est installé par Orbit.',
 focusHelp:'Le minuteur continue quand Orbit est réduit et se recale après une veille. Les notifications et le mode Ne pas déranger de Windows ne sont pas modifiés.',
 displayHelp:'Fréquence active issue de QueryDisplayConfig, sans arrondi commercial. Les modes disponibles sont ceux d’EnumDisplaySettings. La technologie de dalle n’est jamais supposée.',
 appVersion:'Orbit 2.0',
};
export type Translations=typeof fr;
// Add another locale with this contract; system measurements never depend on translated labels.
