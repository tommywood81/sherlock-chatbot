from app.routes.infer import _confidence_from_alternatives, _extract_alternatives_from_chunk


def test_extract_alternatives_from_chunk_returns_sorted_probs():
    chunk = {
        "choices": [
            {
                "text": " Holmes",
                "logprobs": {
                    "top_logprobs": [
                        {
                            " Holmes": -0.2,
                            " Watson": -1.2,
                            " Lestrade": -2.2,
                        }
                    ]
                },
            }
        ]
    }
    alts = _extract_alternatives_from_chunk(chunk, k=2)
    assert len(alts) == 2
    assert alts[0]["token"] == " Holmes"
    assert float(alts[0]["prob"]) > float(alts[1]["prob"])


def test_extract_alternatives_from_chunk_handles_missing_logprobs():
    chunk = {"choices": [{"text": " Holmes"}]}
    alts = _extract_alternatives_from_chunk(chunk)
    assert alts == []


def test_confidence_from_alternatives_prefers_selected_token_probability():
    alternatives = [
        {"token": "Holmes", "prob": 0.9},
        {"token": "Watson", "prob": 0.1},
    ]
    conf = _confidence_from_alternatives("Watson", alternatives)
    assert conf == 0.1


def test_confidence_from_alternatives_falls_back_to_best_when_selected_missing():
    alternatives = [
        {"token": "Holmes", "prob": 0.9},
        {"token": "Watson", "prob": 0.1},
    ]
    conf = _confidence_from_alternatives("Lestrade", alternatives)
    assert conf == 0.9

