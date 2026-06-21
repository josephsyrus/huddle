import React, { useState } from "react";
import { SearchIcon } from "../ui/Icons";

const SearchBar = ({ onSearch, onSelect, resolveName }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  const handleChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const found = await onSearch(value.trim());
    setResults(found);
    setOpen(true);
  };

  const handleSelect = (result) => {
    onSelect(result);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="search-bar">
      <SearchIcon />
      <input
        className="search-input"
        placeholder="Search messages"
        value={query}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">No matches</div>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                className="search-result"
                onClick={() => handleSelect(result)}
              >
                <div className="search-result-meta">
                  {resolveName(result)} · {result.username}
                </div>
                <div className="search-result-text">{result.text}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
