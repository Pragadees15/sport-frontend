import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Plus, TrendingUp, Gift } from 'lucide-react';
import { UserTokens } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { PurchaseTokensModal } from './PurchaseTokensModal';
import { ReferralModal } from './ReferralModal';

interface TokenWalletProps {
  tokens: UserTokens;
}

export function TokenWallet({ tokens }: TokenWalletProps) {
  const { user } = useAuthStore();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-xl border border-white/20 min-w-[280px] sm:min-w-[320px]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl flex-shrink-0">
              <Coins className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg truncate">Token Wallet</h3>
              <p className="text-blue-100 text-xs sm:text-sm truncate">Your digital currency</p>
            </div>
          </div>
          <div className="flex space-x-1.5 sm:space-x-2 flex-shrink-0">
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all hover:scale-110"
              title="Buy Tokens"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowReferralModal(true)}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all hover:scale-110"
              title="Referral Program"
            >
              <Gift className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-blue-100 font-medium">Current Balance</span>
              <div className="flex items-center space-x-1">
                <Coins className="h-4 w-4" />
                <span className="text-xs text-blue-200">Tokens</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{tokens.balance.toLocaleString()}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/20 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center space-x-1 text-green-200 mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">Earned</span>
              </div>
              <div className="text-lg font-bold text-white">{tokens.totalEarned.toLocaleString()}</div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-3 text-center">
              <div className="text-red-200 text-xs font-medium mb-1">Spent</div>
              <div className="text-lg font-bold text-white">{tokens.totalSpent.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Tokens Modal */}
      {showPurchaseModal && (
        <PurchaseTokensModal
          onClose={() => setShowPurchaseModal(false)}
          userId={user?.id || ''}
        />
      )}

      {/* Referral Modal */}
      {showReferralModal && (
        <ReferralModal
          onClose={() => setShowReferralModal(false)}
          userId={user?.id || ''}
        />
      )}
    </>
  );
}