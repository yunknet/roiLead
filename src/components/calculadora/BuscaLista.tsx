import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

export interface OpcaoBusca { valor: string; rotulo: string; detalhe?: string }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Props {
  opcoes: OpcaoBusca[];
  valor: string;
  onChange: (valor: string, opcao?: OpcaoBusca) => void;
  placeholder?: string;
  carregando?: boolean;
  desabilitado?: boolean;
  /** Permite digitar um código que não está na lista (ex.: NCM novo). */
  livre?: boolean;
  max?: number;
}

/** Campo de busca com sugestões para listas grandes (NCM, NBS, municípios). */
export function BuscaLista({ opcoes, valor, onChange, placeholder, carregando, desabilitado, livre, max = 60 }: Props) {
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  const selecionada = useMemo(() => opcoes.find((o) => o.valor === valor), [opcoes, valor]);

  useEffect(() => {
    setTexto(selecionada ? `${selecionada.rotulo}` : valor || '');
  }, [selecionada, valor]);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const filtradas = useMemo(() => {
    const t = normalizar(texto.trim());
    if (!t || (selecionada && texto === selecionada.rotulo)) return opcoes.slice(0, max);
    const soDigitos = t.replace(/[.\-\s]/g, '');
    const palavras = t.split(/\s+/).filter(Boolean);
    const res: OpcaoBusca[] = [];
    for (const o of opcoes) {
      const alvo = normalizar(`${o.valor} ${o.rotulo} ${o.detalhe || ''}`);
      const ok = /^\d+$/.test(soDigitos) ? o.valor.replace(/\D/g, '').startsWith(soDigitos) || alvo.includes(t) : palavras.every((p) => alvo.includes(p));
      if (ok) { res.push(o); if (res.length >= max) break; }
    }
    return res;
  }, [texto, opcoes, max, selecionada]);

  const escolher = (o: OpcaoBusca) => {
    onChange(o.valor, o);
    setTexto(o.rotulo);
    setAberto(false);
  };

  const confirmarLivre = () => {
    if (!livre) return;
    const codigo = texto.replace(/\D/g, '');
    if (codigo && codigo !== valor) onChange(codigo);
  };

  return (
    <div className="relative" ref={caixa}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={texto}
          placeholder={placeholder}
          disabled={desabilitado}
          onFocus={(e) => { setAberto(true); e.currentTarget.select(); }}
          onChange={(e) => { setTexto(e.target.value); setAberto(true); setAtivo(0); }}
          onBlur={confirmarLivre}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, filtradas.length - 1)); setAberto(true); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (filtradas[ativo]) escolher(filtradas[ativo]); else confirmarLivre(); }
            else if (e.key === 'Escape') setAberto(false);
          }}
        />
        {carregando ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        ) : valor && !desabilitado ? (
          <button type="button" aria-label="Limpar" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" onClick={() => { onChange(''); setTexto(''); }}>
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      {aberto && !desabilitado && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg custom-scrollbar">
          {carregando && <li className="px-3 py-2 text-sm text-muted-foreground">Carregando lista oficial…</li>}
          {!carregando && filtradas.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">{livre ? 'Nada encontrado. Você pode digitar o código completo.' : 'Nada encontrado.'}</li>
          )}
          {filtradas.map((o, i) => (
            <li
              key={o.valor}
              onMouseDown={(e) => { e.preventDefault(); escolher(o); }}
              onMouseEnter={() => setAtivo(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${i === ativo ? 'bg-accent text-accent-foreground' : ''} ${o.valor === valor ? 'font-semibold' : ''}`}
            >
              <div>{o.rotulo}</div>
              {o.detalhe && <div className="text-xs text-muted-foreground">{o.detalhe}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
