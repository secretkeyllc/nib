import type { ChangelogEntry } from "./changelog.js";

export const frEntries: ChangelogEntry[] = [
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "Après le changement de domaine, l'application se connecte à nib.am.",
      "Les annonces s'ouvrent sur place et perdent leur point de non-lu.",
      "Signaler un problème et Notes de version pointent vers le dépôt Nib.",
      "Après la connexion web, le navigateur peut vous ramener à l'application.",
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Première version publique de Nib : une installation, une connexion, tous les modèles.",
      "Connectez-vous avec un compte Nib ; la page d'approbation s'ouvre avec le code.",
      "Le compositeur affiche le forfait, les crédits restants et l'usage jour/semaine/mois.",
      "Les annonces de l'administration apparaissent au-dessus des résultats de tâches.",
      "Un installeur Windows x64 et des paquets Linux AppImage/deb sont publiés.",
    ],
  },
];
