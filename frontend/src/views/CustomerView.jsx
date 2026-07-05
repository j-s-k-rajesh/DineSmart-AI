import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { Coffee, ShoppingBag, Send, BellRing, Check, Clock, UtensilsCrossed, Sparkles, Search, X } from 'lucide-react';

export default function CustomerView() {
  const { restaurantId, tableId } = useParams();
  const { user, loginCustomerTable } = useAuth();
  const socket = useSocket();

  // State Management
  const [nickname, setNickname] = useState('');
  const [restaurantName, setRestaurantName] = useState('DineSmart AI');
  const [tableNumber, setTableNumber] = useState('');
  const [menu, setMenu] = useState({}); // Categorized items
  const [cart, setCart] = useState({}); // { menuItemId: { item, qty } }
  const [orders, setOrders] = useState([]); // List of active session orders
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [waiterRequested, setWaiterRequested] = useState(false);
  const [taxRate, setTaxRate] = useState(0.08);
  const [serviceRate, setServiceRate] = useState(0.10);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);

  // 1. Fetch menu details on mount
  useEffect(() => {
    const fetchMenuAndVerify = async () => {
      try {
        const verifyRes = await api.get(`/customer/scan/${restaurantId}/${tableId}`);
        setRestaurantName(verifyRes.data.data.restaurantName);
        setTableNumber(verifyRes.data.data.tableNumber);

        const menuRes = await api.get(`/customer/menu/${restaurantId}`);
        setMenu(menuRes.data.data.menu);
        setTaxRate(menuRes.data.data.restaurant.settings.taxRate || 0.08);
        setServiceRate(menuRes.data.data.restaurant.settings.serviceChargeRate || 0.10);
      } catch (err) {
        console.error('Failed to load menu data', err);
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenuAndVerify();
  }, [restaurantId, tableId]);

  // 2. Fetch session orders if logged in
  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchSessionOrders();
    }
  }, [user]);

  // 3. Socket Event Handling for live preparation status
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data) => {
      // Re-fetch current orders status from database
      fetchSessionOrders();
    };

    socket.on('order:status_updated', handleStatusUpdate);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
    };
  }, [socket]);

  const fetchSessionOrders = async () => {
    try {
      const res = await api.get('/customer/orders/session');
      setOrders(res.data.data);
    } catch (err) {
      console.error('Failed to load active orders', err);
    }
  };

  const handleJoinTable = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    await loginCustomerTable(restaurantId, tableId, nickname);
  };

  const handleAISearch = async (e, queryOverride = '') => {
    if (e) e.preventDefault();
    const query = (queryOverride || searchQuery).trim();
    if (!query) return;

    setSearching(true);
    setSearchQuery(query);
    try {
      const res = await api.get(`/customer/ai-search?q=${encodeURIComponent(query)}`);
      setSearchResult(res.data.data);
    } catch (err) {
      console.error('AI search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResult(null);
    setSearchQuery('');
  };

  const handleAddToCart = (item) => {
    setCart((prev) => {
      const current = prev[item._id] || { item, qty: 0 };
      return {
        ...prev,
        [item._id]: { item, qty: current.qty + 1 }
      };
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const updated = { ...prev };
      if (current.qty <= 1) {
        delete updated[itemId];
      } else {
        updated[itemId] = { ...current, qty: current.qty - 1 };
      }
      return updated;
    });
  };

  const handleCallWaiter = () => {
    if (!socket || waiterRequested) return;

    socket.emit('table:call_waiter', {
      restaurantId,
      tableId,
      tableNumber,
      reason: 'Assistance requested at table'
    });

    setWaiterRequested(true);
    setTimeout(() => setWaiterRequested(false), 30000); // 30s cooldown
  };

  const handlePlaceOrder = async () => {
    const itemsPayload = Object.keys(cart).map((key) => ({
      menuItemId: key,
      quantity: cart[key].qty,
      customizationNotes: ''
    }));

    try {
      const res = await api.post('/customer/orders', { items: itemsPayload });
      if (res.data.success) {
        setCart({});
        setIsCartOpen(false);
        fetchSessionOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit order');
    }
  };

  // Cart Calculations
  const cartSubtotal = Object.values(cart).reduce((sum, item) => sum + item.item.price * item.qty, 0);
  const cartTax = cartSubtotal * taxRate;
  const cartService = cartSubtotal * serviceRate;
  const cartTotal = cartSubtotal + cartTax + cartService;
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);

  // If customer hasn't registered a nickname for this table yet
  if (!user || user.role !== 'customer') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <Coffee size={24} />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Welcome to {restaurantName}</h2>
            <p className="mt-1 text-center text-sm text-slate-500">You are seated at Table {tableNumber || '#'}</p>
          </div>

          <form onSubmit={handleJoinTable} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Enter Your Nickname
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Jamison"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
            >
              Scan Menu & Order
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 shadow-sm border-b border-slate-100">
        <div>
          <h1 className="text-lg font-bold text-slate-800">{restaurantName}</h1>
          <p className="text-xs text-slate-400">Table {tableNumber} • Nickname: {user.name}</p>
        </div>
        <button
          onClick={handleCallWaiter}
          disabled={waiterRequested}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
            waiterRequested
              ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BellRing size={14} />
          {waiterRequested ? 'Staff Alerted' : 'Call Waiter'}
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-8">
        
        {/* AI Assistant Search Engine */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-primary-600">
            <Sparkles size={18} className="animate-pulse" />
            <h3 className="font-bold text-slate-800">DineSmart AI Assistant</h3>
          </div>
          
          <form onSubmit={(e) => handleAISearch(e)} className="relative flex items-center">
            <input
              type="text"
              placeholder="Ask anything... (e.g. 'spicy options', 'is dosa gluten free?')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 pl-4 pr-12 py-2.5 text-sm text-slate-800 shadow-inner focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-12 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              disabled={searching}
              className="absolute right-2 bg-slate-900 text-white rounded-full p-2 hover:bg-primary-600 transition"
            >
              <Search size={16} />
            </button>
          </form>

          {/* Quick Search Chips */}
          <div className="flex gap-2 flex-wrap text-xs">
            {[
              { label: '🌶️ Spicy', q: 'spicy' },
              { label: '🌱 Vegan', q: 'vegan' },
              { label: '🌾 Gluten-Free', q: 'gluten free' },
              { label: '☕ Drinks', q: 'drinks' },
              { label: '🥞 Breakfast', q: 'breakfast' },
              { label: '🍮 Desserts', q: 'dessert' }
            ].map((chip) => (
              <button
                key={chip.q}
                onClick={(e) => handleAISearch(e, chip.q)}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full hover:bg-primary-50 hover:border-primary-200 hover:text-primary-600 transition font-medium"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* AI Response Display */}
          {searching && (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
              <div className="flex space-x-1">
                <div className="h-2.5 w-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2.5 w-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2.5 w-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>AI is thinking...</span>
            </div>
          )}

          {searchResult && !searching && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
              <div className="text-sm text-slate-700 font-medium leading-relaxed">
                {searchResult.answer}
              </div>

              {searchResult.suggestions && searchResult.suggestions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suggested for you</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {searchResult.suggestions.map((item) => (
                      <div key={item._id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow transition">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-bold text-slate-800 text-xs">{item.name}</h5>
                            <span className="font-bold text-slate-800 text-xs">₹{item.price.toFixed(2)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">{item.estimatedPreparationTime} mins prep</span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-primary-600 transition"
                          >
                            Add to Order
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        
        {/* Real-time Order Trackers */}
        {orders.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-primary-600" />
              Live Order Status
            </h3>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="border-b last:border-b-0 pb-3 last:pb-0 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Order ID: #{order._id.substring(18)}</span>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {order.orderItems.map((item, index) => (
                        <span key={index} className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold rounded-full px-2.5 py-1 flex items-center gap-1 uppercase ${
                      order.orderStatus === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : order.orderStatus === 'processing'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {order.orderStatus === 'ready' && <Check size={12} />}
                    {order.orderStatus === 'processing' && <Clock size={12} />}
                    {order.orderStatus}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menu Listings */}
        {loadingMenu ? (
          <div className="text-center text-slate-400 py-12 animate-pulse">Loading menu items...</div>
        ) : (
          Object.keys(menu).map((categoryName) => (
            <section key={categoryName} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 capitalize border-l-4 border-primary-600 pl-3">
                {categoryName}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {menu[categoryName].map((item) => (
                  <div key={item._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                      </div>
                      <span className="font-bold text-slate-800">₹{item.price.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.estimatedPreparationTime} mins prep</span>
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-600 transition"
                      >
                        Add to Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Cart Indicator */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-md">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex w-full items-center justify-between rounded-full bg-slate-950 px-6 py-3.5 text-white shadow-xl hover:bg-slate-900 transition"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={18} />
              <span className="text-sm font-semibold">{cartCount} items placed in cart</span>
            </div>
            <span className="text-sm font-bold bg-primary-600 rounded-full px-3 py-1">
              View Order (₹{cartTotal.toFixed(2)})
            </span>
          </button>
        </div>
      )}

      {/* Slide up Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">Your Current Cart</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-sm text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>

            {/* Cart items list */}
            <div className="max-h-60 overflow-y-auto space-y-3">
              {Object.values(cart).map(({ item, qty }) => (
                <div key={item._id} className="flex justify-between items-center">
                  <div>
                    <h5 className="font-semibold text-slate-800 text-sm">{item.name}</h5>
                    <span className="text-xs text-slate-400">₹{item.price.toFixed(2)} each</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRemoveFromCart(item._id)}
                      className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-slate-800">{qty}</span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations breakdown */}
            <div className="border-t pt-3 space-y-1.5 text-sm text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span>₹{cartTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee ({(serviceRate * 100).toFixed(0)}%)</span>
                <span>₹{cartService.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-t pt-2 mt-1">
                <span>Total Amount</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit checkout */}
            <button
              onClick={handlePlaceOrder}
              className="flex w-full justify-center items-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-500"
            >
              <Send size={16} />
              Confirm & Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
