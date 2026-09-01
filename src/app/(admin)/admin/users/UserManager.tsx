"use client";

import { useState } from "react";
import { Search, MoreVertical, Edit2, Shield, Trash2, X, Check, CheckCircle2, XCircle, Plus } from "lucide-react";
import { updateUser, toggleUserStatus, deleteUser, createUser } from "./actions";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function UserManager({ initialUsers, availableRoles }: { initialUsers: any[], availableRoles: any[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredUsers = initialUsers.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openCreateModal() {
    setModalMode('create');
    setEditingUser(null);
    setEditName("");
    setEditEmail("");
    setEditPassword("");
    // By default select USER role if it exists
    const userRole = availableRoles.find(r => r.name === 'USER');
    setSelectedRoles(userRole ? [userRole.id] : []);
    setIsModalOpen(true);
  }

  function openEditModal(user: any) {
    setModalMode('edit');
    setEditingUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPassword(""); // Not typically editing password here, but clear it
    setSelectedRoles(user.roles.map((r: any) => r.id));
    setIsModalOpen(true);
  }

  function toggleRole(roleId: string) {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter(id => id !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  }

  async function handleSaveUser() {
    setIsUpdating(true);
    let result;

    if (modalMode === 'create') {
      result = await createUser({
        name: editName,
        email: editEmail,
        password: editPassword,
        roles: selectedRoles
      });
    } else {
      result = await updateUser(editingUser.id, {
        name: editName,
        email: editEmail,
        roles: selectedRoles
      });
    }

    if (result.error) {
      alert(result.error);
    } else {
      setIsModalOpen(false);
      setEditingUser(null);
      router.refresh();
    }
    setIsUpdating(false);
  }

  async function handleToggleStatus(user: any) {
    if (confirm(`Are you sure you want to ${user.isActive ? 'disable' : 'enable'} ${user.email}?`)) {
      const result = await toggleUserStatus(user.id, !user.isActive);
      if (result.error) alert(result.error);
      else router.refresh();
    }
  }

  async function handleDelete(user: any) {
    if (confirm(`Are you absolutely sure you want to delete ${user.email}? This cannot be undone.`)) {
      const result = await deleteUser(user.id);
      if (result.error) alert(result.error);
      else router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center bg-card border border-border rounded-xl px-4 py-3 shadow-sm w-full max-w-md">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input 
            type="text" 
            placeholder="Search users by email or name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
          />
        </div>
        
        <button 
          onClick={openCreateModal}
          className="bg-primary text-primary-foreground font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] shrink-0"
        >
          <Plus className="w-5 h-5" /> Add New User
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 font-semibold text-sm text-muted-foreground">User</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Status</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Roles</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Joined</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
                        {user.image ? (
                          <Image src={user.image} alt={user.name || "User"} width={40} height={40} className="object-cover" />
                        ) : (
                          <span className="font-bold text-primary">{user.email?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{user.name || "Unnamed User"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {user.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {user.isActive ? 'Active' : 'Disabled'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((r: any) => (
                        <span key={r.id} className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md flex items-center gap-1 ${r.name === 'ADMIN' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {r.name === 'ADMIN' && <Shield className="w-3 h-3" />}
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(user)} className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-lg" title="Edit Roles">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleStatus(user)} className="p-2 text-muted-foreground hover:text-amber-500 transition-colors hover:bg-muted rounded-lg" title={user.isActive ? "Disable User" : "Enable User"}>
                        {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No users found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold">{modalMode === 'create' ? 'Create New User' : 'Edit User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 pb-2">
              <h4 className="text-sm font-semibold mb-3">User Details</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                {modalMode === 'create' && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
                    <input 
                      type="password" 
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4">
              <h4 className="text-sm font-semibold mb-3">Roles</h4>
              
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                {availableRoles.map(role => {
                  const isSelected = selectedRoles.includes(role.id);
                  return (
                    <div 
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                    >
                      <div>
                        <p className="font-bold">{role.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-muted/20 flex gap-3 justify-end shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 font-bold rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser}
                disabled={isUpdating}
                className="px-5 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
