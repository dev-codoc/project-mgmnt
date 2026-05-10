import React, { useState, useEffect } from 'react';
import { authAPI } from '../api';
import useAuthStore from '../store/authStore';
import { Navigate } from 'react-router-dom';

export default function UsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const load = async () => {
    try {
      const res = await authAPI.getUsers();
      setUsers(res.users);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (id, role) => {
    if (id === user._id) return alert("Can't change your own role.");
    setUpdating(id);
    try {
      await authAPI.updateRole(id, role);
      setUsers(us => us.map(u => u._id === id ? { ...u, role } : u));
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Users</h2>
          <p>{users.length} registered users</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar" style={{ width: 34, height: 34 }}>{initials(u.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                          {u._id === user._id && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>You</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="text-secondary text-sm">{u.email}</span></td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td><span className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</span></td>
                    <td>
                      <select
                        value={u.role}
                        disabled={u._id === user._id || updating === u._id}
                        onChange={e => handleRoleChange(u._id, e.target.value)}
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-light)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '6px 10px', fontFamily: 'inherit', cursor: 'pointer', opacity: u._id === user._id ? 0.5 : 1 }}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
