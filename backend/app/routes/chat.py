"""
High-level Sherlock chatbot API with session-aware endpoints.

Endpoints:
- POST /api/generate-mystery
- POST /api/ask-sherlock
- POST /api/explain-deduction
- GET  /api/run-test
- POST /api/evaluate
- GET  /api/sample-prompt
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Cookie, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..config import MAX_TOKENS, TEMPERATURE
from ..eval_runtime import aggregate_scores, score_answer
from ..model import get_model
from ..sessions import (
  Case,
  Message,
  ScoreEntry,
  TestType,
  SessionState,
  get_or_create_session,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


class MysteryRequest(BaseModel):
  seed: Optional[str] = None


class MysteryResponse(BaseModel):
  session_id: str
  case: Dict[str, object]


class AskRequest(BaseModel):
  prompt: str


class AskResponse(BaseModel):
  session_id: str
  answer: str
  case: Optional[Dict[str, object]] = None


class ExplainRequest(BaseModel):
  pass


class ExplainResponse(BaseModel):
  session_id: str
  explanation: str


class RunTestResponse(BaseModel):
  session_id: str
  question_id: str
  test_type: TestType
  prompt: str
  expected_answer: str


class EvaluateRequest(BaseModel):
  question_id: str
  test_type: TestType
  expected_answer: str
  model_answer: str


class EvaluateResponse(BaseModel):
  session_id: str
  score: float


class SamplePromptResponse(BaseModel):
  session_id: str
  kind: str
  prompt: str


def _get_or_create_session(
  session_id_cookie: Optional[str], session_header: Optional[str]
) -> tuple[str, SessionState, bool]:
  # Prefer explicit header over cookie, then create.
  sid = session_header or session_id_cookie
  return get_or_create_session(sid)


def _model_call(prompt: str, max_tokens: int = MAX_TOKENS) -> str:
  llm = get_model()
  result = llm(
    prompt,
    max_tokens=max_tokens,
    temperature=TEMPERATURE,
    stop=["<|eot_id|>"],
  )
  # llama-cpp-python returns a dict; text under "choices"
  choices = result.get("choices") or []
  if not choices:
    return ""
  text = choices[0].get("text") or choices[0].get("content") or ""
  return str(text)


def _build_case_prompt(case: Case) -> str:
  suspects_str = ", ".join(case.suspects)
  clues_str = "\n- " + "\n- ".join(case.clues) if case.clues else ""
  return (
    f"You are Sherlock Holmes investigating the case titled '{case.title}'.\n"
    f"Suspects: {suspects_str or 'unknown'}.\n"
    f"Clues:{clues_str or ' (no explicit clues yet).'}\n"
  )


def _build_chat_prompt(case: Optional[Case], history: List[Message], user_message: str) -> str:
  pieces: List[str] = []
  if case is not None:
    pieces.append(_build_case_prompt(case))
  if history:
    pieces.append("Conversation so far between the user and Sherlock Holmes:")
    for msg in history[-10:]:
      prefix = "User" if msg["role"] == "user" else "Sherlock"
      pieces.append(f"{prefix}: {msg['text']}")
  pieces.append("Now respond as Sherlock Holmes with precise deductive reasoning.")
  pieces.append(f"User: {user_message}\nSherlock:")
  return "\n".join(pieces)


def _build_deduction_prompt(case: Case) -> str:
  return (
    f"You are Sherlock Holmes. Explain, step by step, how you would deduce the solution "
    f"to the case '{case.title}' from the following clues and suspects.\n\n"
    f"Suspects: {', '.join(case.suspects) or 'unknown'}\n"
    f"Clues:\n- " + "\n- ".join(case.clues) + "\n\n"
    f"Hidden solution (for your reasoning only, do not reveal directly): {case.solution}\n\n"
    "Provide a numbered list of deduction steps, ending with the conclusion."
  )


def _default_mystery() -> Case:
  """Fallback mystery structure if model-based generation fails."""
  return Case(
    title="The Curious Telegram",
    suspects=["Dr. Watson", "Mrs. Hudson", "Inspector Lestrade"],
    clues=[
      "A telegram arrived with a single smudge of London clay.",
      "The handwriting hesitates on the letter 'H'.",
      "Only one person knew Holmes would be at Baker Street at that exact hour.",
    ],
    solution="Lestrade forged the telegram to lure Holmes to the scene at a time of his choosing.",
  )


@router.post("/generate-mystery", response_model=MysteryResponse)
def generate_mystery(
  body: MysteryRequest,
  session_id_cookie: Optional[str] = Cookie(default=None, alias="session_id"),
  session_header: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
  """
  Generate a structured mystery and attach it to the session.
  The solution is stored server-side and not returned to the client.
  """
  session_id, state, is_new = _get_or_create_session(session_id_cookie, session_header)

  prompt = (
    "You are Sherlock Holmes creating a new detective case. "
    "Return ONLY a JSON object with keys: title (string), suspects (list of 3-5 short names), "
    "clues (list of 3-6 short textual clues), solution (short paragraph). "
    "Do not include any extra commentary or formatting.\n"
  )
  if body.seed:
    prompt += f"\nBase the case loosely on this seed idea: {body.seed}\n"
  try:
    raw = _model_call(prompt, max_tokens=384)
  except Exception as e:
    logger.exception("Failed to generate mystery: %s", e)
    case = _default_mystery()
  else:
    import json

    raw_stripped = raw.strip()
    # Some models wrap JSON in markdown code fences.
    if raw_stripped.startswith("```"):
      raw_stripped = raw_stripped.strip("`")
      if raw_stripped.lower().startswith("json"):
        raw_stripped = raw_stripped[4:]
    try:
      data = json.loads(raw_stripped)
      case = Case(
        title=str(data.get("title") or "Untitled Case"),
        suspects=[str(s) for s in data.get("suspects") or []],
        clues=[str(c) for c in data.get("clues") or []],
        solution=str(data.get("solution") or "Solution not specified."),
      )
    except Exception as e:
      logger.exception("Failed to parse generated mystery JSON: %s", e)
      case = _default_mystery()

  state.current_case = case
  # Reset chat and tests when we start a fresh case.
  state.chat_history.clear()
  state.current_test = None

  resp = MysteryResponse(session_id=session_id, case=case.to_public_dict())
  response = JSONResponse(content=resp.dict())
  if is_new:
    response.set_cookie("session_id", session_id, httponly=True, samesite="lax")
  return response


@router.post("/ask-sherlock", response_model=AskResponse)
def ask_sherlock(
  body: AskRequest,
  session_id_cookie: Optional[str] = Cookie(default=None, alias="session_id"),
  session_header: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
  if not (body.prompt or "").strip():
    raise HTTPException(status_code=400, detail="prompt is required")
  session_id, state, is_new = _get_or_create_session(session_id_cookie, session_header)
  case = state.current_case
  built_prompt = _build_chat_prompt(case, state.chat_history, body.prompt.strip())
  answer = _model_call(built_prompt)
  state.chat_history.append({"role": "user", "text": body.prompt.strip()})
  state.chat_history.append({"role": "model", "text": answer})

  resp = AskResponse(
    session_id=session_id,
    answer=answer,
    case=case.to_public_dict() if case else None,
  )
  response = JSONResponse(content=resp.dict())
  if is_new:
    response.set_cookie("session_id", session_id, httponly=True, samesite="lax")
  return response


@router.post("/explain-deduction", response_model=ExplainResponse)
def explain_deduction(
  body: ExplainRequest,
  session_id_cookie: Optional[str] = Cookie(default=None, alias="session_id"),
  session_header: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
  session_id, state, is_new = _get_or_create_session(session_id_cookie, session_header)
  if state.current_case is None:
    raise HTTPException(status_code=400, detail="No active case; generate one first.")
  prompt = _build_deduction_prompt(state.current_case)
  explanation = _model_call(prompt, max_tokens=512)
  resp = ExplainResponse(session_id=session_id, explanation=explanation)
  response = JSONResponse(content=resp.dict())
  if is_new:
    response.set_cookie("session_id", session_id, httponly=True, samesite="lax")
  return response


_TEST_BANK: Dict[TestType, List[Dict[str, str]]] = {
  "generalisation": [
    {
      "id": "gen-1",
      "prompt": "Solve this tiny mystery: A man is found in a locked room with a puddle of water and a rope. What happened?",
      "expected": "The man stood on a block of ice with a noose; the ice melted.",
    },
  ],
  "reasoning": [
    {
      "id": "reason-1",
      "prompt": "Explain step by step how Holmes would deduce a suspect from muddy bootprints and a burned telegram.",
      "expected": "He analyses the mud's origin, timing from dryness, and the telegram remnants to place the suspect.",
    },
  ],
  "consistency": [
    {
      "id": "cons-1",
      "prompt": "If earlier you concluded the culprit was Lestrade, keep that consistent: who is the culprit now?",
      "expected": "Lestrade remains the culprit.",
    },
  ],
  "memorisation": [
    {
      "id": "mem-1",
      "prompt": "Where is the Eiffel Tower located?",
      "expected": "In Paris, France.",
    },
  ],
}


@router.get("/run-test", response_model=RunTestResponse)
def run_test(
  test_type: TestType,
  session_id_cookie: Optional[str] = Cookie(default=None, alias="session_id"),
  session_header: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
  session_id, state, is_new = _get_or_create_session(session_id_cookie, session_header)
  bank = _TEST_BANK.get(test_type) or []
  if not bank:
    raise HTTPException(status_code=404, detail=f"No tests configured for {test_type}")
  # Simple round-robin based on how many scores we already have for this type.
  seen = [s for s in state.score_history if s.test_type == test_type]
  idx = len(seen) % len(bank)
  q = bank[idx]
  state.current_test = test_type
  resp = RunTestResponse(
    session_id=session_id,
    question_id=q["id"],
    test_type=test_type,
    prompt=q["prompt"],
    expected_answer=q["expected"],
  )
  response = JSONResponse(content=resp.dict())
  if is_new:
    response.set_cookie("session_id", session_id, httponly=True, samesite="lax")
  return response


@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate(
  body: EvaluateRequest,
  session_id_cookie: Optional[str] = Cookie(default=None, alias="session_id"),
  session_header: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
  session_id, state, is_new = _get_or_create_session(session_id_cookie, session_header)
  s = score_answer(body.expected_answer, body.model_answer)
  entry = ScoreEntry(
    test_type=body.test_type,
    question_id=body.question_id,
    expected=body.expected_answer,
    answer=body.model_answer,
    score=s,
  )
  state.score_history.append(entry)
  state.current_test = None
  resp = EvaluateResponse(session_id=session_id, score=s)
  response = JSONResponse(content=resp.dict())
  if is_new:
    response.set_cookie("session_id", session_id, httponly=True, samesite="lax")
  return response


@router.get("/sample-prompt", response_model=SamplePromptResponse)
def sample_prompt(
  kind: str,
  session_id_cookie: Optional[str] = Cookie(default=None, alias="session_id"),
  session_header: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
  session_id, state, is_new = _get_or_create_session(session_id_cookie, session_header)
  mapping = {
    "watson": "What do you think of Dr. Watson?",
    "tiny-mystery": "Invent a tiny mystery and solve it in two paragraphs.",
    "eiffel": "Where is the Eiffel Tower located, and what might Holmes observe about the crowds there?",
  }
  if kind not in mapping:
    raise HTTPException(status_code=400, detail="Unknown sample prompt kind")
  resp = SamplePromptResponse(session_id=session_id, kind=kind, prompt=mapping[kind])
  response = JSONResponse(content=resp.dict())
  if is_new:
    response.set_cookie("session_id", session_id, httponly=True, samesite="lax")
  return response

