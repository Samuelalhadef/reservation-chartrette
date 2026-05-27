'use client';

import React, { useState } from 'react';
import { X, CreditCard, DollarSign, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { formatPrice } from '@/lib/pricing';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    totalPrice: number;
    depositAmount: number;
    paymentStatus: string | null;
    paymentMethod: string | null;
    paymentReference: string | null;
    paymentNotes: string | null;
    room?: { name: string };
    user?: { name: string };
  };
  onSuccess?: () => void;
}

const paymentMethods = [
  { value: 'cheque', label: 'Chèque' },
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'transfer', label: 'Virement bancaire' },
  { value: 'other', label: 'Autre' },
];

const paymentStatuses = [
  { value: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  { value: 'check_deposited', label: 'Chèque déposé', color: 'bg-primary-100 text-primary-800', icon: '📝' },
  { value: 'paid', label: 'Payé', color: 'bg-accent-100 text-accent-800', icon: '✓' },
  { value: 'refunded', label: 'Remboursé', color: 'bg-primary-100 text-primary-800', icon: '↩' },
];

export default function PaymentModal({
  isOpen,
  onClose,
  reservation,
  onSuccess,
}: PaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState(reservation.paymentStatus || 'pending');
  const [paymentMethod, setPaymentMethod] = useState(reservation.paymentMethod || '');
  const [paymentReference, setPaymentReference] = useState(reservation.paymentReference || '');
  const [paymentNotes, setPaymentNotes] = useState(reservation.paymentNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier la confirmation si le statut passe à "paid"
    if (paymentStatus === 'paid' && reservation.paymentStatus !== 'paid') {
      if (confirmationText.toLowerCase().trim() !== 'réservation bien payée') {
        alert('Veuillez écrire exactement "réservation bien payée" pour confirmer le paiement');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus,
          paymentMethod,
          paymentReference,
          paymentNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      alert('Paiement mis à jour avec succès');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la mise à jour du paiement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefund = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/payment/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refundNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du remboursement');
      }

      alert('Caution remboursée avec succès');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors du remboursement');
    } finally {
      setIsSubmitting(false);
      setShowRefundConfirm(false);
    }
  };

  const totalAmount = reservation.totalPrice + reservation.depositAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-primary-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-accent-600 to-accent-700 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-white" />
            <h2 className="text-2xl font-bold text-white">
              Gestion du paiement
            </h2>
          </div>
          {reservation.room && (
            <p className="text-accent-100 text-sm">
              {reservation.room.name} - {reservation.user?.name}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Résumé financier */}
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/20 p-5 rounded-xl mb-6 border-2 border-primary-200 dark:border-primary-700/60">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-700" />
              Résumé financier
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Prix de location</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatPrice(reservation.totalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Caution</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatPrice(reservation.depositAmount)}
                </span>
              </div>
              <div className="border-t-2 border-primary-200 dark:border-primary-700/60 pt-3">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-lg">Total</span>
                  <span className="font-bold text-primary-700 dark:text-accent-300 text-xl">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {showRefundConfirm ? (
            /* Confirmation de remboursement */
            <div className="bg-accent-50 dark:bg-accent-900/20 p-5 rounded-xl border-2 border-accent-200 dark:border-accent-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent-600" />
                Confirmer le remboursement de la caution
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Vous êtes sur le point de rembourser la caution de <strong>{formatPrice(reservation.depositAmount)}</strong>.
                Cette action ne peut pas être annulée.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Notes de remboursement (optionnel)
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="État des lieux, conditions du remboursement..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-primary-700 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:bg-primary-900/40 dark:text-white transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRefundConfirm(false)}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 dark:border-primary-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-primary-800 transition-colors font-semibold"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRefund}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Traitement...' : 'Confirmer le remboursement'}
                </button>
              </div>
            </div>
          ) : (
            /* Formulaire de paiement */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Statut du paiement */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                  Statut du paiement *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentStatuses.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setPaymentStatus(status.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        paymentStatus === status.value
                          ? 'border-accent-600 bg-accent-50 dark:bg-accent-900/30'
                          : 'border-slate-200 dark:border-primary-700/60 hover:border-accent-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{status.icon}</span>
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {status.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Méthode de paiement */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Méthode de paiement
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-primary-700 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white dark:bg-primary-900/40 text-slate-900 dark:text-white transition-colors"
                >
                  <option value="">Sélectionnez une méthode</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Référence de paiement */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Référence de paiement
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="N° de chèque, transaction, etc."
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-primary-700 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:bg-primary-900/40 dark:text-white transition-colors"
                />
              </div>

              {/* Notes de paiement */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <FileText className="w-4 h-4 text-accent-600" />
                  Notes de paiement
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Informations complémentaires sur le paiement..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-300 dark:border-primary-700 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:bg-primary-900/40 dark:text-white transition-colors resize-none"
                />
              </div>

              {/* Confirmation de paiement */}
              {paymentStatus === 'paid' && reservation.paymentStatus !== 'paid' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border-2 border-red-300 dark:border-red-700">
                  <div className="flex items-start gap-3 mb-3">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-900 dark:text-red-100 mb-1">
                        Confirmation de validation du paiement
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                        Pour valider que le paiement a bien été reçu, vous devez écrire exactement :
                      </p>
                      <p className="text-base font-bold text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-800/50 px-3 py-2 rounded">
                        réservation bien payée
                      </p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Tapez : réservation bien payée"
                    className="w-full px-4 py-3 border-2 border-red-300 dark:border-red-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:bg-primary-900/40 dark:text-white transition-colors"
                    required
                  />
                  {confirmationText && confirmationText.toLowerCase().trim() !== 'réservation bien payée' && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Le texte ne correspond pas exactement
                    </p>
                  )}
                  {confirmationText.toLowerCase().trim() === 'réservation bien payée' && (
                    <p className="text-xs text-accent-600 dark:text-accent-400 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmation valide
                    </p>
                  )}
                </div>
              )}

              {/* Bouton de remboursement */}
              {paymentStatus === 'paid' && reservation.depositAmount > 0 && (
                <div className="bg-accent-50 dark:bg-accent-900/20 p-4 rounded-xl border-2 border-accent-200 dark:border-accent-700">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                    Le paiement a été validé. Vous pouvez maintenant rembourser la caution après vérification de l'état des lieux.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRefundConfirm(true)}
                    className="w-full px-4 py-3 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Rembourser la caution
                  </button>
                </div>
              )}

              {/* Boutons de formulaire */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border-2 border-slate-300 dark:border-primary-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-primary-800 transition-colors font-semibold"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
