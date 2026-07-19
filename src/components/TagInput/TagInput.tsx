import { useMemo, useState, type KeyboardEvent } from "react";
import { FiPlus, FiTag, FiX } from "react-icons/fi";
import type { Tag } from "../../types/tag";
import { normalizeTagName } from "../../utils/tags";
import "./TagInput.css";

interface TagInputProps {
  value: string[];
  suggestions: Tag[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ value, suggestions, onChange }: TagInputProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeTagName(query);
  const selectedNames = useMemo(() => new Set(value.map((tag) => tag.toLocaleLowerCase("pt-BR"))), [value]);
  const filteredSuggestions = useMemo(() => suggestions
    .filter((tag) => !selectedNames.has(tag.name.toLocaleLowerCase("pt-BR")))
    .filter((tag) => !normalizedQuery || tag.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery.toLocaleLowerCase("pt-BR")))
    .slice(0, 6), [suggestions, selectedNames, normalizedQuery]);

  function addTag(name: string) {
    const normalized = normalizeTagName(name);
    if (!normalized || selectedNames.has(normalized.toLocaleLowerCase("pt-BR"))) {
      setQuery("");
      return;
    }
    onChange([...value, normalized]);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && normalizedQuery) {
      event.preventDefault();
      addTag(normalizedQuery);
    } else if (event.key === "Backspace" && !query && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      <div className="tag-input__control">
        <FiTag className="tag-input__leading-icon" aria-hidden="true" />
        <div className="tag-input__chips">
          {value.map((tag) => (
            <span key={tag} className="tag-input__chip">
              {tag}
              <button type="button" aria-label={`Remover tag ${tag}`} onClick={() => onChange(value.filter((item) => item !== tag))}>
                <FiX />
              </button>
            </span>
          ))}
          <input
            value={query}
            maxLength={50}
            aria-label="Adicionar tag"
            placeholder={value.length ? "Adicionar outra" : "Digite uma tag"}
            onChange={(event) => setQuery(event.target.value.replace(",", ""))}
            onKeyDown={handleKeyDown}
            onBlur={() => normalizedQuery && addTag(normalizedQuery)}
          />
        </div>
      </div>

      {query && (
        <div className="tag-input__suggestions" role="listbox" aria-label="Sugestões de tags">
          {filteredSuggestions.map((tag) => (
            <button key={tag.id} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(tag.name)}>
              <FiTag /> {tag.name}
            </button>
          ))}
          {normalizedQuery && !suggestions.some((tag) => tag.name.toLocaleLowerCase("pt-BR") === normalizedQuery.toLocaleLowerCase("pt-BR")) && (
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(normalizedQuery)}>
              <FiPlus /> Criar “{normalizedQuery}”
            </button>
          )}
        </div>
      )}
      <small>Pressione Enter ou vírgula para adicionar. Tags novas serão cadastradas automaticamente.</small>
    </div>
  );
}
