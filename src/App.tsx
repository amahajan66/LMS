import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  LogOut, 
  Lock, 
  User, 
  Search, 
  Database, 
  TrendingUp, 
  Calendar, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Phone, 
  CreditCard, 
  Coins, 
  ChevronRight,
  ChevronLeft,
  Filter,
  RefreshCw,
  Terminal,
  Activity,
  LayoutDashboard,
  FileText,
  Settings
} from "lucide-react";
import { Lead, DashboardMetrics } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem("lead_admin_token"));
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Dashboard states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ totalCount: 0, addedToday: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Standalone Routing Setup
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // CRUD Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    income: "",
    phone: "",
    aadhaar: "",
    pan: "",
    status: "New" as Lead["status"],
    lead_type: "Fresh" as Lead["lead_type"],
    cm: "",
    sub_status: "",
    rejection_reason: "",
    custom_rejection: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch initial data on login
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const editMatch = currentPath.match(/^\/leads\/edit\/(\d+)/);
  const editLeadId = editMatch ? parseInt(editMatch[1], 10) : null;

  useEffect(() => {
    if (editLeadId && leads.length > 0) {
      const leadToEdit = leads.find((l) => l.id === editLeadId);
      if (leadToEdit) {
        setSelectedLead(leadToEdit);
        setFormData({
          name: leadToEdit.name,
          income: leadToEdit.income.toString(),
          phone: leadToEdit.phone,
          aadhaar: leadToEdit.aadhaar,
          pan: leadToEdit.pan,
          status: leadToEdit.status,
          lead_type: leadToEdit.lead_type || "Fresh",
          cm: leadToEdit.cm || "",
          sub_status: leadToEdit.sub_status || "",
          rejection_reason: leadToEdit.rejection_reason || "",
          custom_rejection: leadToEdit.custom_rejection || ""
        });
      }
    }
  }, [editLeadId, leads]);

  // Flash message timeout helper
  const showFlash = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      // Fetch leads and metrics in parallel
      const [leadsRes, metricsRes] = await Promise.all([
        fetch("/api/leads", { headers }),
        fetch("/api/dashboard/metrics", { headers })
      ]);

      if (leadsRes.status === 401 || metricsRes.status === 401) {
        handleLogout();
        return;
      }

      if (!leadsRes.ok || !metricsRes.ok) {
        throw new Error("Failed to load dashboard data from backend server.");
      }

      const leadsData = await leadsRes.json();
      const metricsData = await metricsRes.json();

      setLeads(leadsData);
      setMetrics(metricsData);
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred while communicating with the SQLite server.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. AUTHENTICATION
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    if (!username || !password) {
      setAuthError("Please fill in both fields");
      setIsAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("lead_admin_token", data.token);
        setToken(data.token);
        setUsername("");
        setPassword("");
      } else {
        setAuthError(data.error || "Authentication failed. Incorrect username or password.");
      }
    } catch (err: any) {
      setAuthError("Network error. Make sure the server backend is running.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("lead_admin_token");
    setToken(null);
    setLeads([]);
    setMetrics({ totalCount: 0, addedToday: 0 });
  };

  // Form validation helper
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    const incomeNum = Number(formData.income);
    if (!formData.income || isNaN(incomeNum) || incomeNum < 0) {
      errors.income = "Income must be a positive number";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone is required";
    } else if (!/^\+?([0-9\s-]{8,15})$/.test(formData.phone.trim())) {
      errors.phone = "Enter a valid phone number (8-15 digits)";
    }

    const cleanAadhaar = formData.aadhaar.replace(/[\s-]/g, "");
    if (!formData.aadhaar.trim()) {
      errors.aadhaar = "Aadhaar number is required";
    } else if (!/^\d{12}$/.test(cleanAadhaar)) {
      errors.aadhaar = "Aadhaar must be a 12-digit number";
    }

    const cleanPan = formData.pan.toUpperCase().trim();
    if (!formData.pan.trim()) {
      errors.pan = "PAN card is required";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      errors.pan = "Invalid PAN card format (e.g., ABCDE1234F)";
    }

    if (formData.status === "Rejected" && formData.rejection_reason === "Other") {
      if (!formData.custom_rejection.trim()) {
        errors.custom_rejection = "Custom rejection reason is required";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Auto-format Aadhaar with spaces (XXXX XXXX XXXX)
  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  // 2. CRUD OPERATIONS
  const openAddModal = () => {
    setFormData({
      name: "",
      income: "",
      phone: "",
      aadhaar: "",
      pan: "",
      status: "New",
      lead_type: "Fresh",
      cm: "",
      sub_status: "New",
      rejection_reason: "",
      custom_rejection: ""
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const formattedData = {
        ...formData,
        income: Number(formData.income),
        pan: formData.pan.toUpperCase().trim(),
        aadhaar: formatAadhaar(formData.aadhaar)
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        showFlash(`Lead "${formattedData.name}" created successfully.`);
        fetchDashboardData();
      } else {
        const errData = await res.json();
        setFormErrors({ submit: errData.error || "Failed to create lead" });
      }
    } catch (err) {
      setFormErrors({ submit: "Connection failure while contacting SQLite database." });
    }
  };

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      income: lead.income.toString(),
      phone: lead.phone,
      aadhaar: lead.aadhaar,
      pan: lead.pan,
      status: lead.status,
      lead_type: lead.lead_type || "Fresh",
      cm: lead.cm || "",
      sub_status: lead.sub_status || "",
      rejection_reason: lead.rejection_reason || "",
      custom_rejection: lead.custom_rejection || ""
    });
    setFormErrors({});
    navigateTo(`/leads/edit/${lead.id}`);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !validateForm()) return;

    try {
      const formattedData = {
        ...formData,
        income: Number(formData.income),
        pan: formData.pan.toUpperCase().trim(),
        aadhaar: formatAadhaar(formData.aadhaar)
      };

      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        showFlash(`Lead "${formattedData.name}" updated successfully.`);
        fetchDashboardData();
        navigateTo("/");
      } else {
        const errData = await res.json();
        setFormErrors({ submit: errData.error || "Failed to update lead" });
      }
    } catch (err) {
      setFormErrors({ submit: "Connection failure while contacting SQLite database." });
    }
  };

  const openViewModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        showFlash(`Lead "${selectedLead.name}" has been permanently removed.`);
        fetchDashboardData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to delete lead");
      }
    } catch (err) {
      alert("Failed to communicate with SQLite backend database.");
    }
  };

  // Helper formatting for currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadgeColor = (status: Lead["status"]) => {
    switch (status) {
      case "Qualified":
        return "bg-green-100 text-green-700 border-green-200";
      case "In Progress":
      case "Contacted":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "Lost":
      case "Rejected":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "New":
      default:
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
    }
  };

  // Filtering Logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.pan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.aadhaar.includes(searchQuery);

    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-screen w-full flex bg-slate-50 overflow-hidden font-sans text-slate-900 selection:bg-indigo-600 selection:text-white">
      
      {/* 1. AUTHENTICATION SCREEN */}
      {!token ? (
        <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden h-full">
          {/* Subtle background matrix lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
          
          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <div className="w-9 h-9 bg-indigo-600 rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              LeadEngine
            </span>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white font-sans">
              Database Admin Login
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Sign in with hardcoded SQLite admin privileges
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0"
          >
            <div className="bg-slate-900/85 backdrop-blur-md py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-800">
              
              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    Admin Username
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-800 bg-slate-950 text-white rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-sans"
                      placeholder="e.g. admin"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    Security Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-800 bg-slate-950 text-white rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-sans"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                {authError && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl bg-red-950/40 border border-red-500/30 p-3.5 flex items-start gap-2.5 text-xs text-red-400"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </motion.div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Credentials...
                      </span>
                    ) : (
                      "Establish Secure Connection"
                    )}
                  </button>
                </div>
              </form>

              {/* Hardcoded credential hints for sandbox */}
              <div className="mt-6 border-t border-slate-800/80 pt-4">
                <div className="rounded-xl bg-slate-950 px-4 py-3.5 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-400 mb-1.5 tracking-wider uppercase">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>CREDENTIALS_MANIFEST</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 space-y-1">
                    <div><span className="text-slate-600 font-semibold">USER:</span> admin</div>
                    <div><span className="text-slate-600 font-semibold">PASS:</span> Pass$Word</div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      ) : (
        
        // 2. MAIN APPLICATION WORKSPACE WITH SIDEBAR & CONTENT AREA
        <div className="flex-1 flex overflow-hidden h-full w-full">
          
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-slate-900 flex flex-col h-full shrink-0 z-20 border-r border-slate-800">
            {/* Header / Logo */}
            <div className="p-6 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center shadow-md shadow-indigo-500/20">
                <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
              </div>
              <span className="text-white font-bold tracking-tight text-xl">LeadEngine</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
              <button 
                className="w-full bg-indigo-600 text-white flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-semibold transition-colors cursor-default"
                title="Active Workspace"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              
              <button 
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50 flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-semibold transition-all"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                }}
              >
                <FileText className="w-4 h-4" />
                <span>Lead Records</span>
              </button>

              <div className="pt-4 pb-2 px-4">
                <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Database Utilities</p>
              </div>

              <button 
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50 flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-semibold transition-all text-left"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                <span>Sync SQLite Rowids</span>
              </button>

              <button 
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50 flex items-center px-4 py-3 rounded-xl gap-3 text-sm font-semibold transition-all cursor-not-allowed"
                disabled
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>

            {/* Profile footer inside sidebar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                  AD
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">admin</p>
                  <p className="text-slate-500 text-xs truncate">Administrator</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                  title="Disconnect Admin Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Pane */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
            {editLeadId ? (
              // STANDALONE ROUTE-BASED LEAD EDITOR
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Standalone Editor Header */}
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigateTo("/")}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span>Back to Dashboard</span>
                    </button>
                    <div className="h-5 w-px bg-slate-200" />
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                      Edit Lead Record: <span className="text-indigo-600 font-mono">LEAD_00{selectedLead?.id}</span>
                    </h1>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium font-mono bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                      Standalone Route
                    </span>
                  </div>
                </header>

                {/* Edit Form Container */}
                <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    {!selectedLead ? (
                      <div className="text-center py-12">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Loading lead data from SQLite...</p>
                      </div>
                    ) : (
                      <form onSubmit={handleUpdateLead} className="space-y-6">
                        {/* Name field */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                            Lead Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="e.g. Vikramaditya Singh"
                          />
                          {formErrors.name && (
                            <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.name}</p>
                          )}
                        </div>

                        {/* Income and Phone row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              Annual Income (INR) *
                            </label>
                            <div className="relative rounded-xl shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                                ₹
                              </div>
                              <input
                                type="number"
                                required
                                value={formData.income}
                                onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                                className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                                placeholder="e.g. 750000"
                              />
                            </div>
                            {formErrors.income && (
                              <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.income}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              Phone Number *
                            </label>
                            <div className="relative rounded-xl shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Phone className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                              />
                            </div>
                            {formErrors.phone && (
                              <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.phone}</p>
                            )}
                          </div>
                        </div>

                        {/* Aadhaar and PAN row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              Aadhaar Number *
                            </label>
                            <div className="relative rounded-xl shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                required
                                maxLength={14}
                                value={formData.aadhaar}
                                onChange={(e) => setFormData({ ...formData, aadhaar: formatAadhaar(e.target.value) })}
                                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                              />
                            </div>
                            {formErrors.aadhaar && (
                              <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.aadhaar}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              PAN Card Code *
                            </label>
                            <div className="relative rounded-xl shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                required
                                maxLength={10}
                                value={formData.pan}
                                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono uppercase"
                              />
                            </div>
                            {formErrors.pan && (
                              <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.pan}</p>
                            )}
                          </div>
                        </div>

                        {/* Lead Type and CM row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              Lead Type *
                            </label>
                            <select
                              value={formData.lead_type}
                              onChange={(e) => setFormData({ ...formData, lead_type: e.target.value as Lead["lead_type"] })}
                              className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                            >
                              <option value="Fresh">Fresh</option>
                              <option value="Repeat">Repeat</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              Credit Manager (CM) ID/Name
                            </label>
                            <input
                              type="text"
                              value={formData.cm}
                              onChange={(e) => setFormData({ ...formData, cm: e.target.value })}
                              className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              placeholder="e.g. CM_Rahul"
                            />
                          </div>
                        </div>

                        {/* Lead Status and Conditional Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              Lead Status *
                            </label>
                            <select
                              value={formData.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as Lead["status"];
                                let updatedFields: any = { status: newStatus };
                                if (newStatus === "New") {
                                  updatedFields.sub_status = "New";
                                  updatedFields.rejection_reason = "";
                                  updatedFields.custom_rejection = "";
                                } else if (newStatus === "Rejected") {
                                  updatedFields.sub_status = "";
                                  updatedFields.rejection_reason = "Not Eligible";
                                  updatedFields.custom_rejection = "";
                                } else {
                                  updatedFields.sub_status = "";
                                  updatedFields.rejection_reason = "";
                                  updatedFields.custom_rejection = "";
                                }
                                setFormData({ ...formData, ...updatedFields });
                              }}
                              className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Qualified">Qualified</option>
                              <option value="Lost">Lost</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>

                          {/* Conditional sub-status or rejection reason */}
                          {formData.status === "New" && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                                Sub-Status *
                              </label>
                              <select
                                value={formData.sub_status}
                                onChange={(e) => setFormData({ ...formData, sub_status: e.target.value })}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                              >
                                <option value="New">New</option>
                                <option value="Interested">Interested</option>
                                <option value="Callback">Callback</option>
                              </select>
                            </div>
                          )}

                          {formData.status === "Rejected" && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                                Rejection Reason *
                              </label>
                              <select
                                value={formData.rejection_reason}
                                onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                              >
                                <option value="Not Eligible">Not Eligible</option>
                                <option value="Less Salary">Less Salary</option>
                                <option value="CIBIL low">CIBIL low</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Mandatory Custom Text Box if Rejection Reason is 'Other' */}
                        {formData.status === "Rejected" && formData.rejection_reason === "Other" && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                              Custom Rejection Reason *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.custom_rejection}
                              onChange={(e) => setFormData({ ...formData, custom_rejection: e.target.value })}
                              placeholder="Please specify why this lead was rejected..."
                              className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800"
                            />
                            {formErrors.custom_rejection && (
                              <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.custom_rejection}</p>
                            )}
                          </div>
                        )}

                        {formErrors.submit && (
                          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{formErrors.submit}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                          <button
                            type="button"
                            onClick={() => navigateTo("/")}
                            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors focus:outline-none shadow-sm"
                          >
                            Commit Database Updates
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Top Header Bar */}
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
                  <div>
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">Lead Management Dashboard</h1>
                  </div>

              <div className="flex items-center gap-5">
                <span className="hidden lg:inline text-xs text-slate-400 font-medium font-mono">
                  Last Sync: Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Lead</span>
                </button>
              </div>
            </header>

            {/* Scrollable Content Area */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              
              {/* Top Row: System Status Alert or Error Message */}
              {apiError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-800">Database Connection Error</h3>
                    <p className="text-xs text-red-700 mt-1">{apiError}</p>
                    <button 
                      onClick={fetchDashboardData}
                      className="mt-2 text-xs font-semibold text-red-600 underline hover:text-red-800"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              )}

              {/* Flash notification banner */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-indigo-50 border border-indigo-150 p-4 rounded-xl shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                      <span className="text-sm font-medium text-indigo-900 font-mono">{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-indigo-400 hover:text-indigo-600">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* METRIC TILES ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Metric 1: Total Count Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-slate-300 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Count</p>
                    <div className="flex items-baseline gap-2.5 mt-2">
                      {isLoading ? (
                        <div className="h-10 w-24 bg-slate-100 rounded-md animate-pulse"></div>
                      ) : (
                        <h2 className="text-4xl font-bold text-slate-900">{metrics.totalCount}</h2>
                      )}
                      <span className="text-green-600 text-xs font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        +12% vs last month
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400 font-medium">
                    <Database className="w-3.5 h-3.5 text-slate-300" />
                    <span>Total persistent rows inside SQLite storage</span>
                  </div>
                </div>

                {/* Metric 2: Added Today Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-slate-300 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Added Today</p>
                    <div className="flex items-baseline gap-2.5 mt-2">
                      {isLoading ? (
                        <div className="h-10 w-16 bg-slate-100 rounded-md animate-pulse"></div>
                      ) : (
                        <h2 className="text-4xl font-bold text-slate-900">{metrics.addedToday}</h2>
                      )}
                      <span className="text-indigo-600 text-xs font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        Leads created today
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    <span>Filtered by current server timezone timestamp</span>
                  </div>
                </div>

              </div>

              {/* ACTIVE LEAD RECORDS TABLE CARD */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Search & Filter Controls Header */}
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">Active Lead Records</h3>
                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {filteredLeads.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Field */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Search leads..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-2 pl-9 border border-slate-300 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white transition-all shadow-sm" 
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery("")} 
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Dropdown */}
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none block pl-8 pr-10 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-700 shadow-sm"
                      >
                        <option value="All">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Lost">Lost</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Filter className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Core */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 font-sans text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left">Name</th>
                        <th scope="col" className="px-6 py-4 text-left">Income</th>
                        <th scope="col" className="px-6 py-4 text-left">Phone</th>
                        <th scope="col" className="px-6 py-4 text-left">Aadhaar</th>
                        <th scope="col" className="px-6 py-4 text-left">PAN</th>
                        <th scope="col" className="px-6 py-4 text-center">Status</th>
                        <th scope="col" className="relative px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {isLoading && leads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-slate-500 font-sans text-sm">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400 mb-3" />
                            <span>Connecting to database and fetching leads...</span>
                          </td>
                        </tr>
                      ) : filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                            <div className="max-w-xs mx-auto space-y-2">
                              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-sm font-bold text-slate-700 font-sans">No matching rows in SQLite</p>
                              <p className="text-xs text-slate-500 font-sans">
                                Modify your search, clear filters, or click "Create New Lead" to insert a record.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => (
                          <tr 
                            key={lead.id} 
                            className="hover:bg-slate-50 transition-colors group"
                          >
                            {/* Name */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase border border-indigo-100">
                                  {lead.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="text-sm font-semibold text-slate-900">{lead.name}</div>
                              </div>
                            </td>

                            {/* Income */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold font-mono">
                              {formatCurrency(lead.income)}
                            </td>

                            {/* Phone */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                              {lead.phone}
                            </td>

                            {/* Aadhaar */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                              {lead.aadhaar}
                            </td>

                            {/* PAN */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono uppercase">
                              {lead.pan}
                            </td>

                            {/* Status Pill */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(lead.status)}`}>
                                {lead.status}
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-1">
                              <button
                                onClick={() => openViewModal(lead)}
                                className="text-indigo-600 hover:text-indigo-800 hover:underline px-2"
                              >
                                View
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="text-slate-500 hover:text-slate-800 px-2"
                              >
                                Edit
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="text-red-600 hover:text-red-800 px-2"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: Dynamic Pagination Look */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium font-sans">
                  <span>Showing 1 to {filteredLeads.length} of {leads.length} database records</span>
                  <div className="flex gap-1">
                    <button className="px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-400 cursor-not-allowed flex items-center justify-center">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button className="px-3 py-1 border border-indigo-600 bg-indigo-600 text-white rounded font-bold">1</button>
                    <button className="px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-400 cursor-not-allowed flex items-center justify-center">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Status bar */}
            <footer className="h-8 bg-slate-100 border-t border-slate-200 px-8 flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                <span>CONNECTED TO SQLITE DB: leads.db</span>
              </div>
              <div className="flex items-center gap-3">
                <span>APP STATUS: STABLE</span>
                <span>|</span>
                <span>AUTHENTICATED AS: 'ADMIN'</span>
              </div>
            </footer>
          </>
        )}
      </main>

        </div>
      )}

      {/* ========================================================= */}
      {/* ======================= MODAL DIALOGS =================== */}
      {/* ========================================================= */}

      {/* CREATE LEAD MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddModalOpen(false)}
                className="fixed inset-0 transition-opacity bg-slate-900/60 backdrop-blur-sm"
              />

              {/* Centering element */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              {/* Modal Container */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative z-10 inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl border border-slate-150 sm:align-middle"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950 font-sans">Create Lead</h3>
                  </div>
                  <button 
                    onClick={() => setIsAddModalOpen(false)} 
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateLead} className="space-y-4">
                  
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                      Lead Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="e.g. Vikramaditya Singh"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Income and Phone row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Annual Income (INR) *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                          ₹
                        </div>
                        <input
                          type="number"
                          required
                          value={formData.income}
                          onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                          className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                          placeholder="e.g. 750000"
                        />
                      </div>
                      {formErrors.income && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.income}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Phone Number *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      {formErrors.phone && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Aadhaar and PAN row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Aadhaar Number (12 Digits) *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={14} // to allow formatting spaces
                          value={formData.aadhaar}
                          onChange={(e) => setFormData({ ...formData, aadhaar: formatAadhaar(e.target.value) })}
                          className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                          placeholder="e.g. 1234 5678 9012"
                        />
                      </div>
                      {formErrors.aadhaar && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.aadhaar}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        PAN Card Code (10 chars) *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={formData.pan}
                          onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                          className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono uppercase"
                          placeholder="e.g. ABCDE1234F"
                        />
                      </div>
                      {formErrors.pan && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.pan}</p>
                      )}
                    </div>
                  </div>

                  {/* Lead Type and CM row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Lead Type *
                      </label>
                      <select
                        value={formData.lead_type}
                        onChange={(e) => setFormData({ ...formData, lead_type: e.target.value as Lead["lead_type"] })}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                      >
                        <option value="Fresh">Fresh</option>
                        <option value="Repeat">Repeat</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Credit Manager (CM) ID/Name
                      </label>
                      <input
                        type="text"
                        value={formData.cm}
                        onChange={(e) => setFormData({ ...formData, cm: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="e.g. CM_Rahul"
                      />
                    </div>
                  </div>

                  {/* Lead Status and Conditional Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Lead Status *
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as Lead["status"];
                          let updatedFields: any = { status: newStatus };
                          if (newStatus === "New") {
                            updatedFields.sub_status = "New";
                            updatedFields.rejection_reason = "";
                            updatedFields.custom_rejection = "";
                          } else if (newStatus === "Rejected") {
                            updatedFields.sub_status = "";
                            updatedFields.rejection_reason = "Not Eligible";
                            updatedFields.custom_rejection = "";
                          } else {
                            updatedFields.sub_status = "";
                            updatedFields.rejection_reason = "";
                            updatedFields.custom_rejection = "";
                          }
                          setFormData({ ...formData, ...updatedFields });
                        }}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Lost">Lost</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    {/* Conditional sub-status or rejection reason */}
                    {formData.status === "New" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                          Sub-Status *
                        </label>
                        <select
                          value={formData.sub_status}
                          onChange={(e) => setFormData({ ...formData, sub_status: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                        >
                          <option value="New">New</option>
                          <option value="Interested">Interested</option>
                          <option value="Callback">Callback</option>
                        </select>
                      </div>
                    )}

                    {formData.status === "Rejected" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                          Rejection Reason *
                        </label>
                        <select
                          value={formData.rejection_reason}
                          onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                        >
                          <option value="Not Eligible">Not Eligible</option>
                          <option value="Less Salary">Less Salary</option>
                          <option value="CIBIL low">CIBIL low</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Mandatory Custom Text Box if Rejection Reason is 'Other' */}
                  {formData.status === "Rejected" && formData.rejection_reason === "Other" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Custom Rejection Reason *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.custom_rejection}
                        onChange={(e) => setFormData({ ...formData, custom_rejection: e.target.value })}
                        placeholder="Please specify why this lead was rejected..."
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800"
                      />
                      {formErrors.custom_rejection && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.custom_rejection}</p>
                      )}
                    </div>
                  )}

                  {formErrors.submit && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{formErrors.submit}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors focus:outline-none shadow-sm"
                    >
                      Save to SQLite Database
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT LEAD MODAL */}
      <AnimatePresence>
        {isEditModalOpen && selectedLead && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditModalOpen(false)}
                className="fixed inset-0 transition-opacity bg-slate-900/60 backdrop-blur-sm"
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative z-10 inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl border border-slate-150 sm:align-middle"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                      <Edit className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950 font-sans">Modify Lead Record</h3>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(false)} 
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateLead} className="space-y-4">
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                      Lead Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Annual Income (INR) *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                          ₹
                        </div>
                        <input
                          type="number"
                          required
                          value={formData.income}
                          onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                          className="block w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                        />
                      </div>
                      {formErrors.income && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.income}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Phone Number *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                        />
                      </div>
                      {formErrors.phone && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Aadhaar Number *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={14}
                          value={formData.aadhaar}
                          onChange={(e) => setFormData({ ...formData, aadhaar: formatAadhaar(e.target.value) })}
                          className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                        />
                      </div>
                      {formErrors.aadhaar && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.aadhaar}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        PAN Card Code *
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={formData.pan}
                          onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                          className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono uppercase"
                        />
                      </div>
                      {formErrors.pan && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.pan}</p>
                      )}
                    </div>
                  </div>

                  {/* Lead Type and CM row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Lead Type *
                      </label>
                      <select
                        value={formData.lead_type}
                        onChange={(e) => setFormData({ ...formData, lead_type: e.target.value as Lead["lead_type"] })}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                      >
                        <option value="Fresh">Fresh</option>
                        <option value="Repeat">Repeat</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Credit Manager (CM) ID/Name
                      </label>
                      <input
                        type="text"
                        value={formData.cm}
                        onChange={(e) => setFormData({ ...formData, cm: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="e.g. CM_Rahul"
                      />
                    </div>
                  </div>

                  {/* Lead Status and Conditional Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Lead Status *
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as Lead["status"];
                          let updatedFields: any = { status: newStatus };
                          if (newStatus === "New") {
                            updatedFields.sub_status = "New";
                            updatedFields.rejection_reason = "";
                            updatedFields.custom_rejection = "";
                          } else if (newStatus === "Rejected") {
                            updatedFields.sub_status = "";
                            updatedFields.rejection_reason = "Not Eligible";
                            updatedFields.custom_rejection = "";
                          } else {
                            updatedFields.sub_status = "";
                            updatedFields.rejection_reason = "";
                            updatedFields.custom_rejection = "";
                          }
                          setFormData({ ...formData, ...updatedFields });
                        }}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Lost">Lost</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    {/* Conditional sub-status or rejection reason */}
                    {formData.status === "New" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                          Sub-Status *
                        </label>
                        <select
                          value={formData.sub_status}
                          onChange={(e) => setFormData({ ...formData, sub_status: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                        >
                          <option value="New">New</option>
                          <option value="Interested">Interested</option>
                          <option value="Callback">Callback</option>
                        </select>
                      </div>
                    )}

                    {formData.status === "Rejected" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                          Rejection Reason *
                        </label>
                        <select
                          value={formData.rejection_reason}
                          onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 bg-white"
                        >
                          <option value="Not Eligible">Not Eligible</option>
                          <option value="Less Salary">Less Salary</option>
                          <option value="CIBIL low">CIBIL low</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Mandatory Custom Text Box if Rejection Reason is 'Other' */}
                  {formData.status === "Rejected" && formData.rejection_reason === "Other" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                        Custom Rejection Reason *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.custom_rejection}
                        onChange={(e) => setFormData({ ...formData, custom_rejection: e.target.value })}
                        placeholder="Please specify why this lead was rejected..."
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800"
                      />
                      {formErrors.custom_rejection && (
                        <p className="mt-1 text-xs text-red-600 font-mono">{formErrors.custom_rejection}</p>
                      )}
                    </div>
                  )}

                  {formErrors.submit && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{formErrors.submit}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors focus:outline-none shadow-sm"
                    >
                      Commit Database Updates
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW DETAILS MODAL */}
      <AnimatePresence>
        {isViewModalOpen && selectedLead && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsViewModalOpen(false)}
                className="fixed inset-0 transition-opacity bg-slate-900/60 backdrop-blur-sm"
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative z-10 inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl border border-slate-150 sm:align-middle"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950 font-sans">Database Record Details</h3>
                  </div>
                  <button 
                    onClick={() => setIsViewModalOpen(false)} 
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Display grid */}
                <div className="space-y-4">
                  
                  {/* Lead ID / Code Badge */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                        SQLite ROWID
                      </span>
                      <span className="text-sm font-mono font-semibold text-slate-800">
                        LEAD_00{selectedLead.id}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                        Creation Date
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-600">
                        {selectedLead.created_at ? new Date(selectedLead.created_at).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    
                    {/* Name */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                        Name
                      </span>
                      <span className="text-base font-bold text-slate-950">
                        {selectedLead.name}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono mb-1">
                        Status Code
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(selectedLead.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block animate-pulse"></span>
                        {selectedLead.status}
                      </span>
                    </div>

                    {/* Income */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                        Annual Income
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-700">
                        {formatCurrency(selectedLead.income)}
                      </span>
                    </div>

                    {/* Phone */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                        Phone Contact
                      </span>
                      <span className="text-sm font-mono text-slate-800">
                        {selectedLead.phone}
                      </span>
                    </div>

                    {/* National ID credentials */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                          Aadhaar Number
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-800">
                          {selectedLead.aadhaar}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                          PAN Card Code
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-800 uppercase">
                          {selectedLead.pan}
                        </span>
                      </div>
                    </div>

                    {/* Lead Type and CM */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                          Lead Type
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {selectedLead.lead_type || 'Fresh'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                          Credit Manager (CM)
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {selectedLead.cm || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {/* Conditional sub-status or rejection info */}
                    {selectedLead.status === "New" && selectedLead.sub_status && (
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                          Sub-Status Code
                        </span>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono inline-block">
                          {selectedLead.sub_status}
                        </span>
                      </div>
                    )}

                    {selectedLead.status === "Rejected" && (
                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                            Rejection Reason
                          </span>
                          <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100 font-mono inline-block">
                            {selectedLead.rejection_reason || 'N/A'}
                          </span>
                        </div>
                        {selectedLead.rejection_reason === "Other" && selectedLead.custom_rejection && (
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                              Custom Reason Text
                            </span>
                            <span className="text-xs text-slate-600 font-medium block italic">
                              "{selectedLead.custom_rejection}"
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-6">
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        openEditModal(selectedLead);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors focus:outline-none shadow-sm flex items-center gap-1.5"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Record</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsViewModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      Close Details
                    </button>
                  </div>

                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedLead && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDeleteModalOpen(false)}
                className="fixed inset-0 transition-opacity bg-slate-900/60 backdrop-blur-sm"
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative z-10 inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl border border-slate-150 sm:align-middle"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-950 font-sans">Delete Lead Record</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Are you sure you want to permanently delete lead <span className="font-semibold text-slate-900 font-mono">"{selectedLead.name}"</span> from the SQLite database?
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mt-4 text-xs space-y-1 font-mono">
                  <div className="text-slate-500">Record Info:</div>
                  <div className="font-semibold text-slate-700">Name: {selectedLead.name}</div>
                  <div className="font-semibold text-slate-700">PAN Card: {selectedLead.pan}</div>
                  <div className="font-semibold text-slate-700">Aadhaar: {selectedLead.aadhaar}</div>
                </div>

                <p className="text-xs text-red-500 mt-3 font-medium">
                  * Warning: This database transaction is irreversible. All associated lead parameters will be immediately wiped.
                </p>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none"
                  >
                    Keep Record
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteLead}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors focus:outline-none shadow-sm"
                  >
                    Confirm Delete Transaction
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
