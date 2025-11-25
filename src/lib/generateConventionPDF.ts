import jsPDF from 'jspdf';

interface TimeSlot {
  start: string;
  end: string;
}

interface Reservation {
  id: string;
  date: number;
  timeSlots: TimeSlot[];
  reason: string;
  roomName: string;
}

interface AssociationData {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description?: string;
  address?: string;
  socialPurpose?: string;
  presidentAddress?: string;
  conventionSignedAt: number;
  conventionSignature?: string;
}

interface ConventionData {
  association: AssociationData;
  reservations: Reservation[];
}

export function generateConventionPDF(data: ConventionData) {
  const { association, reservations } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const lineHeight = 6;
  let yPosition = margin;

  // Helper pour vérifier si on doit ajouter une nouvelle page
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper pour ajouter du texte avec gestion automatique des sauts de page
  const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal', spaceAfter: number = 5) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);

    for (let i = 0; i < lines.length; i++) {
      checkPageBreak(lineHeight + 5);
      pdf.text(lines[i], margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += spaceAfter;
  };

  // Helper pour ajouter une liste à puces
  const addBulletList = (items: string[], fontSize: number = 9) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');

    items.forEach(item => {
      checkPageBreak(lineHeight + 3);
      const bullet = '•';
      const lines = pdf.splitTextToSize(item, pageWidth - 2 * margin - 5);
      pdf.text(bullet, margin, yPosition);
      pdf.text(lines, margin + 5, yPosition);
      yPosition += lineHeight * lines.length + 2;
    });
    yPosition += 3;
  };

  // ===== PAGE 1: HEADER ET INTRODUCTION =====
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageWidth, 45, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  yPosition = 12;
  const title1 = 'CONVENTION DE MISE À DISPOSITION';
  pdf.text(title1, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const title2 = 'D\'équipements sportifs municipaux';
  pdf.text(title2, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  const title3 = 'À titre précaire et révocable';
  pdf.text(title3, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  const title4 = 'pour l\'année 2025-2026';
  pdf.text(title4, pageWidth / 2, yPosition, { align: 'center' });

  pdf.setTextColor(0, 0, 0);
  yPosition = 55;

  // Introduction
  addText('Cette convention a pour objectif de définir les modalités de mise à disposition des locaux du complexe sportif François COMBORIEU.', 9, 'normal', 3);
  addText('Selon le type d\'utilisateur (associations non Chartrettoise, comités et fédérations, sociétés privées, particuliers, clubs professionnels…) et la nature des activités (sports, loisirs, autres), les créneaux mis à disposition pourront être facturés en référence à la grille de tarifs en vigueur prise par délibération.', 9, 'normal', 10);

  // ENTRE
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ENTRE :', margin, yPosition);
  yPosition += lineHeight + 3;

  // LA MAIRIE
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin - 3, yPosition - 4, pageWidth - 2 * margin + 6, 35, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(37, 99, 235);
  pdf.text('LA MAIRIE DE CHARTRETTES', margin, yPosition);
  yPosition += lineHeight;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('37 rue Georges Clemenceau', margin, yPosition);
  yPosition += lineHeight - 1;
  pdf.text('77590 CHARTRETTES', margin, yPosition);
  yPosition += lineHeight - 1;
  pdf.text('01.60.69.65.01', margin, yPosition);
  yPosition += lineHeight - 1;
  pdf.text('Représentée par son Maire, Monsieur Pascal Gros', margin, yPosition);
  yPosition += lineHeight + 3;

  pdf.setFont('helvetica', 'italic');
  pdf.text('D\'une part,', margin, yPosition);
  yPosition += lineHeight + 8;

  // ET
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ET :', margin, yPosition);
  yPosition += lineHeight + 3;

  // L'ASSOCIATION
  checkPageBreak(55);
  pdf.setFillColor(240, 245, 255);
  pdf.rect(margin - 3, yPosition - 4, pageWidth - 2 * margin + 6, 52, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(99, 102, 241);
  pdf.text(`L'association : ${association.name}`, margin, yPosition);
  yPosition += lineHeight;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  if (association.address) {
    pdf.text(`Ayant son siège social à : ${association.address}`, margin, yPosition);
    yPosition += lineHeight - 1;
  }

  pdf.text(`Représentée par son Président : ${association.contactName || 'M. ou Mme'}`, margin, yPosition);
  yPosition += lineHeight - 1;

  if (association.presidentAddress) {
    pdf.text(`Demeurant à : ${association.presidentAddress}`, margin, yPosition);
    yPosition += lineHeight - 1;
  }

  pdf.text(`Téléphone : ${association.contactPhone || ''}`, margin, yPosition);
  yPosition += lineHeight - 1;
  pdf.text(`Mail : ${association.contactEmail || ''}`, margin, yPosition);
  yPosition += lineHeight - 1;

  if (association.socialPurpose) {
    const purposeText = `Objet social : ${association.socialPurpose}`;
    const purposeLines = pdf.splitTextToSize(purposeText, pageWidth - 2 * margin - 6);
    pdf.text(purposeLines, margin, yPosition);
    yPosition += lineHeight * purposeLines.length - 1;
  }

  yPosition += 8;
  pdf.setFont('helvetica', 'italic');
  pdf.text('Désigné ci-après « l\'occupant »', margin, yPosition);
  yPosition += lineHeight - 1;
  pdf.text('D\'autre part.', margin, yPosition);
  yPosition += lineHeight + 8;

  // Par la présente convention
  checkPageBreak(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Par la présente convention, à travers laquelle, il a été convenu et arrêté ce qui suit :', margin, yPosition);
  yPosition += lineHeight + 8;

  // Objet de la convention
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Objet de la convention', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('La présente convention a pour objet la mise à disposition d\'installations sportives et des matériels décrits en annexe et définies dans les conditions énoncées ci-après.', 9, 'normal', 10);

  // ===== TITRE 1 =====
  checkPageBreak(25);
  pdf.setFillColor(37, 99, 235);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(margin - 5, yPosition - 4, pageWidth - 2 * margin + 10, 9, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TITRE 1 – LES ENGAGEMENTS DE LA VILLE DE CHARTRETTES', margin, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += lineHeight + 8;

  // Article 1 - Durée
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 1 – Durée', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('La présente convention, et ses annexes, est conclue et acceptée pour la période, du 8 septembre 2025 au 10 juillet 2026 inclus, selon les créneaux attribués en annexe 1 de la convention.', 9, 'normal', 8);

  // Article 2
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 2 – Conditions de mise à disposition – redevance', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('La mise à disposition est effectuée à titre précaire, révocable et gracieux, conformément à l\'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques.', 9, 'normal', 5);

  // Important warning
  checkPageBreak(25);
  pdf.setFillColor(255, 251, 235);
  pdf.setDrawColor(245, 158, 11);
  pdf.setLineWidth(0.5);
  pdf.rect(margin - 3, yPosition - 4, pageWidth - 2 * margin + 6, 18, 'FD');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(180, 83, 9);
  pdf.text('⚠ IMPORTANT', margin, yPosition);
  yPosition += lineHeight;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('• En absence de signature de la convention, l\'occupation des lieux est INTERDITE.', margin + 2, yPosition);
  yPosition += lineHeight - 1;
  pdf.text('• L\'occupation est également INTERDITE en dehors des jours et créneaux alloués.', margin + 2, yPosition);
  yPosition += lineHeight + 8;

  pdf.setTextColor(0, 0, 0);

  addText('Par le terme « équipements sportifs municipaux » il faut entendre les terrains (ex infrastructures situées aux Vergers) et salles dédiées à la pratique sportive, mais également les installations liées et intégrées aux équipements : vestiaires, sanitaires, stockage, espaces de réception (hall), salle de réunion, bureaux, infirmerie.', 9, 'normal', 5);

  addText('Toute demande de créneau ponctuel complémentaire devra faire l\'objet d\'une demande VIA LE LOGICIEL DE RESERVATION DES SALLES MUNICIPALES, au minimum 1 mois.', 9, 'normal', 5);

  addText('Il en sera de même pour toutes mises à disposition relevant de l\'organisation d\'événement à caractère sportif. La demande devra être transmise à la ville de CHARTRETTES au minimum 2 mois avant la date de l\'évènement via le site de réservation des salles.', 9, 'normal', 5);

  addText('La collectivité se réserve le droit de modifier, en cas de besoin, les créneaux de mise à disposition dans le cas d\'une organisation d\'événements à son initiative. Dans ce cas, l\'occupant sera informé de cette modification dans les meilleurs délais.', 9, 'normal', 10);

  // ===== TITRE 2 =====
  checkPageBreak(25);
  pdf.setFillColor(37, 99, 235);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(margin - 5, yPosition - 4, pageWidth - 2 * margin + 10, 9, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TITRE 2 – LES ENGAGEMENTS DE L\'OCCUPANT', margin, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += lineHeight + 8;

  // Article 1 - Nature
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 1 – Nature des activités autorisées', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('Les activités sont de nature sportive ou liées à l\'organisation des dites activités, compatibles avec la nature des locaux et des équipements sportifs mis à disposition, leurs aménagements et les règles qui y sont attachés en matière de sécurité publique. Les activités doivent se dérouler en la présence et sous la surveillance effective d\'un responsable désigné, agissant pour le compte de l\'occupant.', 9, 'normal', 8);

  // Article 2 - Obligations
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 2 – Obligation de l\'occupant', margin, yPosition);
  yPosition += lineHeight + 2;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('L\'occupant s\'engage à :', margin, yPosition);
  yPosition += lineHeight + 2;

  const obligations = [
    'Signer la convention',
    'Se conformer au règlement d\'utilisation des équipements sportifs municipaux',
    'Se conformer aux interventions de la ville de CHARTRETTES',
    'Utiliser les équipements sportifs municipaux au profit de ses adhérents et/ou élèves et conformément à son objet',
    'Assumer la responsabilité des équipements et du matériel mis à disposition pendant leur utilisation et à réparer ou remplacer à ses frais les dommages pouvant survenir sur ces biens',
    'Ne pas concéder l\'usage des équipements dont il bénéficie en vertu de la présente convention à un tiers',
    'Permettre l\'entrée dans les bâtiments qu\'en présence de la personne identifiée comme responsable de l\'activité',
    'Vérifier, avant son départ, la fermeture des accès à l\'établissement (portes, fenêtres…) et à veiller à l\'extinction des lumières',
    'Mettre tout en œuvre pour que ses activités ne troublent pas le déroulement des activités attenantes',
    'Respecter la configuration des installations et la position des équipements',
    'Après utilisation, ranger son matériel et laisser les locaux en bon état de propreté',
    'Informer par écrit la ville de Chartrettes de l\'installation de tout panneau publicitaire'
  ];

  addBulletList(obligations, 8);

  // Article 3 - Sécurité
  checkPageBreak(20);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 3 – Sécurité et accès au public', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('L\'occupant déclare disposer de toutes les autorisations administratives nécessaires pour ses activités et s\'engage à les exercer dans le respect des lois et règlementations en vigueur, notamment à l\'égard du Code du sport.', 9, 'normal', 5);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Avant l\'utilisation des locaux, l\'occupant :', margin, yPosition);
  yPosition += lineHeight + 2;

  const securityObligs = [
    'Reconnaît avoir pris connaissance des consignes générales de sécurité',
    'S\'engage à maintenir libres et accessibles les issues de secours',
    'Prévenir sans délai les services de secours en cas de sinistre',
    'S\'engage à avoir informé les services de secours si nécessaire',
    'S\'engage à respecter le nombre de pratiquants autorisés'
  ];

  addBulletList(securityObligs, 8);

  addText('Pour des raisons de sécurité, seule la Ville de CHARTRETTES est habilitée à modifier l\'agencement des installations.', 9, 'normal', 5);

  addText('Tout problème constaté devra être signalé à la Ville de CHARTRETTES. En cas de mauvais état constaté d\'un équipement, la Ville se réserve le droit d\'interdire son utilisation.', 9, 'normal', 5);

  addText('Toute dégradation volontaire ou involontaire sera systématiquement facturée à l\'Occupant.', 9, 'normal', 5);

  addText('En cas de manquements répétés, l\'occupant sera informé par lettre recommandée qu\'il ne pourra plus bénéficier des créneaux horaires attribués.', 9, 'normal', 8);

  // Article 4 - Assurance
  checkPageBreak(15);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 4 – ASSURANCE', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('L\'occupant reconnaît avoir souscrit une police d\'assurance en dommages aux biens pour l\'occupation des locaux ainsi qu\'une assurance en responsabilité civile pour la pratique de ces activités. Un double de l\'attestation d\'assurance sera remis par l\'occupant à la ville de CHARTRETTES chaque année.', 9, 'normal', 5);

  addText('La ville de CHARTRETTES ne pourra en aucun cas être tenu pour responsable des vols et dégradations survenant sur le matériel de l\'occupant ou les effets personnels des utilisateurs.', 9, 'normal', 5);

  addText('L\'occupant renonce à tout recours contre la ville de CHARTRETTES en matière de responsabilité civile à l\'occasion de tout accident dont serait victime un utilisateur.', 9, 'normal', 8);

  // Article 5 - Accès aux salles
  checkPageBreak(20);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 5 – L\'ACCES AUX SALLES', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('L\'accès aux salles est régi par un dispositif de clés programmables.', 9, 'normal', 3);

  addText('Ce dispositif permet d\'attribuer l\'ensemble des accès nécessaires à la pratique d\'une activité. Une seule clé est nécessaire pour permettre l\'accès à l\'ensemble des salles qui sont attribuées.', 9, 'normal', 3);

  addText('Chaque clé est nominative. Une caution de 52,50€ par clé sera demandée par chèque à l\'ordre du Trésor Public. En cas de perte, l\'utilisateur doit le signaler immédiatement.', 9, 'normal', 5);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROGRAMMATION :', margin, yPosition);
  yPosition += lineHeight + 2;

  pdf.setFont('helvetica', 'italic');
  pdf.text('Pour les programmations annuelles', margin, yPosition);
  yPosition += lineHeight;

  pdf.setFont('helvetica', 'normal');
  addText('Ces clés sont programmées en début d\'année scolaire. La programmation est effective un mois maximum. Chaque détenteur doit se rendre à la tour de chargement à côté de la mairie au moins une fois par mois.', 9, 'normal', 5);

  pdf.setFont('helvetica', 'italic');
  pdf.text('Pour les programmations ponctuelles', margin, yPosition);
  yPosition += lineHeight;

  pdf.setFont('helvetica', 'normal');
  addText('Chaque demande devra être effectuée 1 mois à l\'avance. En dehors de ces délais, les demandes seront honorées en fonction des disponibilités.', 9, 'normal', 8);

  // Article 6 - Engagement républicain
  checkPageBreak(12);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 6 – CONTRAT D\'ENGAGEMENT REPUBLICAIN', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('Conformément au décret N°2021-1947 du 31 décembre 2021, l\'association reconnait souscrire au contrat d\'engagement républicain et en accepter les modalités de mise en œuvre (annexe n°2).', 9, 'normal', 10);

  // ===== TITRE 3 =====
  checkPageBreak(25);
  pdf.setFillColor(37, 99, 235);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(margin - 5, yPosition - 4, pageWidth - 2 * margin + 10, 9, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TITRE 3 – DISPOSITIONS DIVERSES', margin, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += lineHeight + 8;

  // Article 1 - Modification
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 1 – Modification', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('La présente convention pourra être modifiée en cours d\'exécution, sur l\'initiative de l\'une ou l\'autre des parties, par voie d\'avenant avec l\'accord des deux parties.', 9, 'normal', 8);

  // Article 2 - Résiliation
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 2 – Résiliation', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('La convention, en tant que contrat administratif d\'occupation du domaine public, est résiliable à tout moment par la ville de CHARTRETTES sans que cette dernière puisse se prévaloir d\'un droit à indemnité.', 9, 'normal', 3);

  addText('Elle pourra être résiliée avant l\'arrivée à son terme, soit sur demande de la collectivité, soit sur demande de l\'occupant. La résiliation se fera par courrier recommandé avec accusé de réception.', 9, 'normal', 8);

  // Article 3 - Contrôle
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 3 – Contrôle de la collectivité', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('Le contrôle de la bonne utilisation des installations sera assuré par un représentant de la ville de CHARTRETTES.', 9, 'normal', 8);

  // Article 4 - Litiges
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Article 4 – Règlement des litiges', margin, yPosition);
  yPosition += lineHeight + 2;

  addText('Les parties s\'engagent à rechercher, en cas de litige sur l\'interprétation ou sur l\'application de la présente convention, toute voie amiable de règlement.', 9, 'normal', 3);

  addText('S\'agissant d\'une convention comportant usage de dépendance du domaine public, tout litige qui n\'aura pas pu trouver de règlement amiable relève de la compétence du tribunal administratif de Melun.', 9, 'normal', 10);

  // ===== SIGNATURES PRINCIPALE =====
  checkPageBreak(50);
  const signDate = new Date(association.conventionSignedAt);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Fait à CHARTRETTES, le ${signDate.toLocaleDateString('fr-FR')}`, margin, yPosition);
  yPosition += lineHeight + 8;

  const col1X = margin;
  const col2X = pageWidth / 2 + 5;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Pour la Ville de CHARTRETTES', col1X, yPosition);
  pdf.text('Pour l\'Occupant', col2X, yPosition);
  yPosition += lineHeight;

  pdf.setFont('helvetica', 'normal');
  pdf.text('Pascal GROS', col1X, yPosition);
  pdf.text(`${association.contactName}`, col2X, yPosition);
  yPosition += lineHeight;
  pdf.text('Maire de CHARTRETTES', col1X, yPosition);
  pdf.text('Président', col2X, yPosition);
  yPosition += lineHeight + 12;

  if (association.conventionSignature) {
    try {
      pdf.addImage(association.conventionSignature, 'PNG', col2X, yPosition, 50, 20);
    } catch (e) {
      console.error('Erreur signature:', e);
    }
  }

  // ===== ANNEXE 1 =====
  pdf.addPage();
  yPosition = margin;

  pdf.setFillColor(37, 99, 235);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 20, 'F');
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ANNEXE 1', pageWidth / 2, 12, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  yPosition = 28;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Attribution de créneaux pour la période du 8 septembre 2025 au 10 juillet 2026', margin, yPosition);
  yPosition += lineHeight + 6;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nom de l'occupant : ${association.name}`, margin, yPosition);
  yPosition += lineHeight;

  if (reservations.length > 0 && reservations[0].reason) {
    pdf.text(`Discipline sportive pratiquée : ${reservations[0].reason}`, margin, yPosition);
    yPosition += lineHeight;
  }

  pdf.text(`Nom du Président : ${association.contactName || ''}`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`Courriel : ${association.contactEmail || ''}`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`N° de téléphone portable : ${association.contactPhone || ''}`, margin, yPosition);
  yPosition += lineHeight + 4;

  pdf.text('Nom et adresse de l\'Équipement sportif :', margin, yPosition);
  yPosition += lineHeight;
  pdf.text('Complexe Sportif François Combourieu, 5 ter rue des écoles – 77590 Chartrettes', margin, yPosition);
  yPosition += lineHeight + 8;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Créneaux attribués (hors vacances scolaires et jours fériés)', margin, yPosition);
  yPosition += lineHeight + 4;

  // Tableau
  const colWidths = [40, 50, 80];
  const tableX = margin;

  pdf.setFillColor(37, 99, 235);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(tableX, yPosition - 5, colWidths[0], 10, 'F');
  pdf.rect(tableX + colWidths[0], yPosition - 5, colWidths[1], 10, 'F');
  pdf.rect(tableX + colWidths[0] + colWidths[1], yPosition - 5, colWidths[2], 10, 'F');

  pdf.setFontSize(9);
  pdf.text('Jour', tableX + 2, yPosition);
  pdf.text('Horaires', tableX + colWidths[0] + 2, yPosition);
  pdf.text('Installation sportive', tableX + colWidths[0] + colWidths[1] + 2, yPosition);
  yPosition += 10;

  pdf.setTextColor(0, 0, 0);

  const reservationsByDay = new Map<string, { timeSlots: string[]; roomName: string }>();
  reservations.forEach((res) => {
    const date = new Date(res.date);
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[date.getDay()];
    const timeSlotStr = res.timeSlots.map(ts => `${ts.start}-${ts.end}`).join(', ');

    if (!reservationsByDay.has(dayName)) {
      reservationsByDay.set(dayName, { timeSlots: [], roomName: res.roomName });
    }
    reservationsByDay.get(dayName)!.timeSlots.push(timeSlotStr);
  });

  reservationsByDay.forEach((value, day) => {
    checkPageBreak(12);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(tableX, yPosition - 2, tableX + colWidths[0] + colWidths[1] + colWidths[2], yPosition - 2);
    pdf.text(day, tableX + 2, yPosition);
    pdf.text(value.timeSlots.join(', '), tableX + colWidths[0] + 2, yPosition);
    pdf.text(value.roomName, tableX + colWidths[0] + colWidths[1] + 2, yPosition);
    yPosition += 10;
  });

  if (reservations.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Aucun créneau attribué', tableX + 2, yPosition);
    yPosition += 10;
    pdf.setTextColor(0, 0, 0);
  }

  yPosition += 10;

  // Signatures Annexe 1
  checkPageBreak(50);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Fait à CHARTRETTES, le ${signDate.toLocaleDateString('fr-FR')}`, margin, yPosition);
  yPosition += lineHeight + 8;

  pdf.setFontSize(9);
  pdf.text('Pour la Ville de CHARTRETTES', col1X, yPosition);
  pdf.text('Pour l\'Occupant', col2X, yPosition);
  yPosition += lineHeight;

  pdf.setFont('helvetica', 'normal');
  pdf.text('Pascal GROS', col1X, yPosition);
  pdf.text(`${association.contactName}`, col2X, yPosition);
  yPosition += lineHeight;
  pdf.text('Maire de CHARTRETTES', col1X, yPosition);

  if (association.conventionSignature) {
    try {
      pdf.addImage(association.conventionSignature, 'PNG', col2X, yPosition + 5, 50, 20);
    } catch (e) {
      console.error('Erreur signature:', e);
    }
  }

  // ===== ANNEXE 2 : ENGAGEMENT RÉPUBLICAIN =====
  pdf.addPage();
  yPosition = margin;

  pdf.setFillColor(37, 99, 235);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 20, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ANNEXE 2 : CONTRAT D\'ENGAGEMENT RÉPUBLICAIN', pageWidth / 2, 12, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  yPosition = 28;

  addText('Ce contrat est conforme aux dispositions du décret n°2021-1947 du 31 décembre 2021, pris pour l\'application de l\'article 10-1 de la loi n°2000-321 du 12 avril 2000.', 8, 'italic', 3);

  addText('L\'article 5 de ce décret impute à l\'association ou à la fondation, les manquements aux engagements souscrits, commis par ses dirigeants, salariés, membres, et bénévoles.', 8, 'normal', 8);

  addText('L\'importance des associations dans la vie de la Nation justifient que les autorités administratives décident de leur apporter un soutien. L\'administration est fondée à s\'assurer que les organismes bénéficiaires respectent le pacte républicain.', 8, 'normal', 3);

  addText('A cette fin la loi n° 2021-1109 du 24 août 2021 confortant le respect des principes de la République a institué le contrat d\'engagement républicain.', 8, 'normal', 8);

  // Engagements
  const engagements = [
    {
      titre: 'ENGAGEMENT N° 1 : RESPECT DES LOIS DE LA RÉPUBLIQUE',
      textes: [
        'Le respect des lois de la République s\'impose aux associations, qui ne doivent entreprendre ni inciter à aucune action manifestement contraire à la loi.',
        'L\'association s\'engage à ne pas se prévaloir de convictions politiques, philosophiques ou religieuses pour s\'affranchir des règles communes.',
        'Elle s\'engage notamment à ne pas remettre en cause le caractère laïque de la République.'
      ]
    },
    {
      titre: 'ENGAGEMENT N° 2 : LIBERTÉ DE CONSCIENCE',
      textes: [
        'L\'association s\'engage à respecter et protéger la liberté de conscience de ses membres et des tiers, et s\'abstient de tout acte de prosélytisme abusif.'
      ]
    },
    {
      titre: 'ENGAGEMENT N° 3 : LIBERTÉ DES MEMBRES',
      textes: [
        'L\'association s\'engage à respecter la liberté de ses membres de s\'en retirer et leur droit de ne pas en être arbitrairement exclu.'
      ]
    },
    {
      titre: 'ENGAGEMENT N° 4 : ÉGALITÉ ET NON-DISCRIMINATION',
      textes: [
        'L\'association s\'engage à respecter l\'égalité de tous devant la loi.',
        'Elle s\'engage à ne pas opérer de différences de traitement fondées sur le sexe, l\'orientation sexuelle, l\'identité de genre, l\'appartenance à une ethnie ou religion.',
        'Elle prend les mesures permettant de lutter contre toute forme de violence à caractère sexuel ou sexiste.'
      ]
    },
    {
      titre: 'ENGAGEMENT N° 5 : FRATERNITÉ ET PRÉVENTION DE LA VIOLENCE',
      textes: [
        'L\'association s\'engage à agir dans un esprit de fraternité et de civisme.',
        'Elle s\'engage à ne pas provoquer à la haine ou à la violence envers quiconque. Elle s\'engage à rejeter toutes formes de racisme et d\'antisémitisme.'
      ]
    },
    {
      titre: 'ENGAGEMENT N° 6 : RESPECT DE LA DIGNITÉ HUMAINE',
      textes: [
        'L\'association s\'engage à n\'entreprendre aucune action portant atteinte à la dignité de la personne humaine.',
        'Elle s\'engage à respecter les lois protégeant la santé et l\'intégrité physique et psychique de ses membres.',
        'Elle s\'engage à ne pas créer ou exploiter la vulnérabilité de ses membres.',
        'Elle s\'engage à n\'entreprendre aucune action compromettant le développement des mineurs.'
      ]
    },
    {
      titre: 'ENGAGEMENT N° 7 : RESPECT DES SYMBOLES DE LA RÉPUBLIQUE',
      textes: [
        'L\'association s\'engage à respecter le drapeau tricolore, l\'hymne national, et la devise de la République.'
      ]
    }
  ];

  engagements.forEach((eng) => {
    checkPageBreak(20);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(eng.titre, margin, yPosition);
    yPosition += lineHeight + 2;

    eng.textes.forEach((texte) => {
      addText(texte, 8, 'normal', 2);
    });
    yPosition += 4;
  });

  // Signatures Annexe 2
  checkPageBreak(50);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Fait à CHARTRETTES, le ${signDate.toLocaleDateString('fr-FR')}`, margin, yPosition);
  yPosition += lineHeight + 8;

  pdf.setFontSize(9);
  pdf.text('Pour la Ville de CHARTRETTES', col1X, yPosition);
  pdf.text('Pour l\'Association', col2X, yPosition);
  yPosition += lineHeight;

  pdf.setFont('helvetica', 'normal');
  pdf.text('Pascal GROS', col1X, yPosition);
  pdf.text(`${association.contactName}`, col2X, yPosition);
  yPosition += lineHeight;
  pdf.text('Maire de CHARTRETTES', col1X, yPosition);
  pdf.text('Président', col2X, yPosition);
  yPosition += lineHeight + 12;

  if (association.conventionSignature) {
    try {
      pdf.addImage(association.conventionSignature, 'PNG', col2X, yPosition, 50, 20);
    } catch (e) {
      console.error('Erreur signature:', e);
    }
  }

  return pdf;
}
