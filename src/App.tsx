import { useEffect, useState } from "react";
import "./App.css";

import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import Table from "react-bootstrap/Table";
import { NumericFormat } from "react-number-format";
import { FormControl, Tab, Tabs } from "react-bootstrap";
import React from "react";

function App() {
  //Interfaces
  interface Configurations {
    bonusNegativo: number;
    emolumentos: number;
  }

  interface ResidualInvestigation {
    ativo: string;
    qtdeAtivo: number;
    valorHipoteticoDoAtivo: number;
    valorHipoteticoTotal: number;
    bonusProxNegociacao: number;
  }

  interface LossInvestigation {
    valorHipoteticoDoAtivo: number;
    valorHipoteticoTotal: number;
    bonusProxNegociacao: number;
  }

  interface OperationHistory {
    ativo: string;
    dataCompra: string;
    dataVenda: string;
    qtde: number;
    precoCompra: number;
    emolumentos: number;
  }
  interface MasterOperationHistory {
    ativo: string;
    dataVenda: string;
    qtdeCompra: number;
    qtdeVenda: number;
    pmCompra: number;
    pmVenda: number;
    valorTotalCompra: number;
    valorTotalVenda: number;
    totalEmolumentos: number;
  }

  interface Operation {
    ativo: string;
    qtde: number;
    preco: number;
    total: number;
    emolumentos: number;
    data: string;
    ativa: boolean;
  }

  interface MasterOperation {
    ativo: string;
    numOperacoesAtivas: number;
    qtde: number;
    totalEmolumentos: number;
    valorTotal: number;
    pm: number;
  }

  //Variável de controle da tab
  const [tab, setTab] = useState("analise");

  // Variaveis de controle do form
  const [valorParaInvestir, setValorParaInvestir] = useState(0.0);
  const [precoDoAtivo, setPrecoDoAtivo] = useState(0.0);
  const [ativo, setAtivo] = useState("");
  const [pgtoPorEmolumentos, setPgtoPorEmolumentos] = useState(0);

  //Variáveis de validação
  const [msgValidacao, setMsgValidacao] = useState("");

  // Variaveis da tabela
  const [qtdeMaxAtivosComprados, setQtdeMaxAtivosComprados] = useState(0); // toFix((valorParaInvestir / precoDoAtivo),0)
  const [valorRealDaOperacao, setValorRealDaOperacao] = useState(0); // qtdeMaxAtivosComprados * precoDoAtivo
  const [valorFinal, setValorFinal] = useState(0); // qtdeMaxAtivosComprados * precoDoAtivo * (1 + emolumentos)

  // Variáveis de controle
  const [loading, setLoading] = useState(false);
  const [tableControl, setTableControl] = useState(0); // Determina se será mostrado tabela de win ou de loss

  // Variáveis de configuração
  const [configurationsArray, setConfiguratrionsArray] = useState<
    Configurations[]
  >([{ bonusNegativo: 0, emolumentos: 0.03 / 100 }]);

  // Variáveis de operação
  const [operacoes, setOperacoes] = useState<Operation[]>([]); // possui todas as operações, ativas e inativas
  const [operacoesMaster, setOperacoesMaster] = useState<MasterOperation[]>([]); // é construído apenas com operações ativas, agrupando pelo ativo
  const [linhaClicada, setLinhaClicada] = useState<number | null>(null); // controla a visualização de operações dentro de uma operação mestra
  const [mostraTabelaRegistrarSaida, setMostraTabelaRegistrarSaida] = useState<
    number | null
  >(null); // mostra a tabela "Registrar Saída"
  const [profitOperations, setProfitOperations] = useState<
    ResidualInvestigation[]
  >([]);
  const [lossOperations, setLossOperations] = useState<ResidualInvestigation[]>(
    []
  );

  //Variáveis de Histórico
  const [historyArray, setHistoryArray] = useState<OperationHistory[]>([]);
  const [masterHistoryArray, setMasterHistoryArray] = useState<
    MasterOperationHistory[]
  >([]);
  const [showDetailedHistory, setShowDetailedHistory] = useState<number | null>(
    null
  );

  // useEffect(() => {}, [profitOperations, valorRealDaOperacao]);

  const toFix = (n: number, fixed: number): string => {
    const matchResult = `${n}`.match(
      new RegExp(`^-?\\d+(?:\\.\\d{0,${fixed}})?`)
    );
    if (matchResult !== null) {
      if (fixed === 0) return matchResult[0].replace(/\./, "");
      return matchResult[0];
    } else {
      return "";
    }
  };

  const toReal = (n: number): string => {
    //n = Number(toFix(n, 2));
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getToday = () => {
    let date = new Date();
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const validar = async () => {
    setMsgValidacao("");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (ativo === "") {
      setMsgValidacao(
        'o campo "Ativo a ser negociado" precisa ser preenchido.'
      );
      return false;
    }
    if (valorParaInvestir <= 0 || valorParaInvestir === null) {
      setMsgValidacao(
        'o campo "Valor disponível para investir" precisa ser preenchido.'
      );
      return false;
    }
    if (precoDoAtivo <= 0 || precoDoAtivo === null) {
      setMsgValidacao('o campo "Preço do ativo" precisa ser preenchido.');
      return false;
    }
    if (valorParaInvestir < precoDoAtivo) {
      setMsgValidacao(
        '"Preço do ativo" não pode ser menor do que "Valor para investir".'
      );
      return false;
    }
    if (Number(toFix(valorParaInvestir / precoDoAtivo, 0)) === 1) {
      setMsgValidacao("A estratégia não funciona comprando apenas um ativo.");
      return false;
    }
    return true;
  };

  const calcularOperacoesLoss = async (
    valorParaInvestir: number,
    precoDoAtivo: number
  ) => {
    // Inicializando variaveis
    let limiteInferiorDaTabela = precoDoAtivo * 0.9; // limiteInferiorDaTabela é o valor até onde o for() rodará mostrando possíveis operações
    let tempLossOperations: ResidualInvestigation[] = [];
    let qtdeMaxAtivosCompradosAux = Number(
      toFix(valorParaInvestir / precoDoAtivo, 0)
    );
    let ValorRealDaOperacaoAux = qtdeMaxAtivosCompradosAux * precoDoAtivo;

    for (
      let valorComLoss = precoDoAtivo - 0.01;
      valorComLoss >= limiteInferiorDaTabela;
      valorComLoss = valorComLoss - 0.01
    ) {
      tempLossOperations.push({
        ativo: ativo,
        qtdeAtivo: qtdeMaxAtivosCompradosAux,
        valorHipoteticoDoAtivo: valorComLoss,
        valorHipoteticoTotal: valorComLoss * qtdeMaxAtivosCompradosAux,
        bonusProxNegociacao:
          ValorRealDaOperacaoAux - valorComLoss * qtdeMaxAtivosCompradosAux,
      });
    }

    setLossOperations(tempLossOperations);
    return;
  };

  const limparArrays = () => {
    setProfitOperations([]);
    setLossOperations([]);
    setAtivo("");
    setPrecoDoAtivo(0);
    setValorParaInvestir(0);
    setTableControl(0);
    return;
  };

  const realizarAnalise = async () => {
    // Validações
    if (!validar()) return;
    setLoading(true);
    await calcularOperacoesWin(
      ativo,
      valorParaInvestir,
      precoDoAtivo,
      configurationsArray[0].emolumentos,
      false
    );
    await calcularOperacoesLoss(valorParaInvestir, precoDoAtivo);
    setLoading(false);
    return;
  };

  const calcularPossiveisSaidas = async (masterArrayIndex: number) => {
    setLoading(true);
    await calcularOperacoesWin(
      operacoesMaster[masterArrayIndex].ativo,
      operacoesMaster[masterArrayIndex].valorTotal,
      operacoesMaster[masterArrayIndex].pm,
      operacoesMaster[masterArrayIndex].totalEmolumentos,
      true
    );
    await calcularOperacoesLoss(valorParaInvestir, precoDoAtivo);
    setMostraTabelaRegistrarSaida(
      mostraTabelaRegistrarSaida === masterArrayIndex ? null : masterArrayIndex
    );
    setLoading(false);
    return;
  };

  const calcularOperacoesWin = async (
    ativo: string,
    valorParaInvestir: number,
    precoDoAtivo: number,
    emolumentos: number,
    operacaoEmAndamento: boolean
  ) => {
    // Setando valores e variáveis
    let ativoAux = ativo;

    let qtdeMaxAtivosCompradosAux = Number(
      toFix(valorParaInvestir / precoDoAtivo, 0)
    );
    let valorRealDaOperacaoAux = qtdeMaxAtivosCompradosAux * precoDoAtivo;
    let pgtoPorEmolumentosAux = valorRealDaOperacaoAux * emolumentos;
    let tempProfitOperations: ResidualInvestigation[] = [];

    if (!operacaoEmAndamento)
      while (
        qtdeMaxAtivosCompradosAux * precoDoAtivo + pgtoPorEmolumentosAux >
        valorParaInvestir
      ) {
        qtdeMaxAtivosCompradosAux--;
        valorRealDaOperacaoAux = qtdeMaxAtivosCompradosAux * precoDoAtivo;
        pgtoPorEmolumentosAux =
          valorRealDaOperacaoAux * configurationsArray[0].emolumentos;
      } // essa lógica faz com que você nunca pague mais do que tem pra investir por causa de emolumentos

    setQtdeMaxAtivosComprados(qtdeMaxAtivosCompradosAux);
    setPgtoPorEmolumentos(pgtoPorEmolumentosAux);
    setValorRealDaOperacao(valorRealDaOperacaoAux);
    setValorFinal(
      qtdeMaxAtivosCompradosAux * precoDoAtivo + pgtoPorEmolumentosAux
    );
    let valorDeVendaAux: number = 0;
    let qtdeVendaAux: number = 0;
    let precoDoAtivoComAcrescimoAux: number = 0;
    let limiteSuperiorDaTabela = precoDoAtivo * 1.1; // limiteSuperiorDaTabela é o valor até onde o for() rodará mostrando possíveis operações

    // TableControl === 1 significa que mostrará a tabela para win.
    setTableControl(1);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (
      let qtdeHipoteticaDeVenda = qtdeMaxAtivosCompradosAux - 1;
      qtdeHipoteticaDeVenda >= 0;
      qtdeHipoteticaDeVenda--
    ) {
      if (qtdeVendaAux != 0) {
        tempProfitOperations.push({
          ativo: ativoAux,
          qtdeAtivo: qtdeVendaAux,
          valorHipoteticoDoAtivo: precoDoAtivoComAcrescimoAux,
          valorHipoteticoTotal: valorDeVendaAux,
          bonusProxNegociacao: valorRealDaOperacaoAux - valorDeVendaAux,
        });

        valorDeVendaAux = 0;
        qtdeVendaAux = 0;
        precoDoAtivoComAcrescimoAux = 0;
      }

      for (
        let precoDoAtivoComAcrescimo = Number(toFix(precoDoAtivo + 0.01, 2));
        precoDoAtivoComAcrescimo < limiteSuperiorDaTabela;
        precoDoAtivoComAcrescimo = precoDoAtivoComAcrescimo + 0.01
      ) {
        if (
          precoDoAtivoComAcrescimo * qtdeHipoteticaDeVenda <=
            valorRealDaOperacaoAux &&
          valorRealDaOperacaoAux -
            precoDoAtivoComAcrescimo * qtdeHipoteticaDeVenda <
            precoDoAtivo
        ) {
          valorDeVendaAux = precoDoAtivoComAcrescimo * qtdeHipoteticaDeVenda;
          qtdeVendaAux = qtdeHipoteticaDeVenda;
          precoDoAtivoComAcrescimoAux = precoDoAtivoComAcrescimo;
        } else {
        }
      }
    }
    setProfitOperations(tempProfitOperations);
    return;
  };

  const registrarSaida = async (
    ativoSelecionado: string,
    valorTotalSaida: number,
    pmSaida: number,
    qtdeSaida: number
  ) => {
    setTab("historico");
    const historyArrayAux: OperationHistory[] = historyArray;
    const masterHistoryArrayAux: MasterOperationHistory[] = masterHistoryArray;
    //Atualiza OperationsArray
    let operationsArrayAux: Operation[] = operacoes.map(
      (operation: Operation) => {
        // Verifica se o ativo da operação é igual ao ativo selecionado
        if (operation.ativo === ativoSelecionado && operation.ativa) {
          // Insere entrada no histórico
          historyArrayAux.push({
            ativo: ativoSelecionado,
            dataCompra: operation.data,
            dataVenda: getToday(),
            emolumentos: operation.emolumentos,
            precoCompra: operation.preco,
            qtde: operation.qtde,
          });
          // Atualiza a propriedade 'ativa' para false
          return { ...operation, ativa: false };
        }
        // Retorna a operação sem alterações
        return operation;
      }
    );
    setOperacoes(operationsArrayAux);

    // Seta os históricos
    operacoesMaster.map((masterOper) => {
      if (masterOper.ativo === ativoSelecionado) {
        // Insere entrada no histórico
        masterHistoryArrayAux.push({
          ativo: ativoSelecionado,
          dataVenda: getToday(),
          pmCompra: masterOper.pm,
          pmVenda: pmSaida,
          valorTotalCompra: masterOper.valorTotal,
          valorTotalVenda: valorTotalSaida,
          qtdeCompra: masterOper.qtde,
          qtdeVenda: qtdeSaida,
          totalEmolumentos: masterOper.totalEmolumentos,
        });
        return masterOper;
      }
      return masterOper;
    });
    setHistoryArray(historyArrayAux);
    setMasterHistoryArray(masterHistoryArrayAux);

    //Atualiza MasterOperationsArray
    const masterOperationsArrayAux: MasterOperation[] =
      await atualizarMasterOperations(operationsArrayAux);
    setOperacoesMaster(masterOperationsArrayAux);
    limparArrays();

    return;
  };

  const atualizarMasterOperations = async (
    tempOperationsArray: Operation[]
  ) => {
    // Agrupar as entradas por ativo e calcular as somas e a média
    const tempMasterOperationsArray: MasterOperation[] = Object.entries(
      tempOperationsArray.reduce<{
        [key: string]: {
          ativo: string;
          qtde: number;
          pm: number;
          valorTotal: number;
          totalEmolumentos: number;
          numOperacoesAtivas: number;
        };
      }>((acc, cur) => {
        if (cur.ativa) {
          if (!acc[cur.ativo]) {
            acc[cur.ativo] = {
              ativo: cur.ativo,
              qtde: cur.qtde,
              pm: cur.preco * cur.qtde,
              valorTotal: cur.total,
              totalEmolumentos: cur.emolumentos,
              numOperacoesAtivas: 1,
            };
          } else {
            acc[cur.ativo].qtde += cur.qtde;
            acc[cur.ativo].pm += cur.preco * cur.qtde;
            acc[cur.ativo].valorTotal += cur.total;
            acc[cur.ativo].numOperacoesAtivas++;
            acc[cur.ativo].totalEmolumentos += cur.emolumentos;
          }
        }
        return acc;
      }, {})
    ).map(([_, value]) => value);

    // Calcular a média do preço por ativo
    tempMasterOperationsArray.forEach((operation) => {
      operation.pm = operation.valorTotal / operation.qtde;
    });
    return tempMasterOperationsArray;
  };

  const oficializarOperacao = async () => {
    const tempOperationsArray: Operation[] = operacoes;

    let ativoAux = ativo;
    let precoDoAtivoAux = precoDoAtivo;
    let qtdeAux = qtdeMaxAtivosComprados;
    let emolumentos = pgtoPorEmolumentos;
    let totalAux = qtdeMaxAtivosComprados * precoDoAtivo;
    let today = getToday();

    //Nesse array temos todas as operações
    tempOperationsArray.push({
      ativo: ativoAux,
      qtde: qtdeAux,
      preco: precoDoAtivoAux,
      emolumentos: Number(toFix(emolumentos, 2)),
      total: totalAux,
      data: today,
      ativa: true,
    });

    // Agrupar as entradas por ativo e calcular as somas e a média
    const tempMasterOperationsArray: MasterOperation[] =
      await atualizarMasterOperations(tempOperationsArray);
    setOperacoesMaster(tempMasterOperationsArray);
    setOperacoes(tempOperationsArray);

    // Limpando os campos e o array de analise
    limparArrays();

   // Mudando de tab
    setTab("operacoes");
    return;
  };

  return (
    <>
      <Tabs
        defaultActiveKey={"analise"}
        activeKey={tab}
        onSelect={(k) => setTab(k ?? "")}
        className="mb-3"
        style={{ width: "75vw" }}
      >
        <Tab eventKey="analise" title="Análise">
          <div>
            <h1>Estratégia Residual para Fundos Imobiliários</h1>
          </div>
          <br />
          <div>
            <InputGroup className="mb-3">
              <InputGroup.Text id="id-ativo">
                Ativo a ser negociado
              </InputGroup.Text>
              <FormControl
                type="text"
                placeholder="ABCD11"
                id="id-ativo"
                value={ativo}
                onChange={(e) => setAtivo(e.target.value)}
              />
            </InputGroup>
            <InputGroup className="mb-3">
              <InputGroup.Text id="id-valor-disp">
                Valor disponível para investir
              </InputGroup.Text>
              <NumericFormat
                className="form-control"
                id="id-valor-disp"
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                prefix={"R$ "}
                type="text"
                value={valorParaInvestir}
                onValueChange={(values) => {
                  const { value } = values;
                  setValorParaInvestir(Number(value));
                }}
              />
            </InputGroup>
            <InputGroup className="mb-3">
              <InputGroup.Text id="id-preco">Preço do ativo</InputGroup.Text>
              <NumericFormat
                className="form-control"
                id="id-preco"
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                prefix={"R$ "}
                type="text"
                value={precoDoAtivo}
                onValueChange={(values) => {
                  const { value } = values;
                  setPrecoDoAtivo(Number(value));
                }}
              />
            </InputGroup>
            <Button variant="primary" onClick={realizarAnalise}>
              Calcular
            </Button>
          </div>
          <br />
          {!loading && profitOperations.length > 0 && tableControl === 1 && (
            <>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Eu comprei</th>
                    <th>No preço</th>
                    <th>Pagando na operação</th>
                    <th>Considerando os emolumentos de</th>
                    <th>Resultando em um valor final de</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{qtdeMaxAtivosComprados}</td>
                    <td>{toReal(precoDoAtivo)}</td>
                    <td>{toReal(valorRealDaOperacao)}</td>
                    <td>
                      {configurationsArray[0].emolumentos * 100}% (
                      {toReal(Number(toFix(pgtoPorEmolumentos, 2)))})
                    </td>
                    <td>{toReal(valorFinal)}</td>
                    <td>
                      <Button variant="primary" onClick={oficializarOperacao}>
                        Registrar Operação
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </Table>
              <br />
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-evenly",
                }}
              >
                <Button variant="primary" onClick={() => setTableControl(2)}>
                  Checar tabela loss
                </Button>
                <Button variant="primary">Saída custom</Button>
              </div>
              <br />
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Se eu vender</th>
                    <th>No preço</th>
                    <th>Pagarei</th>
                    <th>Bônus para próxima negociação</th>
                  </tr>
                </thead>
                <tbody>
                  {profitOperations.map((resid: any, index: number) => (
                    <tr key={index}>
                      <td>{resid.qtdeAtivo}</td>
                      <td>{toReal(resid.valorHipoteticoDoAtivo)}</td>
                      <td>{toReal(resid.valorHipoteticoTotal)}</td>
                      <td>{toReal(resid.bonusProxNegociacao)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
          {!loading && lossOperations.length > 0 && tableControl === 2 && (
            <>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Eu comprei</th>
                    <th>No preço</th>
                    <th>Pagando um valor real de </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{toFix(qtdeMaxAtivosComprados, 0)}</td>
                    <td>{toReal(precoDoAtivo)}</td>
                    <td>
                      {toReal(
                        Number(toFix(qtdeMaxAtivosComprados, 0)) * precoDoAtivo
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
              <br />
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-evenly",
                }}
              >
                <Button variant="primary" onClick={realizarAnalise}>
                  Checar tabela de win
                </Button>
                <Button variant="primary">Saída custom</Button>
              </div>
              <br />
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Se eu vender</th>
                    <th>No preço</th>
                    <th>Pagarei</th>
                    <th>Bônus para próxima negociação</th>
                  </tr>
                </thead>
                <tbody>
                  {lossOperations.map(
                    (loss: LossInvestigation, index: number) => (
                      <tr key={index}>
                        <td>{qtdeMaxAtivosComprados}</td>
                        <td>{toReal(loss.valorHipoteticoDoAtivo)}</td>
                        <td>{toReal(loss.valorHipoteticoTotal)}</td>
                        <td>{toReal(loss.bonusProxNegociacao)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </Table>
            </>
          )}
          {msgValidacao !== "" && (
            <>
              <br />
              <div>{msgValidacao}</div>
            </>
          )}
          {/* Renderizar mensagem de carregando se loading for true e não houver resultados */}
          {msgValidacao === "" && loading && profitOperations.length === 0 && (
            <>
              <br />
              <div>Carregando...</div>
            </>
          )}
          {/* Renderizar mensagem de nenhum resultado se não estiver carregando e não houver resultados */}
          {!loading &&
            msgValidacao === "" &&
            ((profitOperations.length === 0 && tableControl === 1) ||
              (lossOperations.length === 0 && tableControl === 2)) && (
              <div>Nenhum resultado encontrado.</div>
            )}
        </Tab>
        <Tab eventKey="operacoes" title="Operações">
          <div>
            <h1>Operações em andamento</h1>
          </div>
          <br />
          {mostraTabelaRegistrarSaida != null && operacoesMaster.length > 0 && (
            <div>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Quantidade</th>
                    <th>Preço Médio</th>
                    <th>Valor Total Investido</th>
                    <th>Total Emolumentos</th>
                    <th>Valor Total + emolumentos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{operacoesMaster[mostraTabelaRegistrarSaida].ativo}</td>
                    <td>{operacoesMaster[mostraTabelaRegistrarSaida].qtde}</td>
                    <td>
                      {toReal(operacoesMaster[mostraTabelaRegistrarSaida].pm)}
                    </td>
                    <td>
                      {toReal(
                        operacoesMaster[mostraTabelaRegistrarSaida].valorTotal
                      )}
                    </td>
                    <td>
                      {toReal(
                        operacoesMaster[mostraTabelaRegistrarSaida]
                          .totalEmolumentos
                      )}
                    </td>
                    <td>
                      {toReal(
                        operacoesMaster[mostraTabelaRegistrarSaida].valorTotal +
                          operacoesMaster[mostraTabelaRegistrarSaida]
                            .totalEmolumentos
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
              <Button
                variant="primary"
                style={{ marginBottom: 16 }}
                onClick={() => setMostraTabelaRegistrarSaida(null)}
              >
                Voltar
              </Button>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Se eu vender</th>
                    <th>No preço</th>
                    <th>Receberei</th>
                    <th>Negativo Bônus para próxima negociação</th>
                    <th>Opções</th>
                  </tr>
                </thead>
                <tbody>
                  {profitOperations.map(
                    (resid: ResidualInvestigation, index: number) => (
                      <tr key={index}>
                        <td>{resid.qtdeAtivo}</td>
                        <td>{toReal(resid.valorHipoteticoDoAtivo)}</td>
                        <td>{toReal(resid.valorHipoteticoTotal)}</td>
                        <td>{toReal(resid.bonusProxNegociacao)}</td>
                        <td>
                          <Button
                            variant="primary"
                            onClick={() =>
                              registrarSaida(
                                resid.ativo,
                                resid.valorHipoteticoTotal,
                                resid.valorHipoteticoDoAtivo,
                                resid.qtdeAtivo
                              )
                            }
                          >
                            Registrar saída
                          </Button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </Table>
            </div>
          )}
          {mostraTabelaRegistrarSaida === null && (
            <div>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Número de Operações</th>
                    <th>Quantidade</th>
                    <th>Preço Médio</th>
                    <th>Valor Total Investido</th>
                    <th>Total Emolumentos</th>
                    <th>Valor Total + emolumentos</th>
                    <th>Opções</th>
                  </tr>
                </thead>
                <tbody>
                  {operacoesMaster.map(
                    (operacaoMestra: MasterOperation, index: number) => (
                      <React.Fragment key={index}>
                        <tr>
                          <td>{operacaoMestra.ativo}</td>
                          <td>{operacaoMestra.numOperacoesAtivas}</td>
                          <td>{operacaoMestra.qtde}</td>
                          <td>{toReal(operacaoMestra.pm)}</td>
                          <td>{toReal(operacaoMestra.valorTotal)}</td>
                          <td>{toReal(operacaoMestra.totalEmolumentos)}</td>
                          <td>
                            {toReal(
                              operacaoMestra.valorTotal +
                                operacaoMestra.totalEmolumentos
                            )}
                          </td>
                          <td style={{ flexDirection: "row" }}>
                            <Button
                              variant="primary"
                              style={{ width: "45%", margin: 5 }}
                              onClick={() =>
                                setLinhaClicada(
                                  linhaClicada === index ? null : index
                                )
                              }
                            >
                              {linhaClicada === index
                                ? "Esconder Operações"
                                : "Visualizar Operações"}
                            </Button>
                            <Button
                              variant="primary"
                              style={{ width: "45%" }}
                              onClick={() => {
                                calcularPossiveisSaidas(index);
                              }}
                            >
                              Registrar saída
                            </Button>
                          </td>
                        </tr>
                        {linhaClicada === index && (
                          <tr>
                            <th>Data</th>
                            <th>ID da operação</th>
                            <th>Quantidade</th>
                            <th>Preço do ativo</th>
                            <th>Valor da operação</th>
                            <th>Emolumentos</th>
                            <th>Total</th>
                          </tr>
                        )}
                        {linhaClicada === index &&
                          operacoes
                            .filter(
                              (oper) =>
                                oper.ativo === operacaoMestra.ativo &&
                                oper.ativa
                            )
                            .map((operacao: Operation, subIndex: number) => (
                              <tr key={subIndex}>
                                <td>{operacao.data}</td>
                                <td>{subIndex + 1}</td>
                                <td>{operacao.qtde}</td>
                                <td>{toReal(operacao.preco)}</td>
                                <td>{toReal(operacao.total)}</td>
                                <td>{toReal(operacao.emolumentos)}</td>
                                <td>
                                  {toReal(
                                    operacao.total + operacao.emolumentos
                                  )}
                                </td>
                              </tr>
                            ))}
                      </React.Fragment>
                    )
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Tab>
        <Tab eventKey="historico" title="Histórico de Vendas">
          <div>
            <h1>Histórico de Vendas</h1>
          </div>
          <br />
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Data da Venda</th>
                <th>Quantidade de Compra</th>
                <th>Preço Médio de Compra</th>
                <th>Quantidade de Venda</th>
                <th>Preço Médio de Venda</th>
                <th>Valor Total da Compra</th>
                <th>Emolumentos Totais</th>
                <th>Valor Total + emolumentos</th>
                <th>Valor da Venda</th>
                <th>Diferença</th>
                <th>Quantidade de resíduos</th>
                <th>Opções</th>
              </tr>
            </thead>
            <tbody>
              {masterHistoryArray.map(
                (masterEntry: MasterOperationHistory, index: number) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td>{masterEntry.ativo}</td>
                      <td>{masterEntry.dataVenda}</td>
                      <td>{masterEntry.qtdeCompra}</td>
                      <td>{toReal(masterEntry.pmCompra)}</td>
                      <td>{masterEntry.qtdeVenda}</td>
                      <td>{toReal(masterEntry.pmVenda)}</td>
                      <td>{toReal(masterEntry.valorTotalCompra)}</td>
                      <td>{toReal(masterEntry.totalEmolumentos)}</td>
                      <td>
                        {toReal(
                          masterEntry.valorTotalCompra +
                            masterEntry.totalEmolumentos
                        )}
                      </td>
                      <td>{toReal(masterEntry.valorTotalVenda)}</td>
                      <td>
                        {toReal(
                          masterEntry.valorTotalCompra +
                            masterEntry.totalEmolumentos -
                            masterEntry.valorTotalVenda
                        )}
                      </td>
                      <td>{masterEntry.qtdeCompra - masterEntry.qtdeVenda}</td>
                      <td>
                        <Button
                          variant="primary"
                          onClick={() =>
                            setShowDetailedHistory(
                              showDetailedHistory === index ? null : index
                            )
                          }
                        >
                          {showDetailedHistory === index
                            ? "Ver Detalhes"
                            : "Esconder Detalhes"}
                        </Button>
                      </td>
                    </tr>

                    {showDetailedHistory === index && (
                      <tr>
                        <th>Data da Compra</th>
                        <th>ID da operação</th>
                        <th>Quantidade</th>
                        <th>Preço da Compra</th>
                        <th>Total da Compra</th>
                        <th>Emolumentos</th>
                        <th>Total com Emolumentos</th>
                      </tr>
                    )}
                    {showDetailedHistory === index &&
                      historyArray
                        .filter(
                          (entry) =>
                            entry.ativo === masterEntry.ativo &&
                            masterEntry.dataVenda === entry.dataVenda
                        )
                        .map((entry: OperationHistory, subIndex: number) => (
                          <tr key={subIndex}>
                            <td>{entry.dataCompra}</td>
                            <td>{subIndex + 1}</td>
                            <td>{entry.qtde}</td>
                            <td>{toReal(entry.precoCompra)}</td>
                            <td>{toReal(entry.precoCompra * entry.qtde)}</td>
                            <td>{toReal(entry.emolumentos)}</td>
                            <td>
                              {toReal(
                                entry.precoCompra * entry.qtde +
                                  entry.emolumentos
                              )}
                            </td>
                          </tr>
                        ))}
                  </React.Fragment>
                )
              )}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="posicao" title="Posição"></Tab>
        <Tab eventKey="manual" title="Manual"></Tab>
        <Tab eventKey="sobre" title="Sobre"></Tab>
      </Tabs>
    </>
  );
}

export default App;
