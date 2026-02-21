import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar } from 'lucide-react';
import { CuratedNote } from '../components/CuratedNote';
import {
  getBriefingsByLink,
  type PersistedBriefing,
} from '../services/briefing-db-service';
import { getRepliesByBriefing } from '../services/reply-service';
import type { CuratedBriefing } from '../types';
import './LinkDetail.css';

export function LinkDetail() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [briefings, setBriefings] = useState<PersistedBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBriefing, setSelectedBriefing] =
    useState<PersistedBriefing | null>(null);
  const [repliesMap, setRepliesMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!linkId) return;
    getBriefingsByLink(linkId).then((data) => {
      setBriefings(data);
      if (data.length > 0) {
        setSelectedBriefing(data[0]);
      }
      setLoading(false);
    });
  }, [linkId]);

  // Fetch replies when selected briefing changes
  useEffect(() => {
    if (!selectedBriefing) {
      setRepliesMap(new Map());
      return;
    }
    getRepliesByBriefing(selectedBriefing.id).then((replies) => {
      const map = new Map<number, string>();
      replies.forEach((r) => map.set(r.question_index, r.answer_text));
      setRepliesMap(map);
    });
  }, [selectedBriefing?.id]);

  if (loading) {
    return (
      <div className='link-detail'>
        <p className='link-detail__loading'>Cargando briefings...</p>
      </div>
    );
  }

  return (
    <div className='link-detail'>
      {/* Header */}
      <header className='link-detail__header'>
        <button
          className='link-detail__back'
          onClick={() => navigate('/dashboard')}
          type='button'
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>
      </header>

      {briefings.length === 0 ? (
        <div className='link-detail__empty glass-card'>
          <FileText size={32} />
          <p>Todavía no hay briefings en este link.</p>
          <p>Compartilo con tu cliente para empezar a recibir.</p>
        </div>
      ) : (
        <div className='link-detail__content'>
          {/* Sidebar: briefing list */}
          <aside className='link-detail__sidebar'>
            <h3 className='link-detail__sidebar-title'>
              Briefings ({briefings.length})
            </h3>
            <ul className='link-detail__briefing-list'>
              {briefings.map((b) => (
                <li key={b.id}>
                  <button
                    className={`link-detail__briefing-item glass-card ${
                      selectedBriefing?.id === b.id
                        ? 'link-detail__briefing-item--active'
                        : ''
                    }`}
                    onClick={() => setSelectedBriefing(b)}
                    type='button'
                  >
                    <span className='link-detail__briefing-title'>
                      {(b.curated_json as CuratedBriefing).title}
                    </span>
                    <span className='link-detail__briefing-date'>
                      <Calendar size={10} />
                      {new Date(b.created_at).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Main: selected briefing */}
          <main className='link-detail__main'>
            {selectedBriefing && (
              <CuratedNote
                briefing={selectedBriefing.curated_json as CuratedBriefing}
                onReset={() => {}}
                initialReplies={repliesMap}
                viewMode='admin'
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
