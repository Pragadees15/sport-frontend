import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Coins, CreditCard } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface PurchaseTokensModalProps {
  onClose: () => void;
  userId: string;
}

const tokenPackages = [
  { id: 'basic', tokens: 100, price: 4.99, bonus: 0, popular: false },
  { id: 'standard', tokens: 250, price: 9.99, bonus: 25, popular: false },
  { id: 'premium', tokens: 500, price: 19.99, bonus: 75, popular: true },
  { id: 'ultimate', tokens: 1000, price: 34.99, bonus: 200, popular: false },
];

export function PurchaseTokensModal({ onClose, userId }: PurchaseTokensModalProps) {
  const { purchaseTokens } = useAppStore();
  const [selectedPackage, setSelectedPackage] = useState(tokenPackages[2]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('demo');

  const handlePurchase = async () => {
    setIsPurchasing(true);
    
    try {
      await apiService.purchaseTokens({
        packageId: selectedPackage.id,
        paymentMethod: paymentMethod,
        stripePaymentIntentId: paymentMethod === 'stripe' ? 'pi_demo_123' : undefined
      });
      
      // Update local store
      const totalTokens = selectedPackage.tokens + selectedPackage.bonus;
      purchaseTokens(userId, totalTokens, selectedPackage.price);
      
      toast.success(`Successfully purchased ${totalTokens} tokens!`);
      
      // Trigger token update event
      window.dispatchEvent(new CustomEvent('tokensUpdated'));
      
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-lg">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Purchase Tokens</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-3 mb-6">
            {tokenPackages.map((pkg, index) => (
              <div
                key={index}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedPackage === pkg
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                } ${pkg.popular ? 'ring-2 ring-purple-200' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 left-4 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {pkg.tokens} Tokens
                        {pkg.bonus > 0 && (
                          <span className="text-green-600 text-sm ml-1">
                            +{pkg.bonus} Bonus
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total: {pkg.tokens + pkg.bonus} tokens
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${pkg.price}</p>
                    <p className="text-xs text-gray-500">
                      ${(pkg.price / (pkg.tokens + pkg.bonus)).toFixed(3)}/token
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">How to earn tokens:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Watch videos: +5 tokens</li>
              <li>• Like videos: +2 tokens</li>
              <li>• Refer friends: +50 tokens</li>
              <li>• Daily login: +10 tokens</li>
            </ul>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="demo"
                  checked={paymentMethod === 'demo'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Demo Payment</div>
                  <div className="text-sm text-gray-500">Simulated payment for testing</div>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Credit Card (Stripe)</div>
                  <div className="text-sm text-gray-500">Secure payment processing</div>
                </div>
              </label>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            loading={isPurchasing}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
            size="lg"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Purchase {selectedPackage.tokens + selectedPackage.bonus} Tokens for ${selectedPackage.price}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}