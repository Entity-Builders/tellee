import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Link as LinkIcon,
  ExternalLink,
  LogOut,
  MessageSquareText,
  FileText,
  X,
  Trash2,
  Sparkles,
  Pencil,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import {
  listMyLinks,
  createBriefingLink,
  deleteLink,
  type BriefingLink,
} from '../services/link-service';
import { countBriefingsByLink } from '../services/briefing-db-service';
import { generateSeedQuestions } from '../services/briefing-service';
import type { SeedQuestion } from '../types';
import { APP_NAME } from '../constants';
import './Dashboard.css';

interface LinkWithCount extends BriefingLink {
  briefingCount: number;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [seedQuestions, setSeedQuestions] = useState<SeedQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingLink, setDeletingLink] = useState<LinkWithCount | null>(null);
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [editingQuestionText, setEditingQuestionText] = useState('');

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const rawLinks = await listMyLinks();
      const withCounts = await Promise.all(
        rawLinks.map(async (link) => ({
          ...link,
          briefingCount: await countBriefingsByLink(link.id),
        })),
      );
      setLinks(withCounts);
    } catch (err) {
      console.error('Failed to load links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createBriefingLink(
        newTitle.trim(),
        newContext.trim() || undefined,
        newNotes.trim() || undefined,
        seedQuestions.length > 0 ? seedQuestions : undefined,
      );
      setNewTitle('');
      setNewContext('');
      setNewNotes('');
      setSeedQuestions([]);
      setShowCreate(false);
      await loadLinks();
    } catch (err) {
      console.error('Failed to create link:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!newNotes.trim()) return;
    setGenerating(true);
    try {
      const questions = await generateSeedQuestions(
        newNotes.trim(),
        newContext.trim() || undefined,
      );
      setSeedQuestions(questions);
    } catch (err) {
      console.error('Failed to generate questions:', err);
    } finally {
      setGenerating(false);
    }
  };

  const removeSeedQuestion = (id: string) => {
    setSeedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addCustomQuestion = () => {
    if (!newCustomQuestion.trim()) return;
    const q: SeedQuestion = {
      id: `custom-${Date.now()}`,
      question: newCustomQuestion.trim(),
      reason: 'Agregada manualmente',
    };
    setSeedQuestions((prev) => [...prev, q]);
    setNewCustomQuestion('');
  };

  const startEditQuestion = (q: SeedQuestion) => {
    setEditingQuestionId(q.id);
    setEditingQuestionText(q.question);
  };

  const saveEditQuestion = () => {
    if (!editingQuestionId || !editingQuestionText.trim()) return;
    setSeedQuestions((prev) =>
      prev.map((q) =>
        q.id === editingQuestionId
          ? { ...q, question: editingQuestionText.trim() }
          : q,
      ),
    );
    setEditingQuestionId(null);
    setEditingQuestionText('');
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/b/${slug}`;
    await navigator.clipboard.writeText(url);
  };

  const confirmDelete = async () => {
    if (!deletingLink) return;
    try {
      await deleteLink(deletingLink.id);
      setDeletingLink(null);
      await loadLinks();
    } catch (err) {
      console.error('Failed to delete link:', err);
    }
  };

  return (
    <div className='dashboard'>
      {/* Header */}
      <header className='dashboard__header'>
        <div className='dashboard__brand'>
          <div className='dashboard__logo'>
            <MessageSquareText size={18} />
          </div>
          <h1 className='dashboard__title'>{APP_NAME}</h1>
        </div>
        <div className='dashboard__user'>
          <span className='dashboard__email'>{user?.email}</span>
          <button
            className='dashboard__logout'
            onClick={signOut}
            type='button'
            title='Cerrar sesión'
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className='dashboard__main'>
        <div className='dashboard__toolbar'>
          <h2 className='dashboard__section-title'>Mis Links</h2>
          <button
            className='dashboard__create-btn'
            onClick={() => setShowCreate(true)}
            type='button'
          >
            <Plus size={16} />
            <span>Crear Link</span>
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className='dashboard__create-form glass-card animate-fade-in-up'>
            <div className='dashboard__create-form-header'>
              <h3>Nuevo Link de Briefing</h3>
              <button
                className='dashboard__create-form-close'
                onClick={() => setShowCreate(false)}
                type='button'
              >
                <X size={16} />
              </button>
            </div>
            <input
              className='dashboard__input'
              type='text'
              placeholder='Nombre del proyecto (ej: "Sitio Web para Juan")'
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <input
              className='dashboard__input'
              type='text'
              placeholder='Contexto profesional (opcional, ej: "Desarrollo Web")'
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
            />

            {/* Context Notes */}
            <div className='dashboard__notes-section'>
              <label className='dashboard__label'>Notas del Proyecto</label>
              <textarea
                className='dashboard__textarea'
                placeholder='Pegá texto de WhatsApp, notas, info del cliente... Todo lo que sirva de contexto para generar mejores preguntas.'
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={4}
              />
              {newNotes.trim().length > 0 && (
                <button
                  className='dashboard__generate-btn'
                  onClick={handleGenerateQuestions}
                  disabled={generating}
                  type='button'
                >
                  <Sparkles size={14} />
                  <span>
                    {generating ? 'Generando...' : 'Generar Preguntas con AI'}
                  </span>
                </button>
              )}
            </div>

            {/* Seed Questions */}
            {seedQuestions.length > 0 && (
              <div className='dashboard__seed-questions'>
                <label className='dashboard__label'>
                  Preguntas para el Cliente
                </label>
                <ul className='dashboard__seed-list'>
                  {seedQuestions.map((q) => (
                    <li key={q.id} className='dashboard__seed-item'>
                      {editingQuestionId === q.id ? (
                        <div className='dashboard__seed-edit'>
                          <input
                            className='dashboard__seed-edit-input'
                            value={editingQuestionText}
                            onChange={(e) =>
                              setEditingQuestionText(e.target.value)
                            }
                            onKeyDown={(e) =>
                              e.key === 'Enter' && saveEditQuestion()
                            }
                            autoFocus
                          />
                          <button
                            className='dashboard__seed-action'
                            onClick={saveEditQuestion}
                            type='button'
                            title='Guardar'
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className='dashboard__seed-text'>
                            💬 {q.question}
                          </span>
                          <div className='dashboard__seed-actions'>
                            <button
                              className='dashboard__seed-action'
                              onClick={() => startEditQuestion(q)}
                              type='button'
                              title='Editar'
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              className='dashboard__seed-action dashboard__seed-action--remove'
                              onClick={() => removeSeedQuestion(q.id)}
                              type='button'
                              title='Eliminar'
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <div className='dashboard__seed-add'>
                  <input
                    className='dashboard__seed-add-input'
                    type='text'
                    placeholder='Agregar pregunta personalizada...'
                    value={newCustomQuestion}
                    onChange={(e) => setNewCustomQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomQuestion()}
                  />
                  <button
                    className='dashboard__seed-add-btn'
                    onClick={addCustomQuestion}
                    disabled={!newCustomQuestion.trim()}
                    type='button'
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            <button
              className='dashboard__submit-btn'
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
              type='button'
            >
              {creating ? 'Creando...' : 'Crear Link'}
            </button>
          </div>
        )}

        {/* Links Grid */}
        {loading ? (
          <p className='dashboard__empty'>Cargando...</p>
        ) : links.length === 0 ? (
          <div className='dashboard__empty glass-card'>
            <LinkIcon size={32} />
            <p>No tenés links todavía.</p>
            <p>Creá uno para empezar a recibir briefings de tus clientes.</p>
          </div>
        ) : (
          <div className='dashboard__links-grid'>
            {links.map((link) => (
              <div key={link.id} className='dashboard__link-card glass-card'>
                <div className='dashboard__link-info'>
                  <h3 className='dashboard__link-title'>{link.title}</h3>
                  {link.profession_context && (
                    <span className='dashboard__link-context'>
                      {link.profession_context}
                    </span>
                  )}
                  <div className='dashboard__link-meta'>
                    <span className='dashboard__link-count'>
                      <FileText size={12} />
                      {link.briefingCount}{' '}
                      {link.briefingCount === 1 ? 'briefing' : 'briefings'}
                    </span>
                    <span
                      className={`dashboard__link-status dashboard__link-status--${link.status}`}
                    >
                      {link.status === 'completed'
                        ? '✓ Completado'
                        : '⏳ Pendiente'}
                    </span>
                    <span className='dashboard__link-date'>
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className='dashboard__link-actions'>
                  <button
                    className='dashboard__link-btn'
                    onClick={() => copyLink(link.slug)}
                    type='button'
                    title='Copiar link'
                  >
                    <LinkIcon size={14} />
                  </button>
                  <button
                    className='dashboard__link-btn'
                    onClick={() => window.open(`/b/${link.slug}`, '_blank')}
                    type='button'
                    title='Abrir link'
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    className='dashboard__link-btn dashboard__link-btn--primary'
                    onClick={() => navigate(`/dashboard/link/${link.id}`)}
                    type='button'
                    title='Ver briefings'
                  >
                    <FileText size={14} />
                    <span>Ver</span>
                  </button>
                  <button
                    className='dashboard__link-btn dashboard__link-btn--danger'
                    onClick={() => setDeletingLink(link)}
                    type='button'
                    title='Eliminar link'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deletingLink && (
        <div
          className='dashboard__confirm-overlay'
          onClick={() => setDeletingLink(null)}
        >
          <div
            className='dashboard__confirm-modal glass-card animate-fade-in-up'
            onClick={(e) => e.stopPropagation()}
          >
            <h3>¿Eliminar link?</h3>
            <p>
              Se eliminará <strong>"{deletingLink.title}"</strong> y todos sus
              briefings asociados. Esta acción no se puede deshacer.
            </p>
            <div className='dashboard__confirm-actions'>
              <button
                className='dashboard__confirm-btn dashboard__confirm-btn--cancel'
                onClick={() => setDeletingLink(null)}
                type='button'
              >
                Cancelar
              </button>
              <button
                className='dashboard__confirm-btn dashboard__confirm-btn--delete'
                onClick={confirmDelete}
                type='button'
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
