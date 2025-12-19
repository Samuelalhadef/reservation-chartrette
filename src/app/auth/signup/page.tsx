'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface Association {
  id: string;
  name: string;
  description: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'association' | 'particulier' | ''>('');
  const [associations, setAssociations] = useState<Association[]>([]);
  const [showNewAssociationForm, setShowNewAssociationForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    associationId: '',
    address: '', // Adresse pour les particuliers
    isChartrettesResident: false, // Indique si l'utilisateur habite à Chartrettes
    newAssociation: {
      name: '',
      description: '',
      address: '',
      socialPurpose: '',
      presidentAddress: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  useEffect(() => {
    fetchAssociations();
  }, []);

  const fetchAssociations = async () => {
    try {
      const res = await fetch('/api/associations?status=active');
      const data = await res.json();
      setAssociations(data.associations || []);
    } catch (error) {
      console.error('Error fetching associations:', error);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('Tous les champs sont requis');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Format d\'email invalide');
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation pour les associations
    if (userType === 'association') {
      if (!showNewAssociationForm && !formData.associationId) {
        setError('Veuillez sélectionner une association');
        return;
      }

      if (showNewAssociationForm) {
        if (!formData.newAssociation.name || !formData.newAssociation.description) {
          setError('Le nom et la description de l\'association sont requis');
          return;
        }
      }
    }

    // Validation pour les particuliers
    if (userType === 'particulier') {
      if (!formData.address || formData.address.trim() === '') {
        setError('L\'adresse est requise pour les particuliers');
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          userType: userType,
          associationId: userType === 'association' && !showNewAssociationForm && formData.associationId ? formData.associationId : null,
          newAssociation: userType === 'association' && showNewAssociationForm ? formData.newAssociation : null,
          address: userType === 'particulier' && formData.address ? formData.address : null,
          isChartrettesResident: userType === 'particulier' ? formData.isChartrettesResident : false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      // If verification is required, go to step 3
      if (data.requiresVerification) {
        setUserId(data.user.id);
        setUserEmail(formData.email);
        setStep(3);
      } else {
        // Redirect to signin with success message
        router.push('/auth/signin?message=inscription-reussie');
      }
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Veuillez entrer le code de vérification à 6 chiffres');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          code: verificationCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Code de vérification invalide');
        return;
      }

      // Redirect to signin with success message
      router.push('/auth/signin?message=email-verifie');
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Inscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Créez votre compte Réservation Chartrettes
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              3
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
          /* Step 1: Account info */
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <Input
              label="Nom complet"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jean Dupont"
            />

            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jean.dupont@example.com"
            />

            <Input
              label="Mot de passe"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
            />

            <Button type="submit" className="w-full">
              Continuer
            </Button>
          </form>
        ) : step === 2 ? (
          /* Step 2: User Type & Association */
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            {/* User Type Selection */}
            {!userType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                  Vous êtes :
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setUserType('association')}
                    className="p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Association</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Je représente une association</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('particulier')}
                    className="p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Particulier</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Je réserve à titre personnel</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Association Selection - Only shown if userType is 'association' */}
            {userType === 'association' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sélectionnez votre association
                  </label>
                  <button
                    type="button"
                    onClick={() => setUserType('')}
                    className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                  >
                    Changer de type
                  </button>
                </div>

                {!showNewAssociationForm ? (
                <>
                  <select
                    value={formData.associationId}
                    onChange={(e) => setFormData({ ...formData, associationId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    required={!showNewAssociationForm}
                  >
                    <option value="">-- Choisir une association --</option>
                    {associations.map((assoc) => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowNewAssociationForm(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Mon association n'est pas dans la liste
                  </button>
                </>
              ) : (
                <div className="space-y-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Demande d'ajout d'association
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewAssociationForm(false)}
                      className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                    >
                      Annuler
                    </button>
                  </div>

                  <Input
                    label="Nom de l'association"
                    type="text"
                    required={showNewAssociationForm}
                    value={formData.newAssociation.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        newAssociation: { ...formData.newAssociation, name: e.target.value },
                      })
                    }
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      required={showNewAssociationForm}
                      value={formData.newAssociation.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newAssociation: { ...formData.newAssociation, description: e.target.value },
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <Input
                    label="Siège social"
                    type="text"
                    value={formData.newAssociation.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        newAssociation: { ...formData.newAssociation, address: e.target.value },
                      })
                    }
                    placeholder="Adresse complète du siège social"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Objet social
                    </label>
                    <textarea
                      value={formData.newAssociation.socialPurpose}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newAssociation: { ...formData.newAssociation, socialPurpose: e.target.value },
                        })
                      }
                      rows={2}
                      placeholder="L'objet principal de l'association"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <Input
                    label="Nom du Président"
                    type="text"
                    value={formData.newAssociation.contactName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        newAssociation: { ...formData.newAssociation, contactName: e.target.value },
                      })
                    }
                  />

                  <Input
                    label="Adresse personnelle du Président"
                    type="text"
                    value={formData.newAssociation.presidentAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        newAssociation: { ...formData.newAssociation, presidentAddress: e.target.value },
                      })
                    }
                    placeholder="Adresse de résidence du président"
                  />

                  <Input
                    label="Email de contact"
                    type="email"
                    value={formData.newAssociation.contactEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        newAssociation: { ...formData.newAssociation, contactEmail: e.target.value },
                      })
                    }
                  />

                  <Input
                    label="Téléphone (optionnel)"
                    type="tel"
                    value={formData.newAssociation.contactPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        newAssociation: { ...formData.newAssociation, contactPhone: e.target.value },
                      })
                    }
                  />

                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Votre demande sera examinée par un administrateur
                  </p>
                </div>
              )}
              </div>
            )}

            {/* Particulier Confirmation - Only shown if userType is 'particulier' */}
            {userType === 'particulier' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Compte particulier
                  </label>
                  <button
                    type="button"
                    onClick={() => setUserType('')}
                    className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                  >
                    Changer de type
                  </button>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                        Vous créez un compte en tant que particulier
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Vous pourrez réserver des salles pour vos événements personnels après validation de votre demande par les administrateurs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adresse complète *
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => {
                      const address = e.target.value;
                      setFormData({
                        ...formData,
                        address,
                        // Détection automatique si l'adresse contient "Chartrettes"
                        isChartrettesResident: address.toLowerCase().includes('chartrettes'),
                      });
                    }}
                    rows={3}
                    placeholder="Ex: 12 Rue de la Mairie, 77590 Chartrettes"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cette adresse sera utilisée pour vérifier votre résidence
                  </p>
                </div>

                {/* Indicateur de résidence à Chartrettes */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isChartrettesResident}
                      onChange={(e) => setFormData({ ...formData, isChartrettesResident: e.target.checked })}
                      className="mt-0.5 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                        J'habite à Chartrettes
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        Les résidents de Chartrettes bénéficient d'une priorité pour les réservations
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading || !userType}
                className="flex-1"
              >
                S'inscrire
              </Button>
            </div>
          </form>
        ) : (
          /* Step 3: Email verification */
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Vérifiez votre email
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Un code de vérification a été envoyé à<br />
                <span className="font-semibold text-gray-900 dark:text-white">{userEmail}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                Code de vérification
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Entrez le code à 6 chiffres reçu par email
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                    Le code expire dans 15 minutes
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Vérifiez vos spams si vous ne recevez pas l'email
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full"
            >
              Vérifier et finaliser l'inscription
            </Button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Vous n'avez pas reçu le code ?{' '}
              <button
                type="button"
                onClick={() => setStep(2)}
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Retour
              </button>
            </p>
          </form>
        )}

        {step !== 3 && (
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Vous avez déjà un compte ?{' '}
            <Link
              href="/auth/signin"
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Se connecter
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
