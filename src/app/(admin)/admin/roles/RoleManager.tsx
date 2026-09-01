"use client";

import { useState } from "react";
import { Shield, Plus, Trash2, Users } from "lucide-react";
import { createRole, deleteRole } from "./actions";
import { useRouter } from "next/navigation";

export default function RoleManager({ initialRoles }: { initialRoles: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await createRole(formData);
    
    if (result.error) {
      setError(result.error);
    } else {
      setIsAdding(false);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setIsLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (confirm(`Are you sure you want to delete the ${name} role?`)) {
      const result = await deleteRole(id);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Roles List */}
      <div className="lg:col-span-2 space-y-4">
        {initialRoles.map((role) => (
          <div key={role.id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${role.name === 'ADMIN' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {role.name}
                  {(role.name === "ADMIN" || role.name === "USER") && (
                    <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
                      System
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{role.description || "No description provided."}</p>
                <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-muted-foreground bg-muted/50 w-fit px-2.5 py-1 rounded-md">
                  <Users className="w-3.5 h-3.5" /> {role._count.users} Users
                </div>
              </div>
            </div>
            
            {role.name !== "ADMIN" && role.name !== "USER" && (
              <button 
                onClick={() => handleDelete(role.id, role.name)}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete Role"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Role Form */}
      <div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Create New Role
          </h2>
          
          <form onSubmit={handleAddRole} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 text-red-500 text-sm font-medium rounded-lg border border-red-500/20">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold mb-1.5">Role Name</label>
              <input 
                type="text" 
                name="name" 
                placeholder="e.g. EDITOR" 
                required
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Will be automatically capitalized and formatted.</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1.5">Description</label>
              <textarea 
                name="description" 
                placeholder="What can users with this role do?" 
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-[0_4px_14px_0_rgb(0,0,0,0.1)]"
            >
              {isLoading ? "Creating..." : "Save Role"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
