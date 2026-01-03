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
    if (token.startsWith('question=')) {
      const value = token.replace('question=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.question = value === 'true';
      }
      continue;
    }
    if (token.startsWith('cta=')) {
      const value = token.replace('cta=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.cta = value === 'true';
      }
      continue;
    }
    if (token.startsWith('no_schedule_language=')) {
      const value = token.replace('no_schedule_language=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.noScheduleLanguage = value === 'true';
      }
      continue;
    }
    if (token.startsWith('draft=')) {
      const value = token.replace('draft=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.draft = value === 'true';
      }
      continue;
    }
    if (token.startsWith('confirm_cta=')) {
      const value = token.replace('confirm_cta=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.confirmCta = value === 'true';
      }
      continue;
    }
    if (token.startsWith('no_auto_apply_language=')) {
      const value = token.replace('no_auto_apply_language=', '').toLowerCase();
      if (value === 'true' || value === 'false') {
        expectation.noAutoApplyLanguage = value === 'true';
      }
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
      let endpoint = null;
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
        if (/^endpoint:/i.test(line)) {
          endpoint = line.replace(/^endpoint:/i, '').trim();
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
        endpoint,
        prompt: promptLine,
        expect,
      };
    });
}

export function evaluateExpectation(record, expectation, messageContent = null) {
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

  if (typeof expectation.question === 'boolean') {
    const strippedQuestionContent = messageContent
      ? messageContent.replace(/want me to schedule this\?/gi, '')
      : '';
    const hasQuestion = strippedQuestionContent.includes('?');
    if (expectation.question !== hasQuestion) {
      reasons.push(`question ${hasQuestion} != ${expectation.question}`);
    }
  }

  if (typeof expectation.cta === 'boolean') {
    const trimmed = messageContent ? messageContent.trim() : '';
    const hasCta = /want me to schedule this\?\s*$/i.test(trimmed);
    if (expectation.cta !== hasCta) {
      reasons.push(`cta ${hasCta} != ${expectation.cta}`);
    }
  }

  if (typeof expectation.noScheduleLanguage === 'boolean') {
    const content = messageContent || '';
    const stripped = content.replace(/want me to schedule this\?/gi, '');
    const schedulingKeywords = [
      'schedule',
      'scheduling',
      'calendar',
      'time block',
      'time-block',
      'blocks',
      'apply',
      'add to calendar',
    ];
    const hasSchedulingLanguage = schedulingKeywords.some((kw) =>
      stripped.toLowerCase().includes(kw)
    );
    if (expectation.noScheduleLanguage === hasSchedulingLanguage) {
      reasons.push(`noScheduleLanguage ${!hasSchedulingLanguage} != ${expectation.noScheduleLanguage}`);
    }
  }

  if (typeof expectation.draft === 'boolean') {
    const hasDraft = Boolean(record.draft);
    if (expectation.draft !== hasDraft) {
      reasons.push(`draft ${hasDraft} != ${expectation.draft}`);
    }
  }

  if (typeof expectation.confirmCta === 'boolean') {
    const confirmCta = typeof record.confirmCta === 'string' ? record.confirmCta.trim() : '';
    const hasConfirmCta = confirmCta.endsWith('?');
    if (expectation.confirmCta !== hasConfirmCta) {
      reasons.push(`confirmCta ${hasConfirmCta} != ${expectation.confirmCta}`);
    }
  }

  if (typeof expectation.noAutoApplyLanguage === 'boolean') {
    const content = (messageContent || '').toLowerCase();
    const autoApplyKeywords = [
      'i applied',
      "i've applied",
      'applied the label',
      'labels have been applied',
      'i updated',
      "i've updated",
      'label updated',
      'label applied',
      'task created',
      'created the task',
      'already created',
      'went ahead and',
      'applied it',
      'synced it',
      'saved it',
      'updated the label',
      'set the label',
    ];
    const hasAutoApplyLanguage = autoApplyKeywords.some((kw) => content.includes(kw));
    if (expectation.noAutoApplyLanguage === hasAutoApplyLanguage) {
      reasons.push(
        `noAutoApplyLanguage ${!hasAutoApplyLanguage} != ${expectation.noAutoApplyLanguage}`
      );
    }
  }

  return { ok: reasons.length === 0, reasons };
}

export function shouldFailRun(summary) {
  if (!summary) return true;
  return Boolean(summary.failed > 0 || summary.expectationFailures > 0);
}
