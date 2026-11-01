import type { ChangelogEntry } from "./changelog.js";

export const frEntries: ChangelogEntry[] = [
{
    version: "0.22.20",
    date: "2026-11-01",
    highlights: [
      "La connexion à Nib charge désormais la liste complète des modèles de la passerelle du compte avec les limites de contexte et de sortie publiées.",
      "Se reconnecter conserve la sélection de modèles et les limites manuelles tout en actualisant les valeurs publiées.",
      "Se déconnecter puis se reconnecter restaure les métadonnées des modèles ; un échec de découverte ne bloque jamais une connexion valide.",
    ],
  },

{
    version: "0.22.19",
    date: "2026-11-01",
    highlights: [
      "Le clic sur la ligne du service Nib suit son état : déconnecté, un clic connecte ; connecté, il ouvre l'éditeur.",
      "Changer le format d'API sur la ligne Nib se sauvegarde désormais correctement — chaque sauvegarde ne remet plus Chat Completions.",
      "Le menu de modèles du composer montre exactement les modèles activés sur la ligne Nib, pas tout le catalogue du gateway.",
    ],
  },

{
    version: "0.22.18",
    date: "2026-11-01",
    highlights: [
      "Le service Nib devient une entrée de premier plan dans la liste des modèles : cliquez sur la ligne pour l'éditer, libellée « Compte Nib » avec le logo de l'app.",
      "La sélection de modèles sur la ligne Nib se sauvegarde correctement — la première ouverture après connexion sélectionne tout ce que le compte peut appeler.",
      "Les lignes Nib existantes migrent vers l'adresse api.nib.am au premier lancement après la mise à jour.",
    ],
  },

{
    version: "0.22.17",
    date: "2026-11-01",
    highlights: [
      "Le service Nib dans la liste des modèles est maintenant modifiable comme n'importe quel endpoint : format d'API, modèles et réglages par modèle.",
      "La clé avec laquelle le desktop se connecte s'appelle « Nib » dans la console et ne peut être renommée ni supprimée.",
      "Corrigé : le numéro de version signalé avait une version de retard ; le logo de démarrage lit « I am Nib ».",
    ],
  },

{
    version: "0.22.16",
    date: "2026-10-31",
    highlights: [
      "Une connexion expirée se lit désormais exactement comme une déconnexion : la clé Nib stockée est retirée, le sélecteur de modèles n'offre plus d'entrées mortes.",
      "L'entrée des réglages de contrôle à distance affiche à nouveau son titre et son badge Experimental.",
    ],
  },

{
    version: "0.22.15",
    date: "2026-10-31",
    highlights: [
      "La télécommande web gagne les bases de l'espace de travail : sessions groupées par projet (groupes repliables), choix du modèle et changement de mode sur le composeur, lectures de transcription bornées et titres de session sur une ligne.",
    ],
  },

{
    version: "0.22.14",
    date: "2026-10-31",
    highlights: [
      "La télécommande web charge maintenant l'espace de travail sur les bureaux 0.22.13 (la lecture du détail de session utilisait un nom d'argument erroné) et le recharge automatiquement dès que le bureau se reconnecte.",
    ],
  },

{
    version: "0.22.13",
    date: "2026-10-31",
    highlights: [
      "La télécommande web charge le véritable espace de travail : les commandes distantes déballestent le même résultat que le renderer, si bien que sessions, transcriptions et envois ne sont plus vides.",
    ],
  },


  {
    version: "0.22.12",
    date: "2026-10-31",
    highlights: [
      "Le jumelage de la télécommande se connecte enfin : le bureau s'enregistrait sous une sid aléatoire au lieu de celle du QR, donc chaque tentative du téléphone était rejetée comme jumelage inconnu.",
    ],
  },


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
