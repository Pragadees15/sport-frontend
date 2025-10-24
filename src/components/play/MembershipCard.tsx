import { motion } from 'framer-motion';
import React from 'react';
import { Star, Check, Coins } from 'lucide-react';
import { Membership } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import toast from 'react-hot-toast';

interface MembershipCardProps {
  membership: Membership;
  onPurchased?: () => void;
}

export function MembershipCard({ membership, onPurchased }: MembershipCardProps) {
  const { user } = useAuthStore();
  const { } = useAppStore();
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [hasThisMembership, setHasThisMembership] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      try {
        const res = await apiService.hasMembership(membership.id);
        if (mounted) setHasThisMembership(!!res?.hasMembership);
      } catch (_) {
        // ignore; UI will allow purchase and backend will validate
      }
    };
    load();
    return () => { mounted = false; };
  }, [user, membership.id]);

  const handlePurchase = async () => {
    if (!user) return;

    try {
      setIsPurchasing(true);
      await apiService.purchaseMembership({
        membershipId: membership.id,
        paymentMethod: 'tokens'
      });
      toast.success(`Successfully purchased ${membership.name} membership!`);
      setHasThisMembership(true);
      if (onPurchased) onPurchased();
    } catch (e: any) {
      const details = e?.errorData?.details ? ` (${e.errorData.details})` : '';
      toast.error((e?.message || e?.errorData?.error || 'Failed to process purchase.') + details);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-2xl font-bold">{membership.name}</h3>
          <Star className="h-7 w-7" />
        </div>
        <p className="text-purple-100 text-sm leading-relaxed">{membership.description}</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Coach Info */}
        {membership.coach && (
          <div className="flex items-center p-4 bg-gray-50 rounded-xl mb-6">
            <Avatar
              src={membership.coach.avatar_url || membership.coach.profileImage}
              alt={membership.coach.fullName || membership.coach.name || 'Coach'}
              name={membership.coach.fullName || membership.coach.name || 'Coach'}
              size="md"
              className="h-12 w-12 mr-4"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-bold text-gray-900 text-lg">{membership.coach.fullName || membership.coach.name || 'Coach'}</p>
                {membership.coach.isVerified && (
                  <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 capitalize font-medium">{membership.coach.sportsCategory?.replace('-', ' ') || 'Sports Coach'}</p>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="mb-6">
          <h4 className="font-bold text-gray-900 mb-4 text-lg">What's Included:</h4>
          <ul className="space-y-3">
            {(membership.benefits || (membership as any).features || []).map((benefit: string, index: number) => (
              <li key={index} className="flex items-center space-x-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 font-medium">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Duration */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-semibold">Duration:</span>
            <span className="font-bold text-gray-900 text-lg">{membership.duration} days</span>
          </div>
        </div>

        {/* Price and Purchase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
            <span className="text-purple-800 font-bold">Price:</span>
            <div className="flex items-center space-x-2 text-purple-800 font-bold text-xl">
              <Coins className="h-6 w-6" />
              <span>{membership.price}</span>
            </div>
          </div>

          {hasThisMembership ? (
            <div className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-lg">
              <Check className="h-5 w-5 mr-2" />
              Purchased
            </div>
          ) : (
            <Button
              onClick={handlePurchase}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg"
              size="lg"
              disabled={isPurchasing}
              loading={isPurchasing}
            >
              <>
                <Coins className="h-5 w-5 mr-2" />
                Purchase Membership
              </>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}