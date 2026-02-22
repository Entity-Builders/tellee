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
  ArrowLeft,
  HelpCircle,
  Settings,
  Save,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import {
  listMyLinks,
  createBriefingLink,
  deleteLink,
  type BriefingLink,
} from '../services/link-service';
import { countBriefingsByLink } from '../services/briefing-db-service';
import {
  generateLinkMetadata,
  type LinkMetadata,
  type ClientQuestionFound,
} from '../services/briefing-service';
import type { SeedQuestion } from '../types';
import { APP_NAME } from '../constants';
import {
  getMyProfile,
  updateMyProfile,
  buildProfileContext,
  type AdminProfile,
} from '../services/profile-service';
import './Dashboard.css';

interface LinkWithCount extends BriefingLink {
  briefingCount: number;
}

type CreatePhase = 'input' | 'generating' | 'review' | 'saving';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingLink, setDeletingLink] = useState<LinkWithCount | null>(null);

  // Create flow state
  const [createPhase, setCreatePhase] = useState<CreatePhase>('input');
  const [description, setDescription] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedContext, setGeneratedContext] = useState('');
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [seedQuestions, setSeedQuestions] = useState<SeedQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  const [clientQuestions, setClientQuestions] = useState<ClientQuestionFound[]>(
    [],
  );
  const [clientAnswers, setClientAnswers] = useState<Record<string, string>>(
    {},
  );

  // Profile state
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    profession: '',
    business_name: '',
    business_description: '',
    default_notes: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    loadLinks();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const p = await getMyProfile();
    if (p) {
      setProfile(p);
      setProfileForm({
        display_name: p.display_name || '',
        profession: p.profession || '',
        business_name: p.business_name || '',
        business_description: p.business_description || '',
        default_notes: p.default_notes || '',
      });
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        display_name: profileForm.display_name || null,
        profession: profileForm.profession || null,
        business_name: profileForm.business_name || null,
        business_description: profileForm.business_description || null,
        default_notes: profileForm.default_notes || null,
      });
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

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

  const resetCreateForm = () => {
    setDescription('');
    setGeneratedTitle('');
    setGeneratedContext('');
    setGeneratedSummary('');
    setSeedQuestions([]);
    setCreatePhase('input');
    setEditingQuestionId(null);
    setEditingTitle(false);
    setNewCustomQuestion('');
    setClientQuestions([]);
    setClientAnswers({});
  };

  const closeCreate = () => {
    setShowCreate(false);
    resetCreateForm();
  };

  // Phase 1 → 2: Generate metadata from description
  const handleGenerate = async () => {
    if (!description.trim()) return;
    setCreatePhase('generating');
    try {
      const profileCtx = buildProfileContext(profile);
      const metadata: LinkMetadata = await generateLinkMetadata(
        description.trim(),
        profileCtx || undefined,
      );
      setGeneratedTitle(metadata.title);
      setGeneratedContext(metadata.professionContext);
      setGeneratedSummary(metadata.summary);
      setSeedQuestions(metadata.seedQuestions);
      setClientQuestions(metadata.clientQuestions);
      setCreatePhase('review');
    } catch (err) {
      console.error('Failed to generate metadata:', err);
      setCreatePhase('input');
    }
  };

  // Quick create: link from profile only (no textarea)
  const handleQuickCreate = async () => {
    if (!profile?.profession) return;
    setShowCreate(false);
    try {
      const title = profile.business_name
        ? `Briefing — ${profile.business_name}`
        : `Briefing — ${profile.profession}`;
      await createBriefingLink(
        title,
        profile.profession || undefined,
        profile.default_notes || undefined,
        undefined,
        profile.business_description || undefined,
      );
      await loadLinks();
    } catch (err) {
      console.error('Failed to quick-create link:', err);
    }
  };

  // Phase 2 → Done: Create the link
  const handleConfirm = async () => {
    if (!generatedTitle.trim()) return;
    setCreatePhase('saving');
    try {
      // Enrich context with client question answers
      let enrichedContext = description.trim();
      const answered = clientQuestions.filter((cq) =>
        clientAnswers[cq.id]?.trim(),
      );
      if (answered.length > 0) {
        enrichedContext += '\n\n--- RESPUESTAS DEL PROFESIONAL ---';
        answered.forEach((cq) => {
          enrichedContext += `\nPregunta: ${cq.question}\nRespuesta: ${clientAnswers[cq.id]}`;
        });
      }

      await createBriefingLink(
        generatedTitle.trim(),
        generatedContext.trim() || undefined,
        enrichedContext,
        seedQuestions.length > 0 ? seedQuestions : undefined,
        generatedSummary.trim() || undefined,
      );
      closeCreate();
      await loadLinks();
    } catch (err) {
      console.error('Failed to create link:', err);
      setCreatePhase('review');
    }
  };

  // Question management
  const removeSeedQuestion = (id: string) => {
    setSeedQuestions((prev) => prev.filter((q) => q.id !== id));
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

  const addCustomQuestion = () => {
    if (!newCustomQuestion.trim()) return;
    setSeedQuestions((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        question: newCustomQuestion.trim(),
        reason: 'Agregada manualmente',
      },
    ]);
    setNewCustomQuestion('');
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
            className={`dashboard__settings ${showProfile ? 'dashboard__settings--active' : ''}`}
            onClick={() => setShowProfile(!showProfile)}
            type='button'
            title='Mi perfil'
          >
            <Settings size={16} />
          </button>
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

      {/* Profile Panel (collapsible) */}
      {showProfile && (
        <div className='dashboard__profile glass-card animate-fade-in-up'>
          <h3 className='dashboard__profile-title'>Mi Perfil Profesional</h3>
          <p className='dashboard__profile-hint'>
            Esta info se usa automáticamente al crear links para enriquecer el
            contexto.
          </p>
          <div className='dashboard__profile-grid'>
            <div className='dashboard__profile-field'>
              <label className='dashboard__label'>Nombre / Empresa</label>
              <input
                className='dashboard__input'
                placeholder='Ej: Studio Textil, Juan Pérez'
                value={profileForm.business_name}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    business_name: e.target.value,
                  }))
                }
              />
            </div>
            <div className='dashboard__profile-field'>
              <label className='dashboard__label'>Profesión / Rubro</label>
              <input
                className='dashboard__input'
                placeholder='Ej: Desarrollo Web, Diseño Textil'
                value={profileForm.profession}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    profession: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className='dashboard__profile-field'>
            <label className='dashboard__label'>Descripción de servicios</label>
            <textarea
              className='dashboard__textarea'
              placeholder='Ej: Fabricamos telas premium para moda y hogar. Especialistas en algodón orgánico.'
              value={profileForm.business_description}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  business_description: e.target.value,
                }))
              }
              rows={2}
            />
          </div>
          <div className='dashboard__profile-field'>
            <label className='dashboard__label'>Notas persistentes</label>
            <textarea
              className='dashboard__textarea'
              placeholder='Info que siempre aplica: restricciones, preferencias, horarios, etc.'
              value={profileForm.default_notes}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  default_notes: e.target.value,
                }))
              }
              rows={2}
            />
          </div>
          <button
            className='dashboard__submit-btn'
            onClick={handleSaveProfile}
            disabled={savingProfile}
            type='button'
          >
            {savingProfile ? (
              'Guardando...'
            ) : profileSaved ? (
              <>
                <Check size={14} />
                <span>Guardado</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Guardar Perfil</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main */}
      <main className='dashboard__main'>
        <div className='dashboard__toolbar'>
          <h2 className='dashboard__section-title'>Mis Links</h2>
          <div className='dashboard__toolbar-actions'>
            {profile?.profession && (
              <button
                className='dashboard__quick-btn'
                onClick={handleQuickCreate}
                type='button'
                title='Crear link rápido usando tu perfil'
              >
                <Zap size={14} />
                <span>Link Rápido</span>
              </button>
            )}
            <button
              className='dashboard__create-btn'
              onClick={() => setShowCreate(true)}
              type='button'
            >
              <Plus size={16} />
              <span>Crear Link</span>
            </button>
          </div>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className='dashboard__create-form glass-card animate-fade-in-up'>
            <div className='dashboard__create-form-header'>
              <h3>
                {createPhase === 'review' || createPhase === 'saving'
                  ? 'Revisá y Confirmá'
                  : 'Nuevo Link de Briefing'}
              </h3>
              <button
                className='dashboard__create-form-close'
                onClick={closeCreate}
                type='button'
              >
                <X size={16} />
              </button>
            </div>

            {/* Phase 1: Input description */}
            {(createPhase === 'input' || createPhase === 'generating') && (
              <>
                <textarea
                  className='dashboard__textarea'
                  placeholder={
                    'Describí el proyecto o pegá texto de WhatsApp, notas, info del cliente...\n\nLa AI genera el título, contexto y preguntas automáticamente.'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  autoFocus
                  disabled={createPhase === 'generating'}
                />
                <button
                  className='dashboard__submit-btn dashboard__submit-btn--ai'
                  onClick={handleGenerate}
                  disabled={!description.trim() || createPhase === 'generating'}
                  type='button'
                >
                  <Sparkles size={14} />
                  <span>
                    {createPhase === 'generating'
                      ? 'Generando...'
                      : 'Generar Link'}
                  </span>
                </button>
              </>
            )}

            {/* Phase 2: Review & edit */}
            {(createPhase === 'review' || createPhase === 'saving') && (
              <>
                {/* Back button */}
                <button
                  className='dashboard__back-btn'
                  onClick={() => setCreatePhase('input')}
                  type='button'
                  disabled={createPhase === 'saving'}
                >
                  <ArrowLeft size={14} />
                  <span>Cambiar descripción</span>
                </button>

                {/* AI Summary */}
                {generatedSummary && (
                  <div className='dashboard__review-field'>
                    <label className='dashboard__label'>
                      Resumen de las notas
                    </label>
                    <p className='dashboard__review-notes'>
                      {generatedSummary}
                    </p>
                  </div>
                )}

                {/* Generated title */}
                <div className='dashboard__review-field'>
                  <label className='dashboard__label'>
                    Título del Proyecto
                  </label>
                  {editingTitle ? (
                    <div className='dashboard__seed-edit'>
                      <input
                        className='dashboard__seed-edit-input'
                        value={generatedTitle}
                        onChange={(e) => setGeneratedTitle(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && setEditingTitle(false)
                        }
                        autoFocus
                      />
                      <button
                        className='dashboard__seed-action'
                        onClick={() => setEditingTitle(false)}
                        type='button'
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className='dashboard__review-title'>
                      <span>{generatedTitle}</span>
                      <button
                        className='dashboard__seed-action'
                        onClick={() => setEditingTitle(true)}
                        type='button'
                        title='Editar título'
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Generated context */}
                {generatedContext && (
                  <div className='dashboard__review-field'>
                    <label className='dashboard__label'>Contexto</label>
                    <span className='dashboard__review-context'>
                      {generatedContext}
                    </span>
                  </div>
                )}

                {/* Seed Questions */}
                <div className='dashboard__seed-questions'>
                  <label className='dashboard__label'>
                    Preguntas para el Cliente ({seedQuestions.length})
                  </label>
                  {seedQuestions.length > 0 && (
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
                  )}
                  <div className='dashboard__seed-add'>
                    <input
                      className='dashboard__seed-add-input'
                      type='text'
                      placeholder='Agregar pregunta personalizada...'
                      value={newCustomQuestion}
                      onChange={(e) => setNewCustomQuestion(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && addCustomQuestion()
                      }
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

                {/* Client Questions Found */}
                {clientQuestions.length > 0 && (
                  <div className='dashboard__client-questions'>
                    <label className='dashboard__label'>
                      <HelpCircle
                        size={12}
                        style={{
                          display: 'inline',
                          verticalAlign: 'middle',
                          marginRight: 4,
                        }}
                      />
                      Preguntas del Cliente Detectadas ({clientQuestions.length}
                      )
                    </label>
                    <p className='dashboard__client-questions-hint'>
                      Respondé estas preguntas antes de crear el link para
                      enriquecer el contexto.
                    </p>
                    <div className='dashboard__client-questions-list'>
                      {clientQuestions.map((cq) => (
                        <div
                          key={cq.id}
                          className='dashboard__client-question-card'
                        >
                          <div className='dashboard__client-question-text'>
                            ❓ {cq.question}
                          </div>
                          {cq.context && (
                            <div className='dashboard__client-question-context'>
                              "{cq.context}"
                            </div>
                          )}
                          <textarea
                            className='dashboard__client-question-answer'
                            placeholder='Tu respuesta...'
                            value={clientAnswers[cq.id] || ''}
                            onChange={(e) =>
                              setClientAnswers((prev) => ({
                                ...prev,
                                [cq.id]: e.target.value,
                              }))
                            }
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm button */}
                <button
                  className='dashboard__submit-btn'
                  onClick={handleConfirm}
                  disabled={!generatedTitle.trim() || createPhase === 'saving'}
                  type='button'
                >
                  {createPhase === 'saving'
                    ? 'Creando...'
                    : '✓ Confirmar y Crear'}
                </button>
              </>
            )}
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
