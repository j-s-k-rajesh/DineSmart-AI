import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Play, Check, Flame, ChevronRight, LogOut, CheckCircle } from 'lucide-react';

export default function KitchenView() {
  const [orders, setOrders] = useState([]);
  const socket = useSocket();
  const { logout, user } = useAuth();
  const isWaiter = user?.role === 'waiter';

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleOrderPlaced = (newOrder) => {
      setOrders((prev) => {
        if (prev.some((order) => order._id === newOrder._id)) return prev;
        return [...prev, newOrder];
      });
    };

    const handleOrderRefreshed = (updatedOrder) => {
      setOrders((prev) => {
        if (['completed', 'cancelled'].includes(updatedOrder.orderStatus)) {
          return prev.filter((order) => order._id !== updatedOrder._id);
        }

        return prev.map((order) => order._id === updatedOrder._id ? updatedOrder : order);
      });
    };

    socket.on('order:placed', handleOrderPlaced);
    socket.on('order:status_refreshed', handleOrderRefreshed);

    return () => {
      socket.off('order:placed', handleOrderPlaced);
      socket.off('order:status_refreshed', handleOrderRefreshed);
    };
  }, [socket]);

  const fetchActiveOrders = async () => {
    try {
      const res = await api.get('/kitchen/orders/active');
      setOrders(res.data.data);
    } catch (err) {
      console.error('Failed to retrieve active orders', err);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/kitchen/orders/${orderId}/status`, { orderStatus: newStatus });
      if (['completed', 'cancelled'].includes(newStatus)) {
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
      } else {
        setOrders((prev) => prev.map((order) => order._id === orderId ? { ...order, orderStatus: newStatus } : order));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleUpdateItemStatus = async (orderId, itemId, newStatus) => {
    try {
      await api.patch(`/kitchen/orders/${orderId}/items/${itemId}/status`, { status: newStatus });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item status');
    }
  };

  const receivedOrders = orders.filter((order) => order.orderStatus === 'received');
  const processingOrders = orders.filter((order) => order.orderStatus === 'processing');
  const readyOrders = orders.filter((order) => order.orderStatus === 'ready');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
            <Flame className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{isWaiter ? 'Service Board' : 'Kitchen Monitor'}</h1>
            <p className="text-xs text-slate-400">Scoped Tenant: {user.restaurantName || 'DineSmart Partner'}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
        >
          <LogOut size={14} />
          Log Out
        </button>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 overflow-hidden">
        <section className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col h-[calc(100vh-140px)]">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-slate-200">New Tickets ({receivedOrders.length})</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800/40">FIFO</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {receivedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                No new tickets. Waiting...
              </div>
            ) : (
              receivedOrders.map((order) => (
                <div key={order._id} className="bg-slate-900 rounded-xl border border-slate-850 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">Table {order.tableId.tableNumber}</span>
                    <span className="text-[10px] text-slate-500 font-mono">#{order._id.substring(18)}</span>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
                    {order.orderItems.map((item) => (
                      <div key={item._id} className="text-sm text-slate-300 flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        {item.customizationNotes && (
                          <p className="text-[10px] text-amber-500 italic mt-0.5">{item.customizationNotes}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(order._id, 'processing')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-2 text-xs font-bold hover:bg-primary-500 transition"
                  >
                    <Play size={12} />
                    Accept Order
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col h-[calc(100vh-140px)]">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-slate-200">Preparing ({processingOrders.length})</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800/40">Cooking</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {processingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                No orders preparing.
              </div>
            ) : (
              processingOrders.map((order) => (
                <div key={order._id} className="bg-slate-900 rounded-xl border border-slate-850 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">Table {order.tableId.tableNumber}</span>
                    <span className="text-[10px] text-slate-500 font-mono">#{order._id.substring(18)}</span>
                  </div>

                  <div className="space-y-2 border-t border-slate-800 pt-2.5">
                    {order.orderItems.map((item) => (
                      <div key={item._id} className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className={`font-semibold ${item.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {item.quantity}x {item.name}
                          </span>
                          {item.customizationNotes && (
                            <p className="text-[10px] text-amber-500 italic">{item.customizationNotes}</p>
                          )}
                        </div>

                        {!isWaiter && item.status !== 'completed' ? (
                          <button
                            onClick={() => handleUpdateItemStatus(order._id, item._id, 'completed')}
                            className="rounded-full bg-slate-800 p-1 hover:bg-green-600 transition"
                          >
                            <Check size={12} />
                          </button>
                        ) : item.status === 'completed' ? (
                          <span className="text-[10px] text-green-400 font-bold uppercase">Ready</span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {!isWaiter && (
                    <button
                      onClick={() => handleUpdateStatus(order._id, 'ready')}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-850 py-2 text-xs font-bold hover:bg-slate-800 transition"
                    >
                      Ready for Pickup
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col h-[calc(100vh-140px)]">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-slate-200">Ready to Serve ({readyOrders.length})</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/40">Serving</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {readyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                No orders waiting.
              </div>
            ) : (
              readyOrders.map((order) => (
                <div key={order._id} className="bg-slate-900 rounded-xl border border-slate-850 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">Table {order.tableId.tableNumber}</span>
                    <span className="text-[10px] text-slate-500 font-mono">#{order._id.substring(18)}</span>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
                    {order.orderItems.map((item) => (
                      <div key={item._id} className="text-sm text-slate-400">
                        <span>{item.quantity}x {item.name}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(order._id, 'completed')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-bold hover:bg-green-500 transition"
                  >
                    <CheckCircle size={12} />
                    {isWaiter ? 'Mark Served' : 'Complete Order'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
