import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, authAPI } from '../api';
import useAuthStore from '../store/authStore';

const INIT = { name: '', description: '', status: 'active', priority: 'medium', dueDate: '', members: [], tags: '' };

function ProjectModal({ project, users, onClose, onSaved }) {
  const [form, setForm] = useState(project ? {
    ...project,
    members: project.members?.map(m => m._id || m) || [],
    tags: project.tags?.join(', ') || '',
    dueDate: project.dueDate ? project.dueDate.slice(0, 10) : '',
  } : INIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] };
      if (project) await projectsAPI.update(project._id, payload);
      else await projectsAPI.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter(m => m !== id) : [...f.members, id]
    }));
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{project ? 'Edit Project' : 'New Project'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. E-Commerce Platform" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input className="form-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="react, api, v2" />
            </div>
          </div>
          {users.length > 0 && (
            <div className="form-group">
              <label className="form-label">Members</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {users.map(u => (
                  <button type="button" key={u._id}
                    onClick={() => toggleMember(u._id)}
                    className="btn btn-sm"
                    style={{ background: form.members.includes(u._id) ? 'var(--accent-glow)' : 'var(--bg-hover)', color: form.members.includes(u._id) ? 'var(--accent)' : 'var(--text-secondary)', border: `1px solid ${form.members.includes(u._id) ? 'var(--accent)' : 'var(--border)'}` }}>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | project obj
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', page: 1, limit: 9 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await projectsAPI.getAll(params);
      setProjects(res.data);
      setPagination(res.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user?.role === 'admin') {
      authAPI.getUsers().then(r => setUsers(r.users)).catch(() => {});
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try { await projectsAPI.delete(id); load(); } catch (e) { alert(e.message); }
  };

  const canEdit = (p) => user?.role === 'admin' || p.owner?._id === user?._id || p.owner === user?._id;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Projects</h2>
          <p>{pagination.total ?? 0} projects total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Project</button>
      </div>

      <div className="page-body">
        <div className="toolbar">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input" placeholder="Search projects..." value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
          </div>
          <div className="filter-row">
            <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value, page: 1 }))}>
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7a2 2 0 012-2h6l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2z"/></svg>
            <h3>No projects found</h3>
            <p>Create your first project to get started</p>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}>+ New Project</button>
          </div>
        ) : (
          <>
            <div className="card-grid card-grid-2">
              {projects.map(p => (
                <div key={p._id} style={{ position: 'relative' }}>
                  <Link to={`/projects/${p._id}`} className="project-card">
                    <div className="project-card-header">
                      <div>
                        <div className="project-card-title">{p.name}</div>
                        {p.description && <div className="project-card-desc" style={{ marginTop: 6 }}>{p.description}</div>}
                      </div>
                      <span className={`badge badge-${p.status === 'on-hold' ? 'onhold' : p.status}`}>{p.status}</span>
                    </div>
                    <div className="project-card-meta">
                      <span className={`badge badge-${p.priority}`}>{p.priority}</span>
                      {p.taskCount !== undefined && <span>📋 {p.taskCount} tasks</span>}
                      {p.dueDate && <span>📅 {new Date(p.dueDate).toLocaleDateString()}</span>}
                    </div>
                    <div className="project-card-footer">
                      <div className="flex items-center gap-8">
                        <div className="members-row">
                          {(p.members || []).slice(0, 4).map((m, i) => (
                            <div key={i} className="member-avatar">{(m.name || 'U')[0]}</div>
                          ))}
                        </div>
                        <span className="text-sm text-muted">{p.owner?.name}</span>
                      </div>
                    </div>
                  </Link>
                  {canEdit(p) && (
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary btn-icon" onClick={(e) => { e.preventDefault(); setModal(p); }} title="Edit">✏️</button>
                      <button className="btn btn-sm btn-danger btn-icon" onClick={(e) => { e.preventDefault(); handleDelete(p._id); }} title="Delete">🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</button>
                <span className="page-info">Page {pagination.page} of {pagination.pages}</span>
                <button className="page-btn" disabled={!pagination.hasMore} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <ProjectModal
          project={modal === 'create' ? null : modal}
          users={users}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
