import React, { useState, useEffect, useCallback } from 'react';
import { tasksAPI, projectsAPI, authAPI } from '../api';
import useAuthStore from '../store/authStore';

const INIT = { title: '', description: '', project: '', status: 'todo', priority: 'medium', assignee: '', dueDate: '' };

function TaskModal({ task, projects, users, onClose, onSaved }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState(task ? {
    ...task,
    project: task.project?._id || task.project || '',
    assignee: task.assignee?._id || task.assignee || '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  } : INIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, assignee: form.assignee || undefined, dueDate: form.dueDate || undefined };
      if (task) await tasksAPI.update(task._id, payload);
      else await tasksAPI.create(payload);
      onSaved();
    } catch (err) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{task ? 'Edit Task' : 'New Task'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Implement login flow" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." />
          </div>
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select className="form-select" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required>
              <option value="">Select project...</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
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
              <label className="form-label">Assignee</label>
              <select className="form-select" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', project: '', search: '', myTasks: '', page: 1, limit: 15 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await tasksAPI.getAll(params);
      setTasks(res.data);
      setPagination(res.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      projectsAPI.getAll({ limit: 100 }),
      user.role === 'admin' ? authAPI.getUsers() : Promise.resolve({ users: [] })
    ]).then(([pr, ur]) => {
      setProjects(pr.data);
      setUsers(ur.users);
    }).catch(() => {});
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try { await tasksAPI.delete(id); load(); } catch (e) { alert(e.message); }
  };

  const toggleStatus = async (task) => {
    const next = task.status === 'done' ? 'todo' : 'done';
    try { await tasksAPI.update(task._id, { status: next }); load(); } catch (e) { alert(e.message); }
  };

  const getBadgeClass = (status) => {
    const m = { 'in-progress': 'inprogress', todo: 'todo', review: 'review', done: 'done' };
    return `badge badge-${m[status] || status}`;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Tasks</h2>
          <p>{pagination.total ?? 0} tasks total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Task</button>
      </div>

      <div className="page-body">
        <div className="toolbar">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input" placeholder="Search tasks..." value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
          </div>
          <div className="filter-row">
            <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
              <option value="">All Status</option>
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
            <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value, page: 1 }))}>
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select className="filter-select" value={filters.project} onChange={e => setFilters(f => ({ ...f, project: e.target.value, page: 1 }))}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <button className={`btn btn-sm ${filters.myTasks ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilters(f => ({ ...f, myTasks: f.myTasks ? '' : 'true', page: 1 }))}>
              My Tasks
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <h3>No tasks found</h3>
            <p>Create a task or adjust your filters</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due</th>
                    <th style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task._id}>
                      <td>
                        <div className={`task-check ${task.status === 'done' ? 'done' : ''}`} onClick={() => toggleStatus(task)} style={{ cursor: 'pointer' }}>
                          {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'inherit' }}>
                          {task.title}
                        </div>
                      </td>
                      <td><span className="text-secondary text-sm">{task.project?.name || '—'}</span></td>
                      <td><span className="text-secondary text-sm">{task.assignee?.name || <span className="text-muted">Unassigned</span>}</span></td>
                      <td><span className={getBadgeClass(task.status)}>{task.status}</span></td>
                      <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                      <td>
                        {task.dueDate ? (
                          <span className="text-sm" style={{ color: new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        ) : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setModal(task)} title="Edit">✏️</button>
                          <button className="btn btn-sm btn-danger btn-icon" onClick={() => handleDelete(task._id)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</button>
                <span className="page-info">{pagination.page} / {pagination.pages}</span>
                <button className="page-btn" disabled={!pagination.hasMore} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          projects={projects}
          users={users}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
