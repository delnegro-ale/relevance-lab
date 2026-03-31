/**
 * Deterministic parser for OpenSearch _explain API responses.
 * Recursively traverses explanation.details to extract score contributions.
 */

export interface ExplainRow {
  valor: number;
  grupo: 'texto' | 'função' | 'filtro_com_peso' | 'multiplicador' | 'outro';
  campo: string;
  termo_ou_regra: string;
  tipo: 'match' | 'field_value_factor' | 'weight' | 'constant_score' | 'unknown';
  descricao_original: string;
  /** Raw node from the _explain JSON for drill-down */
  rawNode?: any;
}

export interface FormulaOperand {
  value: number;
  description: string;
  operation: 'sum' | 'max' | 'min' | 'product' | 'leaf';
}

export interface TopLevelFormula {
  operation: 'product' | 'sum' | 'max' | 'min' | 'leaf';
  operands: FormulaOperand[];
  result: number;
}

export interface ExplainResult {
  documentId: string;
  scoreFinal: number;
  matched: boolean;
  rows: ExplainRow[];
  formula?: TopLevelFormula;
}

const STRUCTURAL_DESCRIPTIONS = new Set([
  'sum of:',
  'max of:',
  'min of:',
  'product of:',
  'function score, product of:',
  'match on required clause, product of:',
  '# clause',
]);

function isStructural(desc: string): boolean {
  if (STRUCTURAL_DESCRIPTIONS.has(desc)) return true;
  if (desc === 'maxBoost') return true;
  // Skip BM25 sub-components (boost, idf, tf, freq, k1, b, dl, avgdl, N, n)
  if (/^(boost|idf|tf|freq|k1|b|dl|avgdl|N|n),?\s/.test(desc)) return true;
  if (/^score\(freq=/.test(desc)) return true;
  if (/^constant score .* - no function provided$/.test(desc)) return true;
  if (/^function score, score mode/.test(desc)) return true;
  return false;
}

function isLeafContribution(desc: string): boolean {
  if (/^weight\(/.test(desc)) return true;
  if (/field value function:/.test(desc)) return true;
  if (/match filter:/.test(desc)) return true;
  if (/ConstantScore\(/.test(desc)) return true;
  if (desc === 'weight') return true;
  return false;
}

function classifyGrupo(desc: string): ExplainRow['grupo'] {
  if (/^weight\(/.test(desc)) return 'texto';
  if (/field value function:/.test(desc)) return 'função';
  if (/match filter:/.test(desc) || /ConstantScore\(/.test(desc)) return 'filtro_com_peso';
  if (desc === 'weight') return 'multiplicador';
  return 'outro';
}

function classifyTipo(desc: string): ExplainRow['tipo'] {
  if (/^weight\(/.test(desc)) return 'match';
  if (/field value function:/.test(desc)) return 'field_value_factor';
  if (/match filter:/.test(desc)) return 'weight';
  if (/ConstantScore\(/.test(desc)) return 'constant_score';
  if (desc === 'weight') return 'weight';
  return 'unknown';
}

function extractCampoETermo(desc: string): { campo: string; termo: string } {
  // weight(campo:termo in N) [PerFieldSimilarity], result of:
  // Also handles weight(campo^boost:termo in N) and weight(Synonym(campo:termo) in N)
  const weightMatch = desc.match(/^weight\((?:Synonym\(|BlendedTermQuery\()?([^:^()]+)(?:\^[^:]+)?:([^ )]+)/);
  if (weightMatch) return { campo: weightMatch[1], termo: weightMatch[2] };

  // doc['campo'].value
  const docMatch = desc.match(/doc\['([^']+)'\]/);

  // match filter: ConstantScore(campo:valor) or match filter: campo:valor
  // Handle nested parens: ConstantScore(campo:valor)
  const filterCsMatch = desc.match(/match filter:\s*(?:\(?ConstantScore\()([^:)]+):([^)]+)\)/);
  if (filterCsMatch) return { campo: filterCsMatch[1].trim(), termo: filterCsMatch[2].trim() };

  // match filter: campo:valor (bare, no ConstantScore)
  const filterBareMatch = desc.match(/match filter:\s*([^:\s(]+):(\S+)/);
  if (filterBareMatch) return { campo: filterBareMatch[1].trim(), termo: filterBareMatch[2].trim() };

  // ConstantScore(campo:valor) standalone
  const csMatch = desc.match(/ConstantScore\(([^:]+):([^)]+)\)/);
  if (csMatch) return { campo: csMatch[1].trim(), termo: csMatch[2].trim() };

  // Prefix query: PrefixQuery(campo:valor)
  const prefixMatch = desc.match(/PrefixQuery\(([^:]+):([^)]+)\)/);
  if (prefixMatch) return { campo: prefixMatch[1].trim(), termo: prefixMatch[2].trim() };

  // Generic campo:termo pattern in parentheses (fallback)
  const genericParenMatch = desc.match(/\(([a-zA-Z_][a-zA-Z0-9_.]*):([^)]+)\)/);
  if (genericParenMatch) return { campo: genericParenMatch[1].trim(), termo: genericParenMatch[2].trim() };

  // Generic campo:termo pattern (last resort fallback)
  const genericMatch = desc.match(/([a-zA-Z_][a-zA-Z0-9_.]+):(\S+)/);
  if (genericMatch && !genericMatch[1].match(/^(sum|max|min|product|score|result|boost|idf|tf|freq)$/)) {
    return { campo: genericMatch[1].trim(), termo: genericMatch[2].trim() };
  }

  if (docMatch) return { campo: docMatch[1], termo: '' };

  return { campo: '', termo: '' };
}

function collectContributions(node: any, results: ExplainRow[]): void {
  if (!node || typeof node !== 'object') return;

  const desc = (node.description || '').trim();
  const value = typeof node.value === 'number' ? node.value : 0;
  const details = Array.isArray(node.details) ? node.details : [];

  if (isStructural(desc)) {
    // Recurse into children
    for (const child of details) {
      collectContributions(child, results);
    }
    return;
  }

  if (isLeafContribution(desc)) {
    const { campo, termo } = extractCampoETermo(desc);
    results.push({
      valor: value,
      grupo: classifyGrupo(desc),
      campo,
      termo_ou_regra: termo,
      tipo: classifyTipo(desc),
      descricao_original: desc,
      rawNode: node,
    });
    // Don't recurse into children of leaf contributions (they're BM25 details)
    return;
  }

  // If it has children, recurse; otherwise treat as a contribution
  if (details.length > 0) {
    for (const child of details) {
      collectContributions(child, results);
    }
  } else if (value !== 0 && desc && desc !== '') {
    const { campo, termo } = extractCampoETermo(desc);
    results.push({
      valor: value,
      grupo: classifyGrupo(desc),
      campo,
      termo_ou_regra: termo,
      tipo: classifyTipo(desc),
      descricao_original: desc,
      rawNode: node,
    });
  }
}

function detectOperation(desc: string): TopLevelFormula['operation'] | null {
  if (/product of:/.test(desc)) return 'product';
  if (/sum of:/.test(desc)) return 'sum';
  if (/max of:/.test(desc)) return 'max';
  if (/min of:/.test(desc)) return 'min';
  return null;
}

function buildFormula(node: any): TopLevelFormula | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const desc = (node.description || '').trim();
  const details = Array.isArray(node.details) ? node.details : [];
  const op = detectOperation(desc);
  if (!op || details.length < 2) return undefined;

  const operands: FormulaOperand[] = details.map((child: any) => {
    const childDesc = (child.description || '').trim();
    const childOp = detectOperation(childDesc);
    return {
      value: typeof child.value === 'number' ? child.value : 0,
      description: childDesc,
      operation: childOp || 'leaf',
    };
  });

  return {
    operation: op,
    operands,
    result: typeof node.value === 'number' ? node.value : 0,
  };
}

export function parseExplainResponse(documentId: string, json: any): ExplainResult {
  if (!json || !json.explanation) {
    throw new Error('JSON inválido: campo "explanation" ausente');
  }

  const rows: ExplainRow[] = [];
  collectContributions(json.explanation, rows);

  // Sort by value descending
  rows.sort((a, b) => b.valor - a.valor);

  const formula = buildFormula(json.explanation);

  return {
    documentId: documentId || json._id || '',
    scoreFinal: json.explanation.value ?? 0,
    matched: json.matched ?? false,
    rows,
    formula,
  };
}
