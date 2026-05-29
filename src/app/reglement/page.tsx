'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Users, Clock, Key, AlertTriangle, Phone, Mail, FileText, Ban, Building2, UtensilsCrossed, Leaf } from 'lucide-react';

type TabId = 'complexe' | 'salles';

export default function ReglementPage() {
  const [tab, setTab] = useState<TabId>('complexe');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au tableau de bord
        </Link>

        {/* Header */}
        <div className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Reglements d'utilisation
              </h1>
              <p className="text-white/80 mt-1">
                Ville de Chartrettes
              </p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8">
          <button
            type="button"
            onClick={() => setTab('complexe')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
              tab === 'complexe'
                ? 'bg-primary-700 text-white border-primary-700 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700'
            }`}
          >
            <Shield className="w-5 h-5" />
            Complexe sportif
          </button>
          <button
            type="button"
            onClick={() => setTab('salles')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
              tab === 'salles'
                ? 'bg-primary-700 text-white border-primary-700 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Salles municipales (EMC / Vergers)
          </button>
        </div>

        {tab === 'complexe' ? <ReglementComplexe /> : <ReglementSalles />}
      </div>
    </div>
  );
}

/* =========================================================================
   RÈGLEMENT 1 — COMPLEXE SPORTIF "FRANÇOIS COMBOURIEU"
   ========================================================================= */
function ReglementComplexe() {
  return (
    <div className="space-y-6">
      <div className="bg-primary-50 rounded-xl p-4 border border-primary-100 text-sm text-primary-800 font-medium">
        Complexe Sportif "Francois Combourieu" — terrains de tennis des Vergers
      </div>

      {/* I - DISPOSITIONS GENERALES */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          I - Dispositions generales
        </h2>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 1er - Objet et definition</h3>
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
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          II - Utilisation et modalites
        </h2>
        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 2 - Principe de la mise a disposition</h3>
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
            <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  La ville de Chartrettes se reserve le droit d'annuler a tout moment une reservation de salle
                  en cas de circonstances particulieres : ceremonies officielles, motif d'ordre public,
                  elections, cas de force majeure, etc.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 3 - Types d'occupants</h3>
            <p>
              Seuls les associations Chartrettoises, les institutions scolaires et peri et extrascolaire ayant
              obtenu un creneau horaire peuvent avoir acces aux salles du complexe sportif de la ville de
              Chartrettes a titre gratuit.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 4 - Obligations</h3>
            <p>
              Les occupants devront imperativement respecter le reglement, en particulier concernant les
              horaires d'attribution et de fermeture ainsi que toutes les obligations prevues dans la
              convention de mise a disposition.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              Article 5 - Demande de mise a disposition
            </h3>
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
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
            <h3 className="font-semibold text-slate-900 mb-2">Article 6 - Non-utilisation</h3>
            <p>
              En cas de non-utilisation constatee plus de <strong>3 fois consecutives</strong> par les services municipaux
              et sans prevenance, le creneau pourra etre annule et accorde a un autre utilisateur.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
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
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          III - Regles generales
        </h2>
        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 8 - Utilisation du materiel sportif</h3>
            <p>
              Le montage et demontage du materiel ordinaire de sport fourni par la commune pour la
              pratique sportive seront assures par l'utilisateur et sous sa responsabilite.
              Il est IMPERATIF de ranger le materiel a chaque utilisation et de laisser les locaux propres.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 9 - Buvettes</h3>
            <p>
              L'ouverture temporaire d'un debit de boissons est soumise a une autorisation des
              services municipaux (demande a adresser au service de police municipale au minimum un mois a l'avance).
              Les bouteilles et contenants en verre sont prohibes. La vente et la distribution de boissons
              des groupes 2 a 5 sont interdites dans les stades, salles d'education physique, gymnases et
              de maniere generale dans tous les etablissements d'activites physiques et sportives.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 10 - Publicite et sonorisation</h3>
            <p>
              La publicite permanente est interdite sans autorisation dans les enceintes sportives.
              La sonorisation devra avoir fait l'objet d'une declaration aupres des organismes percevant des droits d'auteurs.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Article 11 - Regles applicables a tout equipement public
            </h3>
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <ul className="space-y-2">
                {[
                  'Les equipements sportifs sont non-fumeurs dans leur totalite',
                  'Interdit d\'introduire tout objet metallique, tranchant ou contondant',
                  'Velos, rollers, engins motorises non acceptes',
                  'Acces interdit a toute personne en etat d\'ivresse',
                  'Le revetement de certains espaces sportifs est strictement INTERDIT aux chaussures de ville',
                  'Le voisinage doit etre respecte, le bruit doit etre raisonnable',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1 font-bold">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
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
            <div className="mt-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
              <p className="font-semibold text-slate-900 mb-2">En cas de probleme, contactez :</p>
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
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          Obligations de l'utilisateur
        </h2>
        <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <p className="font-medium text-slate-900">L'utilisateur devra :</p>
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

          <p className="font-medium text-slate-900 mt-4">Il est formellement interdit :</p>
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
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3 flex items-center gap-2">
          <Key className="w-5 h-5" />
          Article 14 - Acces aux salles
        </h2>
        <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <p>
            L'acces aux salles est regi par un dispositif de cles programmables. Chaque cle est nominative.
            Chaque personne detentrice d'une cle est responsable de son utilisation.
          </p>
          <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
            <p className="font-semibold text-primary-700">
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
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          IV - Assurances et responsabilites
        </h2>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 15 - Responsabilites</h3>
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
            <h3 className="font-semibold text-slate-900 mb-2">Article 16 - Assurances</h3>
            <p>
              L'utilisateur est responsable des deteriorations et des accidents. Il est tenu de contracter
              une assurance et de pouvoir justifier de cette garantie a tout moment.
              Une attestation d'assurance devra etre fournie aux services de la Mairie en amont de la reservation.
            </p>
          </div>
        </div>
      </section>

      {/* V - TARIFS */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          V - Tarifs de location
        </h2>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Les tarifs sont fixes par deliberations en conseil municipal N deg 2025_35 du 18 juin 2025.
          </p>

          {/* Grande Salle */}
          <div className="overflow-x-auto">
            <h3 className="font-semibold text-slate-900 mb-3">Grande Salle</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary-50">
                  <th className="border border-slate-200 px-4 py-2 text-left">Duree</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">Chartrettois</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">CAPF / Associations</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">Exterieurs</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">Caution</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-2">Heure</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">102 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">102 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">204 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">1 530 EUR</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-2">Forfait annuel (1h/sem, 36-37 sem.)</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold" colSpan={2}>1 530 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center">-</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">1 530 EUR</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-2">Forfait 4 saisons sportives (10h/sem, 36-37 sem.)</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold" colSpan={3}>15 000 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dojo */}
          <div className="overflow-x-auto mt-4">
            <h3 className="font-semibold text-slate-900 mb-3">Dojo</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary-50">
                  <th className="border border-slate-200 px-4 py-2 text-left">Duree</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">Chartrettois</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">CAPF / Associations</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">Exterieurs</th>
                  <th className="border border-slate-200 px-4 py-2 text-center">Caution</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-2">Heure</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">51 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">51 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">102 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">510 EUR</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-2">Forfait annuel (36-37 sem. scolaires)</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold" colSpan={2}>1 020 EUR</td>
                  <td className="border border-slate-200 px-4 py-2 text-center">-</td>
                  <td className="border border-slate-200 px-4 py-2 text-center font-semibold">510 EUR</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CAPACITES D'ACCUEIL */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          Capacites d'accueil du complexe sportif
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary-50">
                <th className="border border-slate-200 px-4 py-2 text-left">Niveau</th>
                <th className="border border-slate-200 px-4 py-2 text-left">Destination</th>
                <th className="border border-slate-200 px-4 py-2 text-center">Superficie/places</th>
                <th className="border border-slate-200 px-4 py-2 text-center">Public</th>
                <th className="border border-slate-200 px-4 py-2 text-center">Total cumul</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-4 py-2">Mezzanine</td>
                <td className="border border-slate-200 px-4 py-2">Gradins</td>
                <td className="border border-slate-200 px-4 py-2 text-center">210 places</td>
                <td className="border border-slate-200 px-4 py-2 text-center">210</td>
                <td className="border border-slate-200 px-4 py-2 text-center">210</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-200 px-4 py-2" rowSpan={2}>RDC</td>
                <td className="border border-slate-200 px-4 py-2">Dojo - petite salle</td>
                <td className="border border-slate-200 px-4 py-2 text-center">253 m2</td>
                <td className="border border-slate-200 px-4 py-2 text-center">63</td>
                <td className="border border-slate-200 px-4 py-2 text-center">273</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-4 py-2">Grande salle</td>
                <td className="border border-slate-200 px-4 py-2 text-center">1 034 m2</td>
                <td className="border border-slate-200 px-4 py-2 text-center">130</td>
                <td className="border border-slate-200 px-4 py-2 text-center">493</td>
              </tr>
              <tr className="bg-primary-50 font-bold">
                <td className="border border-slate-200 px-4 py-2" colSpan={3}>TOTAL</td>
                <td className="border border-slate-200 px-4 py-2 text-center">431</td>
                <td className="border border-slate-200 px-4 py-2 text-center">937</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500 italic">
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
  );
}

/* =========================================================================
   RÈGLEMENT 2 — SALLES MUNICIPALES (ESPACE CULTUREL RENÉE WAGNER / VERGERS)
   ========================================================================= */
function ReglementSalles() {
  return (
    <div className="space-y-6">
      <div className="bg-accent-50 rounded-xl p-4 border border-accent-100 text-sm text-accent-800 font-medium">
        Salles municipales — Espace Culturel Renee Wagner &amp; Les Vergers
      </div>

      {/* I - DISPOSITIONS GENERALES */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          I - Dispositions generales
        </h2>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 1er - Objet et definition</h3>
            <p>
              Le present reglement determine les conditions dans lesquelles les salles municipales de la ville
              de Chartrettes, susceptibles d'etre louees, peuvent etre utilisees par les usagers qui en
              sollicitent la mise a disposition.
            </p>
            <p className="mt-2">
              De maniere generale, les salles municipales sont utilisees <strong>prioritairement</strong> par les services
              communaux ou les activites d'interet general organisees par les associations locales
              Chartrettoises : activites d'interet general de nature culturelle, sportive ou recreative et autres
              (bals, fetes, festivals, enseignements artistiques, etc.).
            </p>
            <p className="mt-2">
              Les associations Chartrettoises, c'est-a-dire dont le siege social est situe a Chartrettes et
              possedant un lien etroit avec la politique culturelle, artistique et recreative de la ville, peuvent
              beneficier des salles municipales a titre gratuit dans les conditions definies dans les conventions
              de mise a disposition annuels pour une activite reguliere ou une utilisation particuliere liee a une
              reunion ou une manifestation indiquee dans la convention annuelle.
            </p>
            <p className="mt-2">
              La mise a disposition de salles, en dehors des activites habituelles ou indiquees dans les
              conventions annuelles des associations locales Chartrettoises, sont definies par une convention
              specifique prevue a cet effet.
            </p>
          </div>
        </div>
      </section>

      {/* II - UTILISATION ET MODALITES */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          II - Utilisation et modalites
        </h2>
        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 2 - Principe de la mise a disposition</h3>
            <p>
              Les utilisateurs des salles louees ou mise a disposition a titre gratuit doivent respecter les
              horaires et les conditions d'utilisation des equipements tels qu'ils sont definis dans le present
              reglement et dans les conventions d'occupation (convention de mise a disposition a titre
              onereux ou gratuit entre la ville de Chartrettes et l'utilisateur).
            </p>
            <p className="mt-2">
              Les associations exterieures peuvent demander la location de certaines salles, selon leur
              disponibilite, pour des activites ponctuelles. La mise a disposition se fera a titre onereux et sous
              la responsabilite du president.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              Article 3 - Modalites de reservation et annulation
            </h3>
            <p>
              Les reservations des salles peuvent etre effectuees via le logiciel de reservation des salles, au
              plus tot dix (10) jours avant la date d'utilisation souhaitee. Toutefois, un delai minimum d'un
              mois est obligatoire pour toute reservation liee a un evenement necessitant une preparation de
              materiel et/ou l'intervention des services municipaux, afin de permettre l'organisation
              technique et logistique correspondante.
            </p>
            <p className="mt-2">
              Les demandes seront etudiees en fonction des disponibilites de la salle et de la nature de la
              manifestation envisagee.
            </p>
            <p className="mt-2">
              Toute demande de reservation pourra etre annulee seulement si intervenue <strong>15 jours</strong> a l'avance
              par rapport a la date de reservation effectuee. En cas de non-respect de ce delai d'annulation, le
              montant correspondant au tarif de reservation est du a la ville de Chartrettes.
            </p>
            <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="mb-2">
                    La ville de Chartrettes se reserve le droit d'annuler a tout moment une reservation de salle
                    (qu'elle soit mise a disposition a titre gratuit ou onereux), en cas de circonstances
                    particulieres telles que a titre d'exemple :
                  </p>
                  <ul className="space-y-1">
                    {[
                      'L\'organisation de manifestations d\'interet general ou communales',
                      'Ceremonies officielles',
                      'Motif d\'ordre public',
                      'Organisation de reunions publiques',
                      'Elections, campagnes electorales',
                      'Cas de force majeure',
                      'Evenements ou obligations imprevues au moment de la reservation',
                      'Travaux importants a realiser',
                      'Plan d\'hebergement d\'urgence',
                      'Menace de danger des batiments',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-1 font-bold">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Dans ces cas la caution ainsi que le montant verse pour la location sera restitue
                    integralement. Aucune indemnisation ou dedommagement ne pourra etre reclame aupres de la
                    ville de Chartrettes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 4 - Mise a disposition de salles ou materiels supplementaires et conditions de restitution</h3>
            <p>
              Afin de beneficier de la mise a disposition de materiels supplementaires pour l'organisation
              d'evenement, l'association ou l'utilisateur doit remplir la fiche technique correspondante trois
              mois avant la manifestation. Les reservations seront traitees par ordre d'arrivee en fonction
              des disponibilites.
            </p>
            <p className="mt-2">
              En cas de delais plus courts, la mise a disposition dependra de la disponibilite du materiel.
            </p>
            <p className="mt-2">
              Afin de garantir la mise a disposition du materiel pour l'ensemble du tissu associatif de
              Chartrettes, l'association s'engage a respecter les delais de restitution du materiel
              supplementaire alloue. Par ailleurs les materiels pretes devront etre rendus dans leur etat
              d'origine, propres et secs.
            </p>
            <p className="mt-2">
              La collectivite se reserve le droit de ne plus mettre a disposition le materiel si l'association ne
              respecte pas ces conditions de restitution.
            </p>
          </div>
        </div>
      </section>

      {/* III - SECURITE, HYGIENE, TRANQUILLITE */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          III - Dispositions relatives a la securite, a l'hygiene et a la tranquillite publique
        </h2>
        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 4 - Utilisation d'une salle municipale</h3>
            <p>
              L'utilisateur veillera a laisser les lieux dans l'etat ou il les a trouves, ainsi qu'a respecter le
              materiel present.
            </p>
            <p className="mt-2">
              En cas de probleme ou de dysfonctionnement constates, il doit en informer immediatement
              la mairie : <span className="font-medium">mairie@mairie-chartrettes.fr</span>
            </p>
            <div className="mt-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-600" />
                <span>En cas de probleme technique, une <strong>ASTREINTE TECHNIQUE</strong> est prevue Tel : <strong>06 23 26 95 99</strong></span>
              </div>
            </div>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-2">L'utilisateur (mise a disposition gratuite ou a titre onereux) doit respecter et faire respecter la legislation en vigueur concernant les etablissements recevant du public, ainsi que les regles d'hygiene et securite.</p>
            <p className="font-medium text-slate-900 mb-2">L'utilisateur devra :</p>
            <ul className="space-y-2 ml-2">
              {[
                'Maintenir les issues de degagements et de secours libres de tout encombrement',
                'Deverrouiller l\'ensemble des sorties des qu\'il y a presence du public',
                'Respecter la jauge de capacite d\'accueil prevue pour la salle',
                'Respecter les dispositions contenues dans le decret n°98-1143 du 15 decembre 1998 relatif aux etablissements ou locaux recevant du public et diffusant des musiques amplifiees',
                'L\'utilisation de blocs porte est formellement a proscrire, sauf lors des transferts de materiels',
                'Aucune porte de secours destinee a limiter la propagation du feu ne peut etre maintenue ouverte durant les activites',
                'Respecter les dispositions contenues dans la loi n°91-32 du 10 janvier 1991 relative a la lutte contre le tabagisme et l\'alcoolisme et la loi n°70-1320 du 31 decembre 1970 en matiere d\'usage de stupefiants',
                'Respecter et faire respecter les eventuels protocoles sanitaires imposes a son activite sur la periode de la mise a disposition',
                'Reperer les emplacements des dispositifs d\'alarme et des moyens d\'extinction d\'incendie, ainsi que les issues de secours',
                'Aucun materiel de cuisson ne devra etre introduit dans les salles municipales (four, barbecue, bouteille de gaz)',
                'Veiller a eteindre toutes les lumieres a la fin de l\'occupation',
                'Veiller a ce que chaque point d\'eau soit bien ferme avant de quitter les lieux',
                'Veiller a stocker ses dechets dans des sacs etanches et solides afin de ne pas souiller les containers',
                'Effectuer le tri des dechets',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-600 mt-1 font-bold">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-2">Par ailleurs, il est formellement interdit :</p>
            <ul className="space-y-2 ml-2">
              {[
                'De proceder a une quelconque modification des lieux',
                'D\'utiliser les locaux a des fins non conformes a l\'autorisation d\'occupation',
                'D\'apporter des decorations sur les murs (planter des clous ou de percer quelques endroits que ce soit de la salle et de ses dependances, ni punaise, ni ruban adhesif sur la peinture)',
                'D\'introduire des animaux dans la salle, quels qu\'ils soient, meme tenus en laisse (sauf chien guide cf. Loi du 11 fevrier 2005) ou autorisation municipale',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 font-bold">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Les objets apportes eventuellement par l'utilisateur devront etre retires de la salle a la fin de
              la periode de location.
            </p>
          </div>

          <div className="p-4 bg-accent-50 rounded-xl border border-accent-100">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-accent-600" />
              Respect de l'environnement
            </h3>
            <p>
              L'utilisateur doit faire preuve d'un comportement citoyen en matiere de respect de
              l'environnement : utilisation raisonnee de l'eclairage, du chauffage et de l'eau.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">En cas de sinistre, l'utilisateur doit :</h3>
            <ul className="space-y-2 ml-2">
              {[
                'Prendre toutes les mesures necessaires pour eviter la panique',
                'Assurer la securite des personnes',
                'Ouvrir les portes de secours',
                'Alerter le plus rapidement possible les pompiers (18) ou 112',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 font-bold">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 5 - Maintien de l'ordre</h3>
            <p>
              L'utilisateur devra prendre toutes les precautions pour ne pas troubler la tranquillite du
              voisinage. Il devra respecter la tranquillite et le repos des voisins sous peine de contravention
              (art. L 2212-2 du Code General des Collectivites Territoriales).
            </p>
            <p className="mt-2">Le stationnement des vehicules ne devra pas gener la circulation.</p>
            <p className="mt-2">
              Tout acte de violence et d'abus d'alcool entrainant un etat d'ebriete caracterisee fera l'objet
              des sanctions prevues ci-dessous a l'article 15.
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-600" />
              Article 6 - Restauration
            </h3>
            <p>
              Certaines salles peuvent accueillir de la restauration. Elles ne sont pas amenagees pour
              confectionner des repas (office de rechauffe). Seule la formule "traiteur" est applicable. Le frigo,
              four et appareils utilises devront etre nettoyes par l'utilisateur.
            </p>
            <p className="mt-2">
              Dans la salle TINO PETRUZZI il est formellement INTERDIT d'introduire toute nourriture ou
              d'organiser des buffets debout. Exclusivement des repas servis a table seront admis, apres en
              avoir informe la ville de Chartrettes.
            </p>
            <p className="mt-2">
              L'utilisateur se declare responsable de l'application de la reglementation relative a l'hygiene des
              denrees alimentaires.
            </p>
          </div>
        </div>
      </section>

      {/* RANGEMENT / ACCES / ETAT DES LIEUX */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          Rangement, acces et etat des lieux
        </h2>
        <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 7 - Rangement et nettoyage</h3>
            <p>
              Le rangement de la salle est a la charge de l'utilisateur. Les locaux doivent etre rendus propres,
              ranges et en etat. Le mobilier present dans la salle doit etre rendu en bon etat de
              fonctionnement et remis imperativement en place.
            </p>
            <p className="mt-2">Les toilettes doivent etre rendues propres et dans le respect des conditions d'hygiene. En cas de :</p>
            <ul className="space-y-1 ml-2 mt-2">
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-1 font-bold">-</span>
                <span>Nettoyage non effectue ou manifestement neglige</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-1 font-bold">-</span>
                <span>De materiel manquant ou deteriore</span>
              </li>
            </ul>
            <p className="mt-2">
              ...les frais correspondants seront a la charge des utilisateurs, auxquels la mairie de Chartrettes
              adressera une facture.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-600" />
              Article 8 - Acces a la salle
            </h3>
            <p>
              L'acces aux salles est regi par un dispositif de cles programmables. Ce dispositif permet
              d'attribuer l'ensemble des acces necessaires a la pratique d'une activite. Une seule cle est
              necessaire pour permettre l'acces a l'ensemble des salles qui sont attribuees.
            </p>
            <p className="mt-2">
              Chaque cle est nominative. Chaque personne detentrice d'une cle est responsable de son
              utilisation.
            </p>
            <div className="mt-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
              <p className="font-semibold text-primary-700">
                Une caution de 54 EUR par cle sera demandee par cheque a l'ordre du tresor Public et encaissee.
              </p>
            </div>
            <p className="mt-2">
              En cas de perte, l'utilisateur doit le signaler immediatement a l'animateur culturel, de la vie
              associative et sportive ou aux services municipaux de la mairie de Chartrettes afin de pouvoir
              proceder a sa desactivation. Toute perte entrainera la remise d'un nouveau cheque de caution.
            </p>

            <h4 className="font-semibold text-slate-900 mt-4 mb-2">Programmation :</h4>
            <p className="font-medium text-slate-800">Pour les programmations annuelles</p>
            <p className="mt-1">
              Ces cles sont programmees en debut d'annee scolaire pour les activites hebdomadaires. Elles
              sont programmees en fonction de la plage horaire de l'activite concernee et donnent acces au
              local mis a disposition pour ladite activite (avec 1/4 d'heure de battement avant et apres le debut
              et la fin de l'activite de l'usager). Chaque detenteur doit se rendre a la tour de chargement situee
              a cote de la mairie au moins une fois par mois.
            </p>
            <p className="font-medium text-slate-800 mt-3">Pour les programmations ponctuelles</p>
            <p className="mt-1">
              En dehors des demandes hebdomadaires, chaque demande devra etre effectuee 10 jours a
              l'avance. En dehors de ces delais, les demandes seront honorees en fonction des disponibilites du
              service. Il est donc imperatif d'anticiper vos demandes ponctuelles afin de garantir leur
              faisabilite. Chaque programmation sera effective pour la duree d'utilisation.
            </p>
            <p className="mt-2">
              L'utilisateur communiquera au moment de la reservation a la Mairie de Chartrettes le nom de la
              personne ayant acces a la salle pour l'attribution de la cle. La cle devra etre restituee a la Mairie
              de Chartrettes a la fin de la mise a disposition de la salle, soit :
            </p>
            <ul className="space-y-1 ml-2 mt-2">
              <li className="flex items-start gap-2">
                <span className="text-primary-600 mt-1 font-bold">-</span>
                <span><strong>Pour les locations ou mise a disposition du week-end</strong> la cle sera remise imperativement par l'utilisateur des le lundi au moment de l'etat des lieux a l'agent municipal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 mt-1 font-bold">-</span>
                <span><strong>Pour les reservations qui se deroulent en semaine</strong>, la cle devra etre restituee des la verification de l'etat des lieux</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 9 - Etat des lieux</h3>
            <p>
              L'etat des lieux des salles se font aux horaires definis par les services de la mairie. L'etat des
              lieux contradictoire de la salle est effectue en presence de l'utilisateur beneficiaire. En
              l'absence, le reglement s'applique dans toute sa rigueur, sur la seule foi des observations de
              l'agent municipal.
            </p>
            <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="font-medium text-slate-900">
                A defaut d'etat des lieux dresse, les locaux loues ou mis a disposition sont reputes en bon etat
                et doivent etre restitues comme tels, toute degradation etant a la charge de l'utilisateur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* IV - ASSURANCES - RESPONSABILITES */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          IV - Assurances et responsabilites
        </h2>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 10 - Responsabilites</h3>
            <p className="font-medium text-slate-800">L'utilisateur est responsable :</p>
            <ul className="space-y-1 ml-2 mt-2">
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-1 font-bold">-</span>
                <span>Des degradations qui pourraient etre causees a la salle et/ou au materiel present</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-1 font-bold">-</span>
                <span>Des dommages causes a toute personne du fait de son activite</span>
              </li>
            </ul>
            <p className="mt-3 font-medium text-slate-800">La municipalite est dechargee de toute responsabilite :</p>
            <ul className="space-y-1 ml-2 mt-2">
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-1 font-bold">-</span>
                <span>Pour les accidents corporels directement lies aux activites et pouvant intervenir a l'occasion de l'utilisation de la salle</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-1 font-bold">-</span>
                <span>Pour les dommages subis par les objets et equipements eventuellement entreposes par les utilisateurs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-1 font-bold">-</span>
                <span>Elle ne saurait pas plus etre tenue pour responsable des vols commis a l'occasion de ces activites</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 11 - Assurances</h3>
            <p>
              L'utilisateur est responsable des deteriorations causees aux installations et des accidents et
              blessures occasionnels a toute personne du fait de leur activite, et de ce fait sont tenus de
              contracter une assurance pour tous les cas et dans toutes les mesures ou leur responsabilite est
              susceptible de se trouver engagee.
            </p>
            <p className="mt-2">
              Ils devront notamment se faire garantir, aupres d'une compagnie d'assurance, l'ensemble des
              risques resultant de leur activite. Ils devront pouvoir justifier de cette garantie a tout moment.
            </p>
            <p className="mt-2">
              Une attestation d'assurance devra etre fournie aux services de la Mairie en amont de
              l'occupation de la salle, c'est-a-dire au moment de la reservation selon les conditions precisees
              dans la convention de mise a disposition a titre onereux.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 12 - Autres obligations</h3>
            <p>L'utilisateur devra payer tout impot ou taxe lui incombant.</p>
            <p className="mt-2">
              L'organisateur devra se conformer aux prescriptions et reglements en vigueur, notamment en
              ce qui concerne la securite, la salubrite, le droit du travail, la concurrence et la consommation,
              de sorte que la commune ne puisse faire l'objet d'aucune poursuite.
            </p>
            <p className="mt-2">
              S'il y a lieu, l'utilisateur s'acquitte de ses obligations vis-a-vis de l'administration fiscale, de
              l'URSSAF, de la SACEM et de maniere generale de tout organisme afferent a son activite.
            </p>
            <p className="mt-2">
              En cas d'ouverture d'un debit de boissons temporaire, le beneficiaire doit solliciter une demande
              d'autorisation aupres de la Ville de Chartrettes.
            </p>
          </div>
        </div>
      </section>

      {/* V - TARIFS DE LOCATION */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          V - Redevance &amp; tarifs de location
        </h2>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 13 - Tarifs de location</h3>
            <p>Les tarifs de location des salles ont ete fixes par deliberations en conseil municipal.</p>
            <p className="mt-2">
              Selon la tarification suivante, la commune se reserve le droit dans le cadre de la signature d'une
              convention de preter les locaux a titre gracieux ou d'appliquer un tarif preferentiel de
              <strong> 60 euros par jour</strong> et/ou <strong>300 euros la semaine</strong> pour l'espace des Vergers.
            </p>
          </div>

          {/* Espace Culturel Renée Wagner */}
          <div className="overflow-x-auto">
            <h3 className="font-semibold text-slate-900 mb-3">Espace Culturel Renee Wagner</h3>
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-primary-50">
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-left">Salle</th>
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-center">Tarif journee (&gt; 4 h)</th>
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-center">Tarif demi-journee (&lt; 4 h)</th>
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-center">Tarif horaire (activites regulieres)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2 font-medium">Grande salle Tino Petruzzi</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 574 €<br/>CAPF (villes et associations) : 645 €<br/>Exterieurs : 1 288 €<br/>Caution : 1 530 €</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 301 €<br/>CAPF (villes et associations) : 322 €<br/>Exterieurs : 645 €<br/>Caution : 1 530 €</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 86 €<br/>CAPF (villes et associations) : 97 €<br/>Exterieurs : 183 €<br/>Caution : 1 530 €</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-2 sm:px-3 py-2 font-medium">Foyer</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 107 €<br/>CAPF (villes et associations) : 105 €<br/>Exterieurs : 214 €<br/>Caution : 510 €</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 53 €<br/>CAPF (villes et associations) : 53 €<br/>Exterieurs : 107 €<br/>Caution : 510 €</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 16 €<br/>CAPF (villes et associations) : 16 €<br/>Exterieurs : 32 €<br/>Caution : 510 €</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2 font-medium">Pitti Pa ou Martha Graham</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 107 €<br/>CAPF (villes et associations) : 107 €<br/>Exterieurs : 214 €<br/>Caution : 510 €</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 53 €<br/>CAPF (villes et associations) : 53 €<br/>Exterieurs : 107 €<br/>Caution : 510 €</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 16 €<br/>CAPF (villes et associations) : 16 €<br/>Exterieurs : 32 €<br/>Caution : 510 €</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Espace des Vergers */}
          <div className="overflow-x-auto mt-4">
            <h3 className="font-semibold text-slate-900 mb-3">Espace des Vergers</h3>
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-accent-50">
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-left">Salle</th>
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-center">Tarif journee (&gt; 4 h)</th>
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-center">Tarif demi-journee (&lt; 4 h)</th>
                  <th className="border border-slate-200 px-2 sm:px-3 py-2 text-center">Tarif horaire (activites regulieres)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2 font-medium">Tennis libre non adherents au club de tennis</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 80 €<br/>CAPF et exterieurs : 143 €</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">-</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">-</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-2 sm:px-3 py-2 font-medium">Salle "Les Vergers"</td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 107 €<br/>CAPF (villes et associations) : 107 €<br/>Exterieurs : 214 €<br/>Caution : 510 €<br/><span className="italic">Non Chartrettois en location reguliere : forfait 102 €/date</span></td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 53 €<br/>CAPF (villes et associations) : 53 €<br/>Exterieurs : 107 €<br/>Caution : 510 €<br/><span className="italic">Non Chartrettois en location reguliere : forfait 51 €/date</span></td>
                  <td className="border border-slate-200 px-2 sm:px-3 py-2">Chartrettois : 16 €<br/>CAPF (villes et associations) : 16 €<br/>Exterieurs : 32 €<br/>Caution : 510 €</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
            <p className="font-medium text-slate-900">Prestation menage suite a l'utilisation ou location de salles municipales</p>
            <p className="mt-1">Forfait a l'heure : <strong>33 euros</strong></p>
          </div>

          <p className="text-xs text-slate-500 italic">
            Tarification pour une location le week-end : 2 jours de location -10% pour toute salle de l'Espace
            culturel et les Vergers.
          </p>
        </div>
      </section>

      {/* CAUTION */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          Article 14 - Caution
        </h2>
        <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <p>
            La caution sera versee avant etat des lieux d'entree sous forme de cheque a l'ordre du Tresor
            Public contre remise d'un recepisse.
          </p>
          <p>Un etat des lieux en amont et a posteriori est effectue.</p>
          <p>Si l'etat des lieux contradictoire n'est pas possible, le rapport de l'agent municipal sur l'etat de la salle fera foi.</p>
          <ul className="space-y-2 ml-2">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-1 font-bold">-</span>
              <span><strong>La caution sera restituee a l'utilisateur des le lundi matin</strong> apres verification de l'etat des lieux pour les locations du week-end</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-1 font-bold">-</span>
              <span><strong>La caution sera restituee a l'utilisateur</strong> apres verification de l'etat des lieux pour les locations en semaine</span>
            </li>
          </ul>
        </div>
      </section>

      {/* VI - SANCTIONS - DISPOSITIONS FINALES */}
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-xl font-bold text-primary-700 mb-4 border-b border-primary-100 pb-3">
          VI - Sanctions et dispositions finales
        </h2>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 15 - Sanctions</h3>
            <p>
              L'autorisation d'occupation pourra etre retiree a tout moment en cas d'infraction au present
              reglement et entraine ipso facto sa caducite.
            </p>
            <p className="mt-2">
              Dans ce cas la caution ainsi que le montant verse en cas de mise a disposition a titre onereux ne
              seront pas restituees.
            </p>
            <p className="mt-2">
              En outre, la mairie se reserve le droit de refuser ulterieurement la location ou la mise a
              disposition de la salle a l'utilisateur fautif.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Article 16 - Execution du reglement</h3>
            <p>
              La mairie de Chartrettes se reserve le droit de modifier ou completer le present reglement des
              qu'elle le jugera necessaire. Un exemplaire de ce reglement sera affiche dans chacune des salles
              concernees.
            </p>
          </div>
        </div>
      </section>

      {/* Acceptation */}
      <section className="header-gradient rounded-2xl shadow-xl p-6 sm:p-8 text-white">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Article 17 - Acceptation du reglement / litiges
        </h2>
        <p className="text-white/80 text-sm leading-relaxed">
          Un exemplaire du present reglement est remis a chaque utilisateur des salles communales qui
          s'engage a le respecter sans la moindre restriction. Toutes infractions au present reglement sont
          susceptibles d'entrainer les sanctions indiquees a l'art. 15 et peuvent etre poursuivies
          conformement aux lois et reglements en vigueur.
        </p>
        <p className="text-white/80 text-sm leading-relaxed mt-2">
          Toutes contestations concernant l'utilisation des salles municipales devront etre soumises a la
          Ville. En cas de non-resolution amiable, le litige pourra etre porte devant les juridictions
          competentes par les parties interessees.
        </p>
      </section>
    </div>
  );
}
