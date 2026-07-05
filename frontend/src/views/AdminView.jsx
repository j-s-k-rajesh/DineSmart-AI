import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LayoutGrid, Table2, ChefHat, BarChart3, Users, Plus, Trash2, Printer, Shield, Eye, LogOut } from 'lucide-react';

export default function AdminView() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('tables');

  // Unified data lists
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 });

  // Creation/Modal Form States
  const [newTable, setNewTable] = useState({ tableNumber: '', seatingCapacity: 4 });
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: 0, category: '', estimatedPreparationTime: 15 });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'waiter' });

  // Range queries
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    loadTabDetails();
  }, [activeTab]);

  const loadTabDetails = () => {
    switch (activeTab) {
      case 'tables':
        fetchTables();
        break;
      case 'menu':
        fetchMenu();
        break;
      case 'analytics':
        fetchAnalytics();
        break;
      case 'staff':
        fetchStaff();
        break;
    }
  };

  // 1. Tables CRUD
  const fetchTables = async () => {
    try {
      const res = await api.get('/admin/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/tables', newTable);
      setNewTable({ tableNumber: '', seatingCapacity: 4 });
      fetchTables();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add table');
    }
  };

  // Print QR Utility
  const handlePrintQR = (table) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Table ${table.tableNumber}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
            img { width: 300px; height: 300px; }
            h1 { font-size: 2.5rem; margin-bottom: 0px; }
            p { font-size: 1.2rem; color: #555; }
          </style>
        </head>
        <body>
          <h1>Table ${table.tableNumber}</h1>
          <p>Scan to Scan & Order</p>
          <img src="${table.qrCodeDataUrl}" />
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 2. Menu CRUD
  const fetchMenu = async () => {
    try {
      const res = await api.get('/admin/menu/items');
      setMenuItems(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/menu/items', newMenuItem);
      setNewMenuItem({ name: '', description: '', price: 0, category: '', estimatedPreparationTime: 15 });
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create menu item');
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/admin/menu/items/${id}`);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  // 3. Analytics Engine
  const fetchAnalytics = async () => {
    try {
      const { startDate, endDate } = dateRange;
      const query = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
      const res = await api.get(`/admin/analytics${query}`);
      setAnalytics(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Staff Management
  const fetchStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      setStaffList(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newStaff, restaurantId: user.restaurantId };
      await api.post('/auth/register', payload);
      setNewStaff({ name: '', email: '', password: '', role: 'waiter' });
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register staff');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('De-provision this staff account?')) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove user');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight">Admin Console</h2>
              <p className="text-[10px] text-slate-400">DineSmart Enterprise</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'tables' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Table2 size={18} />
              Tables & QR
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'menu' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <ChefHat size={18} />
              Menu Editor
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'analytics' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <BarChart3 size={18} />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'staff' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Users size={18} />
              Staff Accounts
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* Tab 1: Tables & QR Allocator */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Tables & QR Code Allocation</h2>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Creator Form */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-fit">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-primary-600" />
                  Add New Table
                </h4>
                <form onSubmit={handleAddTable} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Table Number / Label</label>
                    <input
                      type="text"
                      required
                      value={newTable.tableNumber}
                      onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                      placeholder="e.g. T1"
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seating Capacity</label>
                    <input
                      type="number"
                      required
                      value={newTable.seatingCapacity}
                      onChange={(e) => setNewTable({ ...newTable, seatingCapacity: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <button type="submit" className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-500 transition">
                    Generate Table & QR
                  </button>
                </form>
              </div>

              {/* Table List Layout */}
              <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-4">Allocated Table Layout</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {tables.map((table) => (
                    <div key={table._id} className="border border-slate-100 rounded-xl p-4 flex gap-4 items-center bg-slate-50">
                      <img src={table.qrCodeDataUrl} className="w-20 h-20 border border-slate-200 rounded p-1 bg-white" />
                      <div className="flex-1 space-y-1">
                        <h5 className="font-bold text-slate-800 text-lg">Table {table.tableNumber}</h5>
                        <p className="text-xs text-slate-500">Seats: {table.seatingCapacity} people</p>
                        <span className={`inline-block text-[10px] uppercase font-bold rounded-full px-2 py-0.5 ${table.status === 'vacant' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {table.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePrintQR(table)}
                        className="rounded-full border border-slate-200 p-2 bg-white hover:bg-slate-50"
                      >
                        <Printer size={14} className="text-slate-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Menu Editor */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Menu Administration</h2>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Creator Form */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-fit">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-primary-600" />
                  Add Dish / Beverage
                </h4>
                <form onSubmit={handleAddMenuItem} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dish Name</label>
                    <input
                      type="text"
                      required
                      value={newMenuItem.name}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                      placeholder="e.g. Truffle Fries"
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, price: parseFloat(e.target.value) })}
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</label>
                      <input
                        type="text"
                        required
                        value={newMenuItem.category}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                        placeholder="Appetizers"
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                    <textarea
                      value={newMenuItem.description}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none h-16"
                    />
                  </div>
                  <button type="submit" className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-500 transition">
                    Save Dish to Menu
                  </button>
                </form>
              </div>

              {/* Items List */}
              <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-4">Active Menu Inventory</h4>
                <div className="space-y-4">
                  {menuItems.map((item) => (
                    <div key={item._id} className="flex justify-between items-center border-b pb-3 last:border-b-0">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-primary-600 tracking-wider bg-primary-50 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <h5 className="font-bold text-slate-800 mt-1">{item.name}</h5>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-800">₹{item.price.toFixed(2)}</span>
                        <button
                          onClick={() => handleDeleteMenuItem(item._id)}
                          className="rounded-full border p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Business Intelligence & Analytics</h2>

            {/* Ranges Form */}
            <div className="flex gap-4 items-end bg-white p-4 rounded-xl border border-slate-100 shadow-sm w-fit">
              <div>
                <label className="text-xs font-semibold text-slate-500">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="block mt-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="block mt-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none"
                />
              </div>
              <button
                onClick={fetchAnalytics}
                className="bg-primary-600 text-white rounded px-4 py-1.5 text-sm font-semibold hover:bg-primary-500 transition"
              >
                Query
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase">Gross Revenue</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">₹{analytics.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase">Total Sales Volume</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">{analytics.totalOrders} tickets</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase">Average Order Value</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">₹{analytics.averageOrderValue}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Staff Management */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Staff Account De-provisioning</h2>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Creator Form */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-fit">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-primary-600" />
                  Add Staff Member
                </h4>
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="Chef Mario"
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      required
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="mario@restaurant.com"
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Temp Password</label>
                    <input
                      type="password"
                      required
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Role</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none bg-white"
                    >
                      <option value="waiter">Waiter</option>
                      <option value="kitchen">Kitchen Staff</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-500 transition">
                    Register User
                  </button>
                </form>
              </div>

              {/* Staff List */}
              <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-4">Active Staff Roster</h4>
                <div className="space-y-4">
                  {staffList.map((staff) => (
                    <div key={staff._id} className="flex justify-between items-center border-b pb-3 last:border-b-0">
                      <div>
                        <h5 className="font-bold text-slate-800">{staff.name}</h5>
                        <p className="text-xs text-slate-500">{staff.email} • Role: <span className="font-semibold uppercase text-primary-600">{staff.role}</span></p>
                      </div>
                      {staff._id !== user.id && (
                        <button
                          onClick={() => handleDeleteStaff(staff._id)}
                          className="rounded-full border p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
