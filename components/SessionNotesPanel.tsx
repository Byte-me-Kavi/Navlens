"use client";

import React, { useState, useEffect } from "react";
import { FiMessageSquare, FiTag, FiPlus, FiX, FiEdit2, FiTrash2, FiSave } from "react-icons/fi";
import { secureApi } from "@/lib/secureApi";

interface SessionNote {
  id: string;
  session_id: string;
  note: string;
  tags: string[];
  created_at: string;
  created_by: string;
}

interface SessionNotesPanelProps {
  sessionId: string;
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionNotesPanel({ sessionId, siteId, isOpen, onClose }: SessionNotesPanelProps) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTags, setNewTags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch notes
  useEffect(() => {
    if (!isOpen || !sessionId || !siteId) return;

    const fetchNotes = async () => {
      setLoading(true);
      try {
        // SECURITY: Uses POST with encrypted response
        const data = await secureApi.sessions.notes.list(sessionId, siteId);
        setNotes((data.notes as SessionNote[]) || []);
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [isOpen, sessionId, siteId]);

  // Add new note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const tags = newTags.split(",").map(t => t.trim()).filter(t => t);
      const response = await fetch("/api/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, sessionId, note: newNote.trim(), tags }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(prev => [data.note, ...prev]);
        setNewNote("");
        setNewTags("");
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setSaving(false);
    }
  };

  // Update note
  const handleUpdateNote = async (id: string) => {
    if (!editNote.trim()) return;

    setSaving(true);
    try {
      const tags = editTags.split(",").map(t => t.trim()).filter(t => t);
      const response = await fetch("/api/session-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, note: editNote.trim(), tags }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(prev => prev.map(n => n.id === id ? data.note : n));
        setEditingId(null);
        setEditNote("");
        setEditTags("");
      }
    } catch (error) {
      console.error("Failed to update note:", error);
    } finally {
      setSaving(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;

    try {
      const response = await fetch(`/api/session-notes?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  // Start editing
  const startEditing = (note: SessionNote) => {
    setEditingId(note.id);
    setEditNote(note.note);
    setEditTags(note.tags.join(", "));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <FiMessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Session Notes</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* Add Note Form */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this session..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          rows={3}
        />
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <FiTag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || saving}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiMessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <p className="text-sm">Add a note to mark important observations</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none"
                    rows={3}
                  />
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={saving}
                      className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                    >
                      <FiSave className="w-4 h-4" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(note)}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Keyboard hint */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Session ID: {sessionId.slice(0, 12)}...
        </p>
      </div>
    </div>
  );
}
