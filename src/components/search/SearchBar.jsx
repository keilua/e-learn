import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { searchService } from '@/services/SearchService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const SearchBar = ({ className }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Debounce logic for suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions(query);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const fetchSuggestions = async (searchTerm) => {
    setLoading(true);
    try {
      const results = await searchService.getSuggestions(searchTerm);
      setSuggestions(results);
      setIsOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsOpen(false);
    if (user) {
      searchService.saveSearch(user.id, query);
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    
    // Optional: navigate directly if it's a specific entity
    if (suggestion.type === 'course') {
      navigate(`/courses/${suggestion.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full max-w-md z-50", className)}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search courses, teachers, discussions..."
          className="pl-9 pr-12 w-full bg-background/50 border-muted-foreground/20 text-foreground placeholder:text-muted-foreground/70"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2 && suggestions.length > 0) setIsOpen(true);
          }}
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </form>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border border-border rounded-md shadow-xl z-[100] overflow-hidden animate-in fade-in-0 zoom-in-95">
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.type}-${suggestion.id}-${index}`}>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.type === 'course' ? (
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="truncate">{suggestion.text}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">{suggestion.type}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;