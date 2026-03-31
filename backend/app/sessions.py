"""
In-memory session store for Sherlock chatbot.

Each session keeps a generated mystery case, chat history, current test type,
and score history for evaluation.
"""
from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Literal, Optional, TypedDict


TestType = Literal["generalisation", "memorisation", "reasoning", "consistency"]


class Message(TypedDict):
  role: Literal["user", "model"]
  text: str


@dataclass
class Case:
  title: str
  suspects: List[str]
  clues: List[str]
  solution: str

  def to_public_dict(self) -> Dict[str, object]:
    """Return case data without exposing the solution."""
    return {"title": self.title, "suspects": self.suspects, "clues": self.clues}


@dataclass
class ScoreEntry:
  test_type: TestType
  question_id: str
  expected: str
  answer: str
  score: float


@dataclass
class SessionState:
  current_case: Optional[Case] = None
  chat_history: List[Message] = field(default_factory=list)
  current_test: Optional[TestType] = None
  score_history: List[ScoreEntry] = field(default_factory=list)


_sessions: Dict[str, SessionState] = {}
_lock = threading.Lock()


def create_session() -> str:
  """Create a new session and return its ID."""
  session_id = uuid.uuid4().hex
  with _lock:
    _sessions[session_id] = SessionState()
  return session_id


def get_session(session_id: str) -> Optional[SessionState]:
  with _lock:
    return _sessions.get(session_id)


def get_or_create_session(session_id: Optional[str]) -> tuple[str, SessionState, bool]:
  """
  Return (session_id, state, is_new). If session_id is None or unknown, create a new one.
  """
  if not session_id:
    new_id = create_session()
    state = get_session(new_id)
    assert state is not None
    return new_id, state, True
  with _lock:
    state = _sessions.get(session_id)
    if state is None:
      state = SessionState()
      _sessions[session_id] = state
      return session_id, state, True
    return session_id, state, False


def serialise_session(session_id: str, state: SessionState) -> Dict[str, object]:
  """Return a JSON-serialisable snapshot of a session for debugging/inspection."""
  return {
    "session_id": session_id,
    "current_case": state.current_case.to_public_dict() if state.current_case else None,
    "chat_history": list(state.chat_history),
    "current_test": state.current_test,
    "score_history": [asdict(s) for s in state.score_history],
  }

