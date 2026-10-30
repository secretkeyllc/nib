import type { ChangelogEntry } from "./changelog.js";

export const frEntries: ChangelogEntry[] = [

  {
    version: "0.22.6",
    date: "2026-10-30",
    highlights: [
      "Le build macOS est maintenant réellement signé ad-hoc, donc Apple Silicon l'ouvre.",
    ],
  },
  {
    version: "0.22.5",
    date: "2026-10-30",
    highlights: [
      "Le téléchargement macOS est désormais un vrai build : signé ad-hoc, Apple Silicon le lance après une autorisation unique dans Réglages Système.",
    ],
  },
  {
    version: "0.22.4",
    date: "2026-10-30",
    highlights: [
      "Les builds macOS sortent en bêta : signés ad-hoc, le premier lancement demande donc une autorisation unique dans Réglages Système.",
      "L'installateur Windows on Arm ne perd plus silencieusement Nib.exe et refuse de s'installer sur un PC x64.",
    ],
  },
  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "Le service local démarre à nouveau sous Windows on Arm : le runtime est désormais lié statiquement.",
      "L'installation de la version Arm sur un PC x64 s'arrête maintenant avec un message clair.",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "L'installateur Windows on Arm extrait de nouveau Nib.exe et toutes les DLL.",
      "L'installateur Arm s'arrête avec un message sur un PC x64 au lieu d'installer un dossier vide.",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "Les hôtes distants se mettent à niveau sur place : une reconnexion ramène l'hôte à cette version sans le recréer.",
      "La pastille de crédits conserve le dernier solde connu quand le plan de contrôle est injoignable.",
      "« Changer d'offre » dans le menu du compte ouvre désormais la page de facturation de la console.",
    ],
  },
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
