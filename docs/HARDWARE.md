# Fournisseurs matériels et limites

| Domaine | Implémentation réelle | Limites honnêtes |
| --- | --- | --- |
| CPU | Temps CPU Node/Windows, topologie Win32, modèle du registre/WMI, compteur PDH de fréquence | Fréquence de base non certifiée ; maximum WMI distinct du boost constructeur ; caches si WMI accessible |
| GPU | Capacité et identité DXGI ; NVML NVIDIA en lecture seule ; compteurs PDH par LUID pour moteurs et mémoire dédiée/partagée | Fan/power/clocks selon NVML ; AMD/Intel restent sur PDH pour charge/mémoire ; pas d’usage d’AdapterRAM |
| RAM | Win32_PhysicalMemory ; repli GetSystemFirmwareTable/SMBIOS type 17 | MT/s distingués de MHz ; aucun timing CAS inventé ; capacité inconnue conservée absente |
| Carte mère/BIOS | WMI, repli registre matériel ; UEFI GetFirmwareType ; Secure Boot registre ; TPM WMI | Chipset et TPM parfois inaccessibles. Les numéros de série ne sont pas collectés |
| Capteurs | Températures GPU NVML, capteurs Temperature/Fan de LibreHardwareMonitor si son espace WMI existe déjà | Aucun téléchargement de DLL, service, pilote, élévation ou contournement ; nom CPU Package/Tctl reconnu seulement s’il existe |
| Disques | MSFT_PhysicalDisk/MSFT_Disk/MSFT_Partition ; repli IOCTL_STORAGE_QUERY_PROPERTY, géométrie et extents ; volumes DriveInfo | Santé prédite du pilote distincte d’une analyse SMART ; températures SMART/NVMe détaillées non implémentées |
| Écrans | QueryDisplayConfig et fréquence rationnelle vSync active, EnumDisplaySettings, DisplayConfig advanced color, EDID valide | Pas de type OLED/IPS supposé ; le mode préféré EDID n’est pas forcément le mode maximal constructeur |
| Périphériques | SetupAPI, ContainerId, VID/PID, instance et parent ; produit/fabricant descripteur HID | Un dongle n’atteste pas que la souris est réveillée ; USB n’atteste pas une liaison filaire |
| Batterie | Propriété standard Windows puis HID Battery Strength 0x06/0x20, uniquement si déclaré 0–100 | Pas de commande constructeur non documentée ; aucun pourcentage pour une valeur manquante |
| Réseau | .NET NetworkInterface/IPv4Statistics et horodatages réels ; WLAN API ; profils RAS/WMI | SSID parfois restreint par Windows ; bande non exposée ; les VPN tiers ne sont pas tous des profils RAS |
| Bluetooth | Adaptateurs et périphériques PnP | L’état de radio reste indisponible si non exposé ; aucune confusion avec la présence de l’adaptateur |
| Audio | Core Audio COM, sortie multimédia par défaut, volume/muet et énumération réelle des sorties | Changement de sortie proposé dans Windows ; pas d’API privée PolicyConfig |
| Profil | GetUserNameEx et cache AccountPicture du SID courant ; avatar local Orbit | Cache photo parfois inaccessible ; le type Microsoft/local reste inconnu s’il n’est pas déterminable ; pas d’OAuth distant implémenté |

## Votre clavier et votre souris

Les essais ont rencontré les identifiants USB `3554:F507` et `258A:0150`. Les noms publiés étaient respectivement **Pulsar Mouse IR update** et **Gaming KB / SINOWEALTH**. Ces descriptions et ces identifiants ne suffisent pas à certifier une variante commerciale **X2H Mini** ou **KEYZ ELITE 300**. Ils ne sont pas codés en dur comme une identification certaine.

Les interfaces appartenant au même conteneur sont regroupées. Le nom issu du descripteur produit est favorisé par rapport à « Périphérique USB composite ». Un appareil composite exposant souris et clavier pour ses macros est classé d’après son produit déclaré quand cela est possible ; à défaut il reste personnalisable.

Le centre de téléchargement officiel Pulsar indique **Pulsar Fusion Wireless Mice Software** pour le X2H Mini classique. Les variantes CrazyLight disposent d’un logiciel différent. Les pages officielles consultées ne fournissent pas de contrat public de lecture de batterie que cette version pourrait appeler en sécurité. Le manuel G-Lab confirme la connectivité triple mode du KEYZ ELITE 300, sans fournir de contrat public de lecture HID de batterie.

En conséquence, Orbit lit les informations standard accessibles, affiche « Batterie non communiquée » et permet une personnalisation manuelle explicitement distincte des mesures. Aucune lecture de mémoire, de fichiers privés de logiciel fabricant ou écriture expérimentale n’a été effectuée.

Références : [Téléchargements Pulsar](https://www.pulsar.gg/pages/download), [KEYZ ELITE 300 WG](https://www.the-g-lab.tech/produit/keyz-elite-300-wg/), [manuel officiel KEYZ ELITE 300](https://www.the-g-lab.tech/wp-content/uploads/2025/11/Notice-KEYZ-ELITE-300-WG-basse-def.pdf).

## Sources techniques

- [Sécurité et sandbox Electron](https://www.electronjs.org/docs/latest/tutorial/sandbox).
- [Versions stables Electron](https://releases.electronjs.org/) : Electron 45.1.0 retenu pour ce projet au 30 octobre 2026.
- [QueryDisplayConfig Microsoft](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-querydisplayconfig).
- [GetSystemFirmwareTable Microsoft](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-getsystemfirmwaretable).
- [HidP_GetUsageValue Microsoft](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/hidpi/nf-hidpi-hidp_getusagevalue).
- [HID API Microsoft](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/hid-api).
- [NVML NVIDIA](https://docs.nvidia.com/deploy/nvml-api/nvml-api-reference.html).
- [URI des paramètres Windows](https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings) : sur Windows 11, le raccourci avancé peut ouvrir la page Affichage ; HDR utilise ce même point d’entrée fiable.
- [Démarrage Windows Electron](https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows).

Les scénarios simulés de tests sont isolés des collecteurs réels et ne sont jamais injectés dans l’interface de production.
