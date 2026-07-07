const TRUNCATED_FINISH_REASON = 'length';

function parse(rawResponse) {
  const content = (rawResponse.content ?? '').trim();
  const isEmpty = content.length === 0;
  const isTruncated = rawResponse.finishReason === TRUNCATED_FINISH_REASON;

  return {
    content,
    isValid: !isEmpty,
    isTruncated,
    finishReason: rawResponse.finishReason ?? null,
    usage: rawResponse.usage ?? null,
  };
}

module.exports = { parse };
