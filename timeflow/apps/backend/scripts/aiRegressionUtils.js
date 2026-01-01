function parseExpectationTokens(tokens) {
  const expectation = {};
  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith('status=')) {
      const value = parseInt(token.replace('status=', ''), 10);
      if (!Number.isNaN(value)) expectation.status = value;
      continue;
    }
    if (token.startsWith('preview=')) {
      const value = token.replace('preview=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.preview = value === 'true';
      }
      continue;
    }
    if (token.startsWith('ok=')) {
      const value = token.replace('ok=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.ok = value === 'true';
      }
      continue;
    }
    if (token.startsWith('blocks>=')) {
      const value = parseInt(token.replace('blocks>=', ''), 10);
      if (!Number.isNaN(value)) expectation.minBlocks = value;
      continue;
    }
    if (token.startsWith('blocks<=')) {
      const value = parseInt(token.replace('blocks<=', ''), 10);
      if (!Number.isNaN(value)) expectation.maxBlocks = value;
      continue;
    }
  }
  return expectation;
}

function parseExpectationLine(line) {
  const tokens = line
    .split(/\s+/)
    .slice(1)
    .map(token => token.trim());
  return parseExpectationTokens(tokens);
}

export function parsePrompts(raw) {
  return raw
    .split(/\n---\n/g)
    .map(section =>
      section
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
    )
    .filter(lines => lines.length > 0)
    .map((lines, index) => {
      let name = null;
      const userLines = [];
      const contentLines = [];
      let expect = null;
      const turnExpectations = {};

      for (const line of lines) {
        if (/^flow:/i.test(line)) {
          name = line.replace(/^flow:/i, '').trim() || `Flow ${index + 1}`;
          continue;
        }
        if (/^expect-turn-\d+:/i.test(line)) {
          const match = line.match(/^expect-turn-(\d+):/i);
          const turn = match ? parseInt(match[1], 10) : null;
          if (turn) {
            turnExpectations[turn] = parseExpectationLine(line);
          }
          continue;
        }
        if (/^expect:/i.test(line)) {
          expect = parseExpectationLine(line);
          continue;
        }
        if (/^user:/i.test(line)) {
          userLines.push(line.replace(/^user:/i, '').trim());
          continue;
        }
        contentLines.push(line);
      }

      if (userLines.length >= 2) {
        return {
          type: 'flow',
          name: name || `Flow ${index + 1}`,
          prompts: userLines,
          turnExpectations,
        };
      }

      const promptLine =
        userLines.length === 1
          ? userLines[0]
          : contentLines.join('\n').trim();

      return {
        type: 'single',
        prompt: promptLine,
        expect,
      };
    });
}

export function evaluateExpectation(record, expectation) {
  if (!expectation) {
    return { ok: true, reasons: [] };
  }

  const reasons = [];
  if (typeof expectation.status === 'number' && record.status !== expectation.status) {
    reasons.push(`status ${record.status} != ${expectation.status}`);
  }
  if (typeof expectation.preview === 'boolean' && record.preview !== expectation.preview) {
    reasons.push(`preview ${record.preview} != ${expectation.preview}`);
  }
  if (typeof expectation.ok === 'boolean' && record.ok !== expectation.ok) {
    reasons.push(`ok ${record.ok} != ${expectation.ok}`);
  }
  if (typeof expectation.minBlocks === 'number' && record.blocksCount < expectation.minBlocks) {
    reasons.push(`blocks ${record.blocksCount} < ${expectation.minBlocks}`);
  }
  if (typeof expectation.maxBlocks === 'number' && record.blocksCount > expectation.maxBlocks) {
    reasons.push(`blocks ${record.blocksCount} > ${expectation.maxBlocks}`);
  }

  return { ok: reasons.length === 0, reasons };
}
