# Présenter Orbit 2.0 dans une candidature universitaire

## Ce que le projet peut démontrer

- **Architecture logicielle** : séparation du renderer React, du processus principal Electron, du preload et du bridge natif.
- **Systèmes** : récupération d'informations CPU/GPU/disques/moniteurs via les API Windows.
- **Programmation** : TypeScript et C#, contrats de données, gestion d'erreurs et valeurs absentes.
- **Sécurité** : filtrage des appels IPC, isolation des privilèges, limitation des surfaces d'accès.
- **Méthode** : tests unitaires, e2e, documentation, intégration continue et packaging.

## Démonstrations pertinentes

1. Schéma IPC : ce que l'interface peut demander au système et pourquoi.
2. Exemple de périphérique avec une batterie réellement accessible, opposé à un périphérique où Windows ne renvoie aucune donnée de charge.
3. Mesure de performance d'un collecteur, traitement d'une erreur de capteur et impact sur l'interface.

## Formulation prudente

> « J'ai travaillé sur une application de bureau de suivi matériel Windows en utilisant Electron, TypeScript et un composant natif C#. Ce projet m'a amené à structurer les échanges entre l'interface et le système, à gérer l'absence de données matérielles et à m'intéresser à la sécurité des interfaces IPC. »

Préciser les parties que l'on comprend, les limites de validation et l'assistance de développement utilisée. Un dépôt ne démontre pas à lui seul la maîtrise personnelle de toutes ses lignes de code.
