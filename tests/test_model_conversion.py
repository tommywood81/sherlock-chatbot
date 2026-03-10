"""
Stage 5 tests: verify GGUF conversion/quantization configuration.

These tests DO NOT run llama.cpp tools. Instead they confirm:
- expected output paths
- quantization type is Q4_K_M
- built commands reference the correct paths
- optional file existence/size check is skipped when the GGUF is not present yet
"""

from __future__ import annotations

from pathlib import Path

import pytest

from training.convert_to_gguf import (
    MAX_GGUF_BYTES,
    OUTPUT_F16_GGUF,
    OUTPUT_Q4_GGUF,
    QUANTIZATION_TYPE,
    build_conversion_commands,
    gguf_size_ok,
)


def test_conversion_config_constants() -> None:
    assert OUTPUT_Q4_GGUF.name == "sherlock-q4.gguf"
    assert QUANTIZATION_TYPE == "Q4_K_M"
    assert MAX_GGUF_BYTES == 3 * 1024 * 1024 * 1024


def test_build_conversion_commands_paths() -> None:
    cmds = build_conversion_commands()
    assert len(cmds) == 2
    conv_cmd, quant_cmd = cmds
    # First command: python convert-hf-to-gguf.py <hf> --outfile <f16>
    assert "python" in conv_cmd[0].lower()
    assert str(OUTPUT_F16_GGUF) in conv_cmd
    # Second command: quantize <f16> <q4> Q4_K_M
    assert str(OUTPUT_F16_GGUF) in quant_cmd
    assert str(OUTPUT_Q4_GGUF) in quant_cmd
    assert QUANTIZATION_TYPE in quant_cmd


def test_q4_file_exists_and_under_3gb_or_skipped() -> None:
    """If sherlock-q4.gguf exists, ensure size <= 3GB; otherwise skip."""
    if not OUTPUT_Q4_GGUF.exists():
        pytest.skip("sherlock-q4.gguf not present yet; run conversion script once model is merged.")
    assert gguf_size_ok(OUTPUT_Q4_GGUF, MAX_GGUF_BYTES)

