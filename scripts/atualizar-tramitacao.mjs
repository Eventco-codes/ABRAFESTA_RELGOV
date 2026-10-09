#!/usr/bin/env node
/**
 * Atualiza a área Tramitação com o estado real das proposições monitoradas:
 * preenche o linkOficial e a situação atual das pautas já existentes que
 * têm proposição correspondente confirmada, e cadastra pautas novas para
 * proposições relevantes ao setor de eventos ainda não acompanhadas.
 *
 * Fonte: levantamento manual em camara.leg.br, senado.leg.br, al.sp.gov.br,
 * congressonacional.leg.br, planalto.gov.br e in.gov.br (setembro/2026).
 *
 * Idempotente: pautas novas só são criadas se ainda não existir uma com o
 * mesmo título; pautas existentes são atualizadas por título exato.
 *
 * Uso: node --env-file=.env.local scripts/atualizar-tramitacao.mjs
 */
import { Client, TablesDB, Query, ID } from "node-appwrite";

const endpoint = requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const project = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = requireEnv("APPWRITE_API_KEY");
const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const tablesDB = new TablesDB(client);

const HOJE = new Date().toISOString();

// Pautas já cadastradas: atualizar linkOficial + situação atual a partir da
// tramitação oficial confirmada, e registrar uma movimentação com o achado.
const ATUALIZACOES = [
  {
    titulo: "PLP 108/2024 — Comitê Gestor do IBS",
    situacaoAtual:
      "Sancionada como Lei Complementar nº 227, em 13/01/2026, com veto parcial (MSC-PE 36/2026); em 22/01/2026 houve ofício pedindo correção de inexatidão material na ementa do autógrafo.",
    status: "Sancionada (LC 227/2026)",
    linkOficial: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2438459",
    movTitulo: "Sanção com veto parcial — LC 227/2026",
    movDescricao:
      "Confirmado junto à Câmara dos Deputados, Congresso Nacional e Senado: o PLP 108/2024 foi sancionado como Lei Complementar nº 227/2026, com veto parcial. Link oficial de tramitação atualizado.",
  },
  {
    titulo: "Portaria MTE nº 3.665/2023 — Trabalho em Feriados",
    situacaoAtual:
      "Vigência da exigência de autorização por convenção/acordo coletivo para funcionamento em domingos e feriados foi adiada de 01/03/2024 para 01/07/2025 (DOU de 20/12/2024) e prorrogada novamente por mais 90 dias em fevereiro de 2026; risco regulatório permanece ativo.",
    status: "Vigência prorrogada — monitorar",
    linkOficial:
      "https://www.in.gov.br/en/web/dou/-/portaria-mte-n-3.665-de-13-de-novembro-de-2023-522874590",
    movTitulo: "Confirmação da tramitação oficial no DOU",
    movDescricao:
      "Publicação original localizada no Diário Oficial da União. Link oficial de tramitação atualizado.",
  },
  {
    titulo: "Reforma Tributária — PLP 68/2024 / LC 214/2025",
    situacaoAtual:
      "Lei Complementar 214/2025 sancionada em 16/01/2025 com veto parcial; veto promulgado em 02/07/2025. Regulamentação segue em curso.",
    status: "Lei sancionada — regulamentação em curso",
    linkOficial: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2430143",
    movTitulo: "Confirmação de sanção — LC 214/2025",
    movDescricao:
      "Confirmado junto à Câmara dos Deputados, Senado e Planalto: PLP 68/2024 sancionado como LC 214/2025. Link oficial de tramitação atualizado.",
  },
  {
    titulo: "PLP 152/2025 — Trabalho por Plataformas Digitais",
    situacaoAtual:
      "Pronta para pauta no Plenário; parecer do relator Dep. Augusto Coutinho (07/04/2026) pela aprovação na forma do Substitutivo (SBT nº 1, apresentado em 09/12/2025).",
    status: "Pronta para pauta — acompanhar votação",
    linkOficial: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2594527",
    movTitulo: "Parecer do relator pela aprovação do Substitutivo",
    movDescricao:
      "Confirmado junto à Câmara dos Deputados: parecer do relator pela aprovação na forma do Substitutivo SBT nº 1. Link oficial de tramitação atualizado.",
  },
  {
    titulo: "PLP 102/2025 — MEI para Eventos",
    situacaoAtual:
      "Aprovado parecer na CICS (02/09/2025); aguardando parecer na CFT, com relator Dep. Zé Neto (PT-BA) designado em 08/04/2026. Tramita em regime de prioridade, sujeito ao Plenário.",
    status: "Aguardando parecer na CFT",
    linkOficial: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2500692",
    movTitulo: "Relator designado na CFT",
    movDescricao:
      "Confirmado junto à Câmara dos Deputados: Dep. Zé Neto designado relator na CFT em 08/04/2026. Link oficial de tramitação atualizado.",
  },
];

// Pautas novas: proposições relevantes ao setor de eventos identificadas no
// levantamento, ainda não cadastradas.
const NOVAS_PAUTAS = [
  {
    titulo: "PEC 40/2025 — Flexibilização da Jornada de Trabalho",
    eixo: "Trabalhista / jornada de trabalho",
    atuacao:
      "Acompanhar proposta que permite ao empregado optar entre o regime celetista tradicional e um regime flexível baseado em horas trabalhadas, avaliando impactos para escalas e jornadas no setor de eventos.",
    contexto:
      "PEC apresentada pelo Dep. Maurício Marcon (PODE/RS), com mais de 170 subscritores, alterando o art. 7º da Constituição Federal.",
    situacaoAtual:
      "Aguardando despacho do Presidente da Câmara; em 25/02/2026 foi apresentado requerimento de audiência pública sobre redução de jornada, mencionando esta PEC e a PEC 8/2025, além de pedidos de apensação à PEC 221/2019.",
    interlocutores: "Câmara dos Deputados; Dep. Maurício Marcon; Comissão de Constituição e Justiça",
    prioridade: "Media",
    fonteReferencia: "Câmara dos Deputados — ficha de tramitação (idProposicao 2578996)",
    status: "Aguardando despacho",
    linkOficial: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2578996",
  },
  {
    titulo: "PEC 148/2015 — Fim da Escala 6x1",
    eixo: "Trabalhista / jornada de trabalho",
    atuacao:
      "Monitorar proposta de redução gradual da jornada semanal de 44 para 36 horas e ampliação do descanso semanal, avaliando o impacto sobre custo de mão de obra e escalas em fins de semana e feriados no setor de eventos.",
    contexto:
      "PEC aprovada na CCJ do Senado em 10/12/2025 (relator Sen. Rogério Carvalho, PT-SE); prevê implementação gradual, sem redução de remuneração, mantendo jornada diária de 8h com flexibilização por acordo coletivo.",
    situacaoAtual:
      "Aguardando votação em Plenário do Senado (precisa de 49 votos); se aprovada, segue para a Câmara dos Deputados (precisa de 308 votos).",
    interlocutores: "Senado Federal; Sen. Rogério Carvalho; CCJ",
    prioridade: "Alta",
    fonteReferencia: "Agência Senado — notícia de 03/02/2026",
    status: "Aguardando Plenário do Senado",
    linkOficial:
      "https://www12.senado.leg.br/noticias/materias/2026/02/03/fim-da-jornada-6x1-preve-reducao-gradual-do-horario-de-trabalho",
  },
  {
    titulo: "Indicação ALESP nº 10.748/2026 — Recursos ao Governo de SP para a ABRAFESTA",
    eixo: "Institucional / articulação estadual",
    atuacao:
      "Acompanhar tramitação da indicação que solicita ao Poder Executivo do Estado de São Paulo a liberação de recursos financeiros para custeio da ABRAFESTA, apurando status junto ao gabinete da autora e à Secretaria da Fazenda estadual.",
    contexto:
      "Indicação de autoria da Dep. Estadual Valéria Bolsonaro, publicada no Diário da Assembleia em 24/06/2026, citando nominalmente a ABRAFESTA.",
    situacaoAtual:
      "Em fase de conclusão na ALESP; encaminhamento ao Executivo tramita via Alesp Sem Papel (processo digital).",
    interlocutores: "ALESP; Dep. Valéria Bolsonaro; Governo do Estado de São Paulo",
    prioridade: "Alta",
    fonteReferencia: "ALESP — propositura (id 1000696265)",
    status: "Em tramitação (fase de conclusão)",
    linkOficial: "https://www.al.sp.gov.br/propositura/?id=1000696265",
  },
  {
    titulo: "PL ALESP nº 1.113/2025 — Controle de Metanol em Bebidas Alcoólicas",
    eixo: "Regulatório / segurança sanitária em eventos",
    atuacao:
      "Monitorar projeto que cria sistema estadual de controle de metanol e outras substâncias nocivas em bebidas alcoólicas, avaliando obrigações para bares, buffets e fornecedores que atuam em eventos.",
    contexto:
      "Projeto do Dep. Guilherme Cortez, apresentado após casos de intoxicação por metanol em bares e festas em 2025; distribuído à CCJR (relator Dep. Rômulo Fernandes), CDDC e CFOP.",
    situacaoAtual: "Em tramitação nas comissões da ALESP; ainda sem parecer ou votação registrada.",
    interlocutores: "ALESP; Dep. Guilherme Cortez; CCJR; CDDC; CFOP",
    prioridade: "Media",
    fonteReferencia: "ALESP — propositura (id 1000633113)",
    status: "Em tramitação nas comissões",
    linkOficial: "https://www.al.sp.gov.br/propositura/?id=1000633113",
  },
  {
    titulo: "PL 613/2024 — Exposição à Pressão Sonora em Eventos (arquivado)",
    eixo: "Licenciamento / operação em eventos",
    atuacao:
      "Acompanhar o histórico legislativo sobre divulgação de informações de pressão sonora ao público em eventos esportivos, artísticos e culturais, para eventual reapresentação do tema.",
    contexto:
      "Projeto da Dep. Rosângela Reis (PL/MG); recebeu parecer pela rejeição na Comissão de Defesa do Consumidor.",
    situacaoAtual:
      "Arquivado em 16/04/2026, nos termos do art. 133 do RICD, após parecer pela rejeição nas comissões de mérito.",
    interlocutores: "Câmara dos Deputados; Dep. Rosângela Reis",
    prioridade: "Baixa",
    fonteReferencia: "Câmara dos Deputados — ficha de tramitação (idProposicao 2419625)",
    status: "Arquivado",
    linkOficial: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2419625",
    ativo: false,
  },
];

async function main() {
  console.log(`Endpoint: ${endpoint}\nProjeto: ${project}\nDatabase: ${databaseId}\n`);

  for (const item of ATUALIZACOES) {
    const pauta = await encontrarPautaPorTitulo(item.titulo);
    if (!pauta) {
      console.warn(`⚠ pauta não encontrada, pulando: ${item.titulo}`);
      continue;
    }

    await tablesDB.updateRow({
      databaseId,
      tableId: "pautas",
      rowId: pauta.$id,
      data: {
        situacaoAtual: item.situacaoAtual,
        status: item.status,
        linkOficial: item.linkOficial,
      },
    });

    await tablesDB.createRow({
      databaseId,
      tableId: "movimentacoes",
      rowId: ID.unique(),
      data: {
        pautaId: pauta.$id,
        data: HOJE,
        origem: "REGISTRO_MANUAL",
        titulo: item.movTitulo,
        descricao: item.movDescricao,
        criadoPorNome: "Monitoramento RelGov",
      },
    });

    console.log(`✓ atualizada: ${item.titulo}`);
  }

  for (const item of NOVAS_PAUTAS) {
    const existente = await encontrarPautaPorTitulo(item.titulo);
    if (existente) {
      console.log(`· já existe, pulando: ${item.titulo}`);
      continue;
    }

    const pautaId = ID.unique();
    await tablesDB.createRow({
      databaseId,
      tableId: "pautas",
      rowId: pautaId,
      data: {
        titulo: item.titulo,
        eixo: item.eixo,
        atuacao: item.atuacao,
        contexto: item.contexto,
        situacaoAtual: item.situacaoAtual,
        interlocutores: item.interlocutores,
        prioridade: item.prioridade,
        fonteReferencia: item.fonteReferencia,
        status: item.status,
        linkOficial: item.linkOficial,
        ativo: item.ativo ?? true,
        incluirTramitacao: true,
      },
    });

    await tablesDB.createRow({
      databaseId,
      tableId: "movimentacoes",
      rowId: ID.unique(),
      data: {
        pautaId,
        data: HOJE,
        origem: "REGISTRO_MANUAL",
        titulo: "Pauta incluída no monitoramento",
        descricao: `Cadastrada a partir de varredura manual da tramitação oficial. Fonte: ${item.fonteReferencia}.`,
        criadoPorNome: "Monitoramento RelGov",
      },
    });

    console.log(`✓ criada: ${item.titulo}`);
  }

  console.log("\nConcluído.");
}

async function encontrarPautaPorTitulo(titulo) {
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: "pautas",
    queries: [Query.equal("titulo", titulo), Query.limit(1)],
  });
  return rows[0] ?? null;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Faltando variável de ambiente: ${name}`);
    process.exit(1);
  }
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
