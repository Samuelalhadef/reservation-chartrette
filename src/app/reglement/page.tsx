import Link from 'next/link';
import { ArrowLeft, Shield, Users, Clock, Key, AlertTriangle, Phone, Mail, FileText, Ban, Flame, Volume2 } from 'lucide-react';

export default function ReglementPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 dark:text-accent-300 dark:hover:text-accent-200 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au tableau de bord
        </Link>

        {/* Header */}
        <div className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Reglement d'utilisation
              </h1>
              <p className="text-white/80 mt-1">
                Complexe Sportif "Francois Combourieu" - Ville de Chartrettes
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">

          {/* I - DISPOSITIONS GENERALES */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3">
              I - Dispositions generales
            </h2>

            <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 1er - Objet et definition</h3>
                <p>
                  Le present reglement determine les conditions dans lesquelles les equipements du complexe
                  sportif "Francois Combourieu" ainsi que des equipements exterieurs tels que les terrains de
                  tennis aux vergers de la ville de Chartrettes, peuvent etre utilisees.
                </p>
                <p className="mt-2">
                  De maniere generale, les equipements municipaux sont utilises <strong>prioritairement</strong> par les
                  services communaux ou les activites d'interet general organisees par les associations locales Chartrettoises.
                </p>
                <p className="mt-2">
                  Les associations Chartrettoises sont les associations dont le siege social est situe a Chartrettes
                  et possedant un lien etroit avec la politique sportive et recreative de la ville. Ces associations
                  peuvent en beneficier a titre gratuit dans les conditions definies dans la Convention de mise
                  a disposition d'equipements sportifs municipaux a titre precaire et revocable.
                </p>
              </div>
            </div>
          </section>

          {/* II - UTILISATION ET MODALITES */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3">
              II - Utilisation et modalites
            </h2>

            <div className="space-y-5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 2 - Principe de la mise a disposition</h3>
                <p>
                  Les utilisateurs des salles mise a disposition a titre gratuit doivent respecter les horaires et les
                  conditions d'utilisation des equipements tels qu'ils sont definis dans le present reglement
                  et dans les conventions d'occupation. La signature de la convention de mise a disposition est
                  obligatoire pour pouvoir acceder aux lieux.
                </p>
                <p className="mt-2">
                  <strong>Les associations exterieures</strong> peuvent demander la location de certaines salles, selon les
                  disponibilites, pour des activites ponctuelles. La mise a disposition se fera a titre onereux et
                  sous la responsabilite du president.
                </p>
                <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p>
                      La ville de Chartrettes se reserve le droit d'annuler a tout moment une reservation de salle
                      en cas de circonstances particulieres : ceremonies officielles, motif d'ordre public,
                      elections, cas de force majeure, etc.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 3 - Types d'occupants</h3>
                <p>
                  Seuls les associations Chartrettoises, les institutions scolaires et peri et extrascolaire ayant
                  obtenu un creneau horaire peuvent avoir acces aux salles du complexe sportif de la ville de
                  Chartrettes a titre gratuit.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 4 - Obligations</h3>
                <p>
                  Les occupants devront imperativement respecter le reglement, en particulier concernant les
                  horaires d'attribution et de fermeture ainsi que toutes les obligations prevues dans la
                  convention de mise a disposition.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-600" />
                  Article 5 - Demande de mise a disposition
                </h3>
                <div className="p-4 bg-primary-50 dark:bg-accent-500/10 rounded-xl border border-primary-200 dark:border-primary-700/60">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 mt-1 font-bold">-</span>
                      <span>Les reservations doivent etre effectuees via le logiciel de reservation des salles, au plus tot <strong>dix (10) jours</strong> avant la date d'utilisation souhaitee.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 mt-1 font-bold">-</span>
                      <span>Un delai minimum d'<strong>un mois</strong> est obligatoire pour toute reservation liee a un evenement necessitant une preparation de materiel et/ou l'intervention des services municipaux.</span>
                    </li>
                  </ul>
                </div>
                <p className="mt-3">
                  Les associations doivent fournir, lors de leur premiere demande : la copie des statuts,
                  la presentation de l'activite, l'implication locale, et l'attestation d'assurance.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 6 - Non-utilisation</h3>
                <p>
                  En cas de non-utilisation constatee plus de <strong>3 fois consecutives</strong> par les services municipaux
                  et sans prevenance, le creneau pourra etre annule et accorde a un autre utilisateur.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Article 7 - Encadrement
                </h3>
                <p>
                  Aucun equipement sportif ne pourra etre utilise sans la presence d'un responsable d'equipe.
                  Les differents responsables devront prendre connaissance des consignes generales de securite,
                  des issues de secours, des itineraires, des consignes particulieres, et s'engagent a les respecter.
                </p>
              </div>
            </div>
          </section>

          {/* III - REGLES GENERALES */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3">
              III - Regles generales
            </h2>

            <div className="space-y-5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 8 - Utilisation du materiel sportif</h3>
                <p>
                  Le montage et demontage du materiel ordinaire de sport fourni par la commune pour la
                  pratique sportive seront assures par l'utilisateur et sous sa responsabilite.
                  Il est IMPERATIF de ranger le materiel a chaque utilisation et de laisser les locaux propres.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 9 - Buvettes</h3>
                <p>
                  L'ouverture temporaire d'un debit de boissons est soumise a une autorisation des
                  services municipaux (demande a adresser au service de police municipale au minimum un mois a l'avance).
                  Les bouteilles et contenants en verre sont prohibes. La vente et la distribution de boissons
                  des groupes 2 a 5 sont interdites dans les stades, salles d'education physique, gymnases et
                  de maniere generale dans tous les etablissements d'activites physiques et sportives.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 10 - Publicite et sonorisation</h3>
                <p>
                  La publicite permanente est interdite sans autorisation dans les enceintes sportives.
                  La sonorisation devra avoir fait l'objet d'une declaration aupres des organismes percevant des droits d'auteurs.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-500" />
                  Article 11 - Regles applicables a tout equipement public
                </h3>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold">-</span>
                      <span>Les equipements sportifs sont <strong>non-fumeurs</strong> dans leur totalite</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold">-</span>
                      <span>Interdit d'introduire tout objet metallique, tranchant ou contondant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold">-</span>
                      <span>Velos, rollers, engins motorises non acceptes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold">-</span>
                      <span>Acces interdit a toute personne en etat d'ivresse</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold">-</span>
                      <span>Le revetement de certains espaces sportifs est strictement INTERDIT aux chaussures de ville</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold">-</span>
                      <span>Le voisinage doit etre respecte, le bruit doit etre raisonnable</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Article 12 - Securite, hygiene et tranquillite publique
                </h3>
                <p>
                  La Ville de Chartrettes est degagee de toute responsabilite pour les accidents corporels pouvant
                  resulter d'une utilisation des installations non conforme a la reglementation en vigueur.
                </p>
                <p className="mt-2">
                  En aucun cas l'equipement ne peut accueillir plus de public que la norme prevue dans le
                  proces-verbal de la commission de securite. Le respect de la FMI (Frequence maximale instantanee) est, en
                  particulier, IMPERATIF lors des manifestations sportives et extra sportives.
                </p>
                <div className="mt-3 p-4 bg-primary-50 dark:bg-accent-500/10 rounded-xl border border-primary-200 dark:border-primary-700/60">
                  <p className="font-semibold text-slate-900 dark:text-white mb-2">En cas de probleme, contactez :</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary-600" />
                      <span>mairie@mairie-chartrettes.fr</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary-600" />
                      <span>Astreinte technique : <strong>06 23 26 95 99</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Obligations de l'utilisateur */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3">
              Obligations de l'utilisateur
            </h2>

            <div className="space-y-3 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <p className="font-medium text-slate-900 dark:text-white">L'utilisateur devra :</p>
              <ul className="space-y-2 ml-2">
                {[
                  'Maintenir les issues de degagements et de secours libres de tout encombrement',
                  'Deverrouiller l\'ensemble des sorties des qu\'il y a presence du public',
                  'Respecter la jauge de capacite d\'accueil prevue pour la salle',
                  'Ranger le materiel a chaque utilisation et laisser les locaux propres',
                  'Eteindre toutes les lumieres a la fin de l\'occupation',
                  'Veiller a ce que chaque point d\'eau soit bien ferme avant de quitter les lieux',
                  'Fermer les portes de l\'equipement apres utilisation',
                  'Stocker ses dechets dans des sacs etanches et solides, ne pas souiller les containers',
                  'Effectuer le tri des dechets',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent-600 mt-1 font-bold">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="font-medium text-slate-900 dark:text-white mt-4">Il est formellement interdit :</p>
              <ul className="space-y-2 ml-2">
                {[
                  'De proceder a une quelconque modification des lieux',
                  'D\'utiliser les locaux a des fins non conformes a l\'autorisation d\'occupation',
                  'D\'apporter des decorations sur les murs (clous, punaises, ruban adhesif, peinture)',
                  'D\'introduire des animaux dans la salle (sauf chien guide)',
                  'D\'introduire du materiel de cuisson (four, barbecue, bouteille de gaz)',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1 font-bold">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Acces aux salles */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Article 14 - Acces aux salles
            </h2>

            <div className="space-y-3 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <p>
                L'acces aux salles est regi par un dispositif de cles programmables. Chaque cle est nominative.
                Chaque personne detentrice d'une cle est responsable de son utilisation.
              </p>
              <div className="p-4 bg-primary-50 dark:bg-accent-500/10 rounded-xl border border-primary-200 dark:border-primary-700/60">
                <p className="font-semibold text-primary-700 dark:text-accent-300">
                  Caution par cle : 54 EUR par cheque a l'ordre du tresor Public
                </p>
              </div>
              <p>
                La programmation est effective un mois maximum. Chaque detenteur doit se rendre a la
                tour de chargement situee a cote de la mairie au moins une fois par mois.
              </p>
              <ul className="space-y-2 ml-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-1 font-bold">-</span>
                  <span><strong>Locations weekend :</strong> la cle sera remise imperativement des le lundi a l'agent municipal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-1 font-bold">-</span>
                  <span><strong>Reservations en semaine :</strong> la cle devra etre restituee des la verification de l'etat des lieux</span>
                </li>
              </ul>
            </div>
          </section>

          {/* IV - ASSURANCES - RESPONSABILITES */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3">
              IV - Assurances et responsabilites
            </h2>

            <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 15 - Responsabilites</h3>
                <p>L'utilisateur est responsable :</p>
                <ul className="space-y-1 ml-2 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-1 font-bold">-</span>
                    <span>Des degradations pouvant etre causees a la salle et/ou au materiel present</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-1 font-bold">-</span>
                    <span>Des dommages causes a toute personne du fait de son activite</span>
                  </li>
                </ul>
                <p className="mt-2">
                  L'utilisateur prendra en charge l'integralite des frais de remise en etat ou de remplacement
                  du materiel endommage. En l'absence de reglement dans un delai de 30 jours, la ville se reserve
                  le droit d'engager toute procedure utile.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Article 16 - Assurances</h3>
                <p>
                  L'utilisateur est responsable des deteriorations et des accidents. Il est tenu de contracter
                  une assurance et de pouvoir justifier de cette garantie a tout moment.
                  Une attestation d'assurance devra etre fournie aux services de la Mairie en amont de la reservation.
                </p>
              </div>
            </div>
          </section>

          {/* V - TARIFS */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3">
              V - Tarifs de location
            </h2>

            <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <p>
                Les tarifs sont fixes par deliberations en conseil municipal N deg 2025_35 du 18 juin 2025.
              </p>

              {/* Grande Salle */}
              <div className="overflow-x-auto">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Grande Salle</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-primary-50 dark:bg-primary-900/30">
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-left">Duree</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Chartrettois</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">CAPF / Associations</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Exterieurs</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Caution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Heure</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">102 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">102 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">204 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">1 530 EUR</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-primary-900/20">
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Forfait annuel (1h/sem, 36-37 sem.)</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold" colSpan={2}>1 530 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">-</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">1 530 EUR</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Forfait 4 saisons sportives (10h/sem, 36-37 sem.)</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold" colSpan={3}>15 000 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Dojo */}
              <div className="overflow-x-auto mt-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Dojo</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-primary-50 dark:bg-primary-900/30">
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-left">Duree</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Chartrettois</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">CAPF / Associations</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Exterieurs</th>
                      <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Caution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Heure</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">51 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">51 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">102 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">510 EUR</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-primary-900/20">
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Forfait annuel (36-37 sem. scolaires)</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold" colSpan={2}>1 020 EUR</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">-</td>
                      <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center font-semibold">510 EUR</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* CAPACITES D'ACCUEIL */}
          <section className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-primary-700/60">
            <h2 className="text-xl font-bold text-primary-700 dark:text-accent-300 mb-4 border-b border-primary-100 dark:border-primary-800 pb-3">
              Capacites d'accueil du complexe sportif
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary-50 dark:bg-primary-900/30">
                    <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-left">Niveau</th>
                    <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-left">Destination</th>
                    <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Superficie/places</th>
                    <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Public</th>
                    <th className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">Total cumul</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Mezzanine</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Gradins</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">210 places</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">210</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">210</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-primary-900/20">
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2" rowSpan={2}>RDC</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Dojo - petite salle</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">253 m2</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">63</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">273</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2">Grande salle</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">1 034 m2</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">130</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">493</td>
                  </tr>
                  <tr className="bg-primary-50 dark:bg-primary-900/30 font-bold">
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2" colSpan={3}>TOTAL</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">431</td>
                    <td className="border border-slate-200 dark:border-primary-700/60 px-4 py-2 text-center">937</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
              L'etablissement est classe en type X (salle omnisport) de 3eme categorie.
            </p>
          </section>

          {/* Acceptation */}
          <section className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 text-white">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Article 19 - Acceptation du reglement
            </h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Un exemplaire du present reglement est remis a chaque utilisateur des salles communales qui s'engage
              a le respecter sans la moindre restriction. Toutes contestations concernant l'utilisation des salles
              municipales devront etre soumises a la Ville. En cas de non-resolution amiable, le litige pourra etre
              porte devant les juridictions competentes.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
