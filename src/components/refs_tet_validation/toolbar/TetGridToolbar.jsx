import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import { api } from '../../../api';

export default function TetGridToolbar({
  displayOptions,
  setDisplayOptions,
  allTopics,
  hiddenTopicCuries,
  setHiddenTopicCuries,
  allSources,
  sourceFilterModel,
  setSourceFilterModel,
  mod,
  onAddTopic,
}) {
  const [topicSuggestions, setTopicSuggestions] = useState([]);
  const [topicQueryLoading, setTopicQueryLoading] = useState(false);

  async function searchTopics(q) {
    if (!q) return;
    setTopicQueryLoading(true);
    try {
      const r = await api.get(
        `/atp/search_topic/${encodeURIComponent(q)}`,
        { params: mod ? { mod_abbr: mod } : {} }
      );
      setTopicSuggestions(
        (r.data || []).map((t) => ({ curie: t.curie, name: t.name }))
      );
    } finally {
      setTopicQueryLoading(false);
    }
  }

  return (
    <div className="tetv-toolbar">
      <span className="tetv-toolbar-group">
        <Form.Check
          inline
          type="checkbox"
          id="tetv-inline"
          label="Inline note"
          checked={!!displayOptions.inlineNote}
          onChange={(e) =>
            setDisplayOptions({ ...displayOptions, inlineNote: e.target.checked })
          }
        />
        <Form.Check
          inline
          type="checkbox"
          id="tetv-level"
          label="Confidence level"
          checked={!!displayOptions.showLevel}
          onChange={(e) =>
            setDisplayOptions({ ...displayOptions, showLevel: e.target.checked })
          }
        />
        <Form.Check
          inline
          type="checkbox"
          id="tetv-score"
          label="Confidence score"
          checked={!!displayOptions.showScore}
          onChange={(e) =>
            setDisplayOptions({ ...displayOptions, showScore: e.target.checked })
          }
        />
      </span>

      <span className="tetv-toolbar-group">
        <details>
          <summary>
            Topics ({allTopics.length - hiddenTopicCuries.size}/{allTopics.length})
          </summary>
          <div className="tetv-toolbar-multi">
            {allTopics.map((t) => (
              <div key={t.curie}>
                <input
                  type="checkbox"
                  id={`tv-${t.curie}`}
                  checked={!hiddenTopicCuries.has(t.curie)}
                  onChange={(e) => {
                    const next = new Set(hiddenTopicCuries);
                    if (e.target.checked) next.delete(t.curie);
                    else next.add(t.curie);
                    setHiddenTopicCuries(next);
                  }}
                />
                <label htmlFor={`tv-${t.curie}`}> {t.name || t.curie}</label>
              </div>
            ))}
          </div>
        </details>
      </span>

      <span className="tetv-toolbar-group">
        <details>
          <summary>
            Sources ({sourceFilterModel ? sourceFilterModel.length : allSources.length}/
            {allSources.length})
          </summary>
          <div className="tetv-toolbar-multi">
            {allSources.map((s) => {
              const active = !sourceFilterModel || sourceFilterModel.includes(s);
              return (
                <div key={s}>
                  <input
                    type="checkbox"
                    id={`sf-${s}`}
                    checked={active}
                    onChange={(e) => {
                      const base = sourceFilterModel || [...allSources];
                      const next = e.target.checked
                        ? [...new Set([...base, s])]
                        : base.filter((x) => x !== s);
                      setSourceFilterModel(
                        next.length === allSources.length ? null : next
                      );
                    }}
                  />
                  <label htmlFor={`sf-${s}`}> {s}</label>
                </div>
              );
            })}
          </div>
        </details>
      </span>

      <span className="tetv-toolbar-group">
        <AsyncTypeahead
          id="tetv-add-topic"
          isLoading={topicQueryLoading}
          minLength={1}
          options={topicSuggestions}
          labelKey="name"
          placeholder="+ Add topic"
          onSearch={searchTopics}
          onChange={(selected) => {
            if (selected[0]) {
              onAddTopic({
                curie: selected[0].curie,
                name: selected[0].name,
              });
            }
          }}
        />
      </span>
    </div>
  );
}
