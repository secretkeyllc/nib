import type { ChangelogEntry } from "./changelog.js";

export const frEntries: ChangelogEntry[] = [

  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "Le lien de jumelage est désormais stable par machine : scannez une fois, et le téléphone continue de fonctionner après arrêt, redémarrage ou relance de l'app.",
      "Une action de rotation génère un nouveau lien en cas de fuite et invalide tous les QR précédemment scannés.",
      "Le menu du compte abrite aussi le jumelage : un appui déploie le code QR sur place.",
      "Les jumelages peuvent démarrer automatiquement avec l'app, pour connecter le téléphone à tout moment.",
      "La mascotte de l'espace de travail adopte le nouveau visuel 16:9 dans les deux thèmes, et chaque message d'accueil à vide ouvre sur la signature : « I am Nib, … ».",
    ],
  },


  {
    version: "0.22.10",
    date: "2026-10-31",
    highlights: [
      "Contrôlez ce bureau depuis un téléphone ou n'importe quel navigateur : Paramètres → À propos lance un jumelage que seul votre propre compte peut ouvrir.",
      "La vue web reflète la liste des sessions et la transcription en direct, envoie des messages et répond aux cartes d'approbation.",
      "Le jumelage ne vit que pendant son exécution : le lien change à chaque démarrage et expire à l'arrêt.",
      "Le menu du compte abrite aussi le jumelage : un appui déploie le code QR sur place.",
    ],
  },


  {
    version: "0.22.9",
    date: "2026-10-30",
    highlights: [
      "Les hôtes distants s'installent à nouveau sur les machines dont ~/.nib a les permissions 0755 habituelles.",
      "Chaque fenêtre de quota indique désormais son échéance de réinitialisation, dans la pastille de crédits et la console.",
      "La pastille de version affiche la version installée et non celle en attente.",
      "Réglages -> À propos affiche la marque au-dessus du nom.",
    ],
  },
  {
    version: "0.22.8",
    date: "2026-10-30",
    highlights: [
      "Le sidecar Windows on Arm n'a plus besoin du Visual C++ Redistributable.",
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
];
