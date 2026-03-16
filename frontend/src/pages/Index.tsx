import { useState } from "react";
import {
  askSherlock,
  explainDeduction,
  generateMystery,
  runTest,
  evaluateAnswer,
  type MysteryCase,
  type TestType,
} from "../api/client";
import { Tabs, TabPanel } from "../components/Tabs";
import { CasePanel } from "../components/CasePanel";
import { SamplePrompts } from "../components/SamplePrompts";

type TabId = "generalisation" | "reasoning" | "consistency" | "memorisation" | "chat";

interface TestState {
  questionId: string;
  prompt: string;
  expected: string;
  lastAnswer: string;
  lastScore: number | null;
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>("generalisation");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mystery, setMystery] = useState<MysteryCase | null>(null);
  const [cluesRevealed, setCluesRevealed] = useState(false);
  const [tests, setTests] = useState<Record<TestType, TestState | null>>({
    generalisation: null,
    reasoning: null,
    consistency: null,
    memorisation: null,
  });

  const runSherlock = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await askSherlock(text);
      setAnswer(res.answer);
      if (res.case) setMystery(res.case);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMystery = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateMystery();
      setMystery(res.case);
      setCluesRevealed(false);
      setAnswer("");
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate mystery");
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await explainDeduction();
      setAnswer(res.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to explain deduction");
    } finally {
      setLoading(false);
    }
  };

  const triggerTest = async (type: TestType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runTest(type);
      setTests((prev) => ({
        ...prev,
        [type]: {
          questionId: res.question_id,
          prompt: res.prompt,
          expected: res.expected_answer,
          lastAnswer: "",
          lastScore: null,
        },
      }));
      setPrompt(res.prompt);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run test");
    } finally {
      setLoading(false);
    }
  };

  const scoreCurrent = async (type: TestType) => {
    const state = tests[type];
    if (!state) return;
    const model_answer = answer || "(no answer)";
    setLoading(true);
    setError(null);
    try {
      const res = await evaluateAnswer({
        question_id: state.questionId,
        test_type: type,
        expected_answer: state.expected,
        model_answer,
      });
      setTests((prev) => ({
        ...prev,
        [type]: {
          ...state,
          lastAnswer: model_answer,
          lastScore: res.score,
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to evaluate");
    } finally {
      setLoading(false);
    }
  };

  const renderScore = (type: TestType) => {
    const state = tests[type];
    if (!state || state.lastScore == null) return null;
    const pct = Math.round(state.lastScore * 100);
    return (
      <div className="score-panel">
        <p>Score: <strong>{pct}%</strong></p>
        <div className="score-bar">
          <div className="score-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "generalisation", label: "Generalisation Test", tooltip: "Tiny mysteries and novel situations" },
    { id: "reasoning", label: "Reasoning / Deduction", tooltip: "Depth of step-by-step reasoning" },
    { id: "consistency", label: "Consistency / Facts", tooltip: "Track consistency across answers" },
    { id: "memorisation", label: "Memorisation / Holdout", tooltip: "General knowledge and recall" },
    { id: "chat", label: "Free Chat", tooltip: "Unstructured conversation with Sherlock" },
  ] as const;

  const currentTestType = ((): TestType | null => {
    if (activeTab === "chat") return null;
    return activeTab as TestType;
  })();

  return (
    <div className="index-page">
      <h1 style={{ marginTop: 0 }}>Sherlock Evaluation & Chat</h1>
      <p className="muted">
        Run targeted tests or chat freely — scores feed into the Evaluation dashboard in real time.
      </p>

      <Tabs
        tabs={tabs as any}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      <CasePanel
        caseData={mystery}
        revealed={cluesRevealed}
        onReveal={() => setCluesRevealed((v) => !v)}
      />

      <SamplePrompts onUsePrompt={(text) => setPrompt(text)} />

      <div className="input-row">
        <textarea
          className="prompt-input"
          placeholder={
            currentTestType
              ? "Run the test, then refine or send the prompt…"
              : "Chat with Sherlock Holmes…"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={runSherlock}
          disabled={loading || !prompt.trim()}
        >
          {loading ? "Thinking…" : "Ask Sherlock"}
        </button>
      </div>

      <div className="panel-row">
        <div className="response-box">
          <h2>Model response</h2>
          {loading && !answer && <p className="typing-indicator">Thinking…</p>}
          <div className="response-text">{answer}</div>
        </div>

        <div className="side-panel">
          <TabPanel visible={activeTab === "generalisation"}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => triggerTest("generalisation")}
              disabled={loading}
            >
              Run generalisation test
            </button>
            {renderScore("generalisation")}
          </TabPanel>

          <TabPanel visible={activeTab === "reasoning"}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => triggerTest("reasoning")}
              disabled={loading}
            >
              Run reasoning test
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={handleExplain}
              disabled={loading || !mystery}
            >
              Explain deduction for current case
            </button>
            {renderScore("reasoning")}
          </TabPanel>

          <TabPanel visible={activeTab === "consistency"}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => triggerTest("consistency")}
              disabled={loading}
            >
              Run consistency test
            </button>
            {renderScore("consistency")}
          </TabPanel>

          <TabPanel visible={activeTab === "memorisation"}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => triggerTest("memorisation")}
              disabled={loading}
            >
              Run memorisation test
            </button>
            {renderScore("memorisation")}
          </TabPanel>

          <TabPanel visible={activeTab === "chat"}>
            <p className="muted">
              Free-form conversation with Sherlock Holmes. Use the buttons above to generate a mystery.
            </p>
            <button
              type="button"
              className="secondary-btn"
              onClick={handleGenerateMystery}
              disabled={loading}
            >
              Generate new mystery
            </button>
          </TabPanel>
        </div>
      </div>

      {currentTestType && (
        <div className="score-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => scoreCurrent(currentTestType)}
            disabled={loading}
          >
            Score this answer
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
