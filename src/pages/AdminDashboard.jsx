import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/lib/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'reports' | 'items' | 'users'
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [statsData, reportsData, itemsData, usersData] = await Promise.allSettled([
        adminService.getStats(),
        adminService.getReports(reportStatusFilter),
        adminService.getAdminItems(1, 50),
        adminService.getUsers(1, 50),
      ]);

      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (reportsData.status === "fulfilled") setReports(reportsData.value?.reports || []);
      if (itemsData.status === "fulfilled") setItems(itemsData.value?.items || []);
      if (usersData.status === "fulfilled") setUsers(usersData.value?.users || []);
    } catch {
      toast.error("Failed to load admin dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      toast.error("Access restricted to Campus Administrators");
      navigate("/");
      return;
    }
    loadAllData();
  }, [currentUser, reportStatusFilter]);

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    setActionLoadingId(reportId);
    try {
      await adminService.updateReport(reportId, newStatus);
      toast.success(`Report status marked as ${newStatus}`);
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update report status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to permanently delete this listing?")) return;
    setActionLoadingId(itemId);
    try {
      await adminService.deleteItem(itemId);
      toast.success("Listing permanently deleted from database");
      setItems((prev) => prev.filter((i) => i._id !== itemId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete item");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleSuspendUser = async (user) => {
    const isSuspending = !user.isSuspended;
    const actionPrompt = isSuspending
      ? `Suspend user ${user.name || user.email}?`
      : `Reactivate user ${user.name || user.email}?`;

    if (!window.confirm(actionPrompt)) return;

    setActionLoadingId(user._id);
    try {
      if (isSuspending) {
        await adminService.suspendUser(user._id, "Suspended by campus admin for violation");
        toast.success(`User ${user.email} suspended`);
      } else {
        await adminService.unsuspendUser(user._id);
        toast.success(`User ${user.email} reactivated`);
      }
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isSuspended: isSuspending } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!itemSearch) return true;
    const q = itemSearch.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.location?.name?.toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((user) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.collegeId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-borderWarm bg-cream-surface p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest text-accentGold shadow-subtle flex-shrink-0">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sage-subtle px-2.5 py-0.5 text-[11px] font-semibold text-forest">
              <ShieldCheck className="h-3.5 w-3.5 text-accentGold" />
              <span>Institutional Oversight</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink mt-1">
              Campus Moderation & Admin
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Manage listings, resolve community reports, and ensure trust & safety across KIET.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAllData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-borderWarm bg-cream px-3.5 py-2 text-xs font-medium text-ink hover:border-sage transition-colors shadow-subtle disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-sage ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
          >
            <span>Live Feed</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Total Reports</p>
          <p className="font-serif text-2xl font-medium text-ink mt-1">{stats?.totalItems ?? items.length}</p>
          <p className="text-[10px] text-ink-light mt-0.5">All campus posts</p>
        </div>

        <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-lostCoral">Lost Items</p>
          <p className="font-serif text-2xl font-medium text-lostCoral mt-1">{stats?.lostItems ?? "-"}</p>
          <p className="text-[10px] text-ink-light mt-0.5">Seeking owners</p>
        </div>

        <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foundGreen">Found Items</p>
          <p className="font-serif text-2xl font-medium text-foundGreen mt-1">{stats?.foundItems ?? "-"}</p>
          <p className="text-[10px] text-ink-light mt-0.5">Reported found</p>
        </div>

        <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-forest">Reunited</p>
          <p className="font-serif text-2xl font-medium text-forest mt-1">{stats?.resolvedItems ?? "-"}</p>
          <p className="text-[10px] text-ink-light mt-0.5">Resolved cases</p>
        </div>

        <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Pending Flags</p>
          <p className="font-serif text-2xl font-medium text-amber-600 mt-1">{stats?.openReports ?? reports.length}</p>
          <p className="text-[10px] text-ink-light mt-0.5">Needs review</p>
        </div>

        <div className="rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Campus Users</p>
          <p className="font-serif text-2xl font-medium text-ink mt-1">{stats?.totalUsers ?? users.length}</p>
          <p className="text-[10px] text-ink-light mt-0.5">Registered accounts</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-borderWarm gap-2 sm:gap-4 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative ${
            activeTab === "overview" ? "text-forest font-semibold" : "text-ink-muted hover:text-ink"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Flagged Reports</span>
          {reports.filter((r) => r.status === "pending").length > 0 && (
            <span className="rounded-full bg-amber-500 text-cream-surface px-2 py-0.2 text-[10px] font-bold">
              {reports.filter((r) => r.status === "pending").length}
            </span>
          )}
          {activeTab === "overview" && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-forest rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative ${
            activeTab === "items" ? "text-forest font-semibold" : "text-ink-muted hover:text-ink"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Manage Listings</span>
          <span className="rounded-full bg-cream-dark px-2 py-0.2 text-[10px]">{items.length}</span>
          {activeTab === "items" && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-forest rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative ${
            activeTab === "users" ? "text-forest font-semibold" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Campus Accounts</span>
          <span className="rounded-full bg-cream-dark px-2 py-0.2 text-[10px]">{users.length}</span>
          {activeTab === "users" && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-forest rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Moderation Reports */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-sage" />
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                className="rounded-xl border border-borderWarm bg-cream-surface px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-forest"
              >
                <option value="">All Moderation Reports</option>
                <option value="pending">Pending Review</option>
                <option value="reviewed">Marked Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <span className="text-xs text-ink-muted">
              Showing {reports.length} reports
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-borderWarm bg-cream-surface/60 p-12 text-center">
              <ShieldCheck className="h-10 w-10 text-foundGreen mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-ink">Zero pending violations</h3>
              <p className="mt-1 text-xs text-ink-muted">
                All campus listings are currently verified and clear of moderation flags.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => {
                const isPending = report.status === "pending";
                return (
                  <div
                    key={report._id}
                    className="rounded-2xl border border-borderWarm bg-cream-surface p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isPending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-foundGreen-surface text-foundGreen"
                          }`}
                        >
                          {report.status}
                        </span>
                        <span className="text-xs font-semibold text-lostCoral capitalize">
                          Reason: {report.reason}
                        </span>
                        <span className="text-xs text-ink-light">
                          · {report.createdAt ? format(new Date(report.createdAt), "PPP p") : ""}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-ink">
                        Listing: {report.itemId?.title || "Deleted / Unknown listing"}
                      </div>

                      {report.description && (
                        <p className="text-xs text-ink-muted italic bg-cream/50 p-2 rounded-lg border border-borderWarm">
                          "{report.description}"
                        </p>
                      )}

                      <p className="text-[11px] text-ink-light">
                        Reported by: {report.reporterId?.name || report.reporterId?.email || "Campus Student"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {report.itemId?._id && (
                        <Link
                          to={`/item/${report.itemId._id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-borderWarm bg-cream px-3 py-1.5 text-xs font-medium text-ink hover:border-sage transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-sage" />
                          <span>View Listing</span>
                        </Link>
                      )}

                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoadingId === report._id}
                            onClick={() => handleUpdateReportStatus(report._id, "reviewed")}
                            className="inline-flex items-center gap-1 rounded-xl bg-forest px-3 py-1.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Reviewed</span>
                          </button>

                          {report.itemId?._id && (
                            <button
                              type="button"
                              disabled={actionLoadingId === report.itemId._id}
                              onClick={() => handleDeleteItem(report.itemId._id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-lostCoral px-3 py-1.5 text-xs font-medium text-cream-surface hover:bg-lostCoral-hover transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remove Listing</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Manage All Items */}
      {activeTab === "items" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search listings by title, category..."
                className="h-9 w-full rounded-xl border border-borderWarm bg-cream-surface pl-9 pr-3 text-xs text-ink outline-none focus:border-forest"
              />
            </div>
            <span className="text-xs text-ink-muted">
              {filteredItems.length} listings loaded
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-borderWarm bg-cream-surface shadow-subtle">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-borderWarm bg-cream/60 uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Listing Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderWarm">
                {filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink">
                      <Link to={`/item/${item._id}`} className="hover:underline text-forest">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.type === "lost"
                            ? "bg-lostCoral/10 text-lostCoral"
                            : "bg-foundGreen/10 text-foundGreen"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{item.category}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {item.reporterId?.name || item.reporterId?.email || "Campus Member"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.status === "resolved"
                            ? "bg-foundGreen-surface text-foundGreen"
                            : "bg-cream-dark text-ink-muted"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={actionLoadingId === item._id}
                        onClick={() => handleDeleteItem(item._id)}
                        className="rounded-lg p-1.5 text-lostCoral hover:bg-lostCoral/10 transition-colors disabled:opacity-50"
                        title="Delete listing"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Manage Campus Users */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name, email, ID..."
                className="h-9 w-full rounded-xl border border-borderWarm bg-cream-surface pl-9 pr-3 text-xs text-ink outline-none focus:border-forest"
              />
            </div>
            <span className="text-xs text-ink-muted">
              {filteredUsers.length} accounts
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-borderWarm bg-cream-surface shadow-subtle">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-borderWarm bg-cream/60 uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Institutional Email</th>
                  <th className="px-4 py-3">College ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderWarm">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink">{user.name || "Student"}</td>
                    <td className="px-4 py-3 text-ink-muted">{user.email}</td>
                    <td className="px-4 py-3 text-ink-muted font-mono">{user.collegeId || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          user.role === "admin"
                            ? "bg-accentGold/20 text-accentGold-dark font-bold"
                            : "bg-cream-dark text-ink"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          user.isSuspended
                            ? "bg-lostCoral/10 text-lostCoral font-bold"
                            : "bg-foundGreen/10 text-foundGreen"
                        }`}
                      >
                        {user.isSuspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role !== "admin" && (
                        <button
                          type="button"
                          disabled={actionLoadingId === user._id}
                          onClick={() => handleToggleSuspendUser(user)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            user.isSuspended
                              ? "bg-forest text-cream-surface hover:bg-forest-hover"
                              : "bg-lostCoral text-cream-surface hover:bg-lostCoral-hover"
                          }`}
                        >
                          {user.isSuspended ? "Unsuspend" : "Suspend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
