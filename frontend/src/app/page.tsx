'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

// Types for data coming from backend
interface Product {
  id: string;
  name: string;
  price: number;
  availableStock: number;
}

interface ActiveReservation {
  id: string;
  productId: string;
  expiresAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // 1. Fetch Products from Backend
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Refresh products in the background every 5 seconds to keep stock current
    const interval = setInterval(fetchProducts, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Reservation Countdown Logic
  useEffect(() => {
    if (!activeReservation) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expireTime = new Date(activeReservation.expiresAt).getTime();
      const difference = Math.floor((expireTime - now) / 1000);

      if (difference <= 0) {
        // Time's up!
        setActiveReservation(null);
        setTimeLeft(0);
        fetchProducts(); // Refresh products since stock is returned
        alert('Your reservation time has expired! Stock has been returned.');
      } else {
        setTimeLeft(difference);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeReservation]);

  // 3. When Reserve Button is Clicked
  const handleReserve = async (productId: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reservations`, {
        productId,
        quantity: 1,
      });

      setActiveReservation(response.data);
      fetchProducts(); // Stock decreased, update the screen immediately
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create reservation!');
    }
  };

  // 4. When Complete Payment Button is Clicked
  const handleCompletePayment = async () => {
    if (!activeReservation) return;

    try {
      await axios.patch(`${API_BASE_URL}/reservations/${activeReservation.id}/complete`);
      alert('Payment completed successfully! The product is yours.');
      setActiveReservation(null);
      fetchProducts();
    } catch (error: any) {
      alert('An error occurred while completing the payment.');
    }
  };

  // Helper function to format seconds to 04:59 format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-400">
            Stock-Locked Store
          </h1>

          {/* Active Reservation Timer */}
          {activeReservation && (
            <div className="bg-indigo-900/50 border border-indigo-500 rounded-lg p-3 flex items-center gap-4">
              <div>
                <p className="text-xs text-indigo-300">Your Reservation Time:</p>
                <p className="text-2xl font-mono font-bold text-indigo-200">
                  {formatTime(timeLeft)}
                </p>
              </div>
              <button
                onClick={handleCompletePayment}
                className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-md transition"
              >
                Complete Payment
              </button>
            </div>
          )}
        </header>

        {/* Product List */}
        {loading ? (
          <p className="text-slate-400">Loading products...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
                  <p className="text-2xl font-bold text-green-400 mb-4">
                    ${product.price}
                  </p>
                  <p className="text-sm text-slate-400 mb-6">
                    Available Stock:{' '}
                    <span
                      className={`font-bold ${product.availableStock > 0 ? 'text-indigo-400' : 'text-red-400'
                        }`}
                    >
                      {product.availableStock}
                    </span>
                  </p>
                </div>

                <button
                  disabled={product.availableStock <= 0 || activeReservation !== null}
                  onClick={() => handleReserve(product.id)}
                  className={`w-full py-3 rounded-lg font-medium transition ${product.availableStock <= 0 || activeReservation !== null
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                >
                  {activeReservation !== null
                    ? 'You Already Have a Reservation'
                    : product.availableStock <= 0
                      ? 'Out of Stock'
                      : 'Reserve (5 Min Lock)'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}