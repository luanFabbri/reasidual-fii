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
  interface ResidualInvestigation {
    qtdeAtivo: string;
    valorHipoteticoDoAtivo: string;
    valorHipoteticoTotal: string;
    bonusProxNegociacao: string;
  }
  interface LossInvestigation {
    valorHipoteticoDoAtivo: string;
    valorHipoteticoTotal: string;
    bonusProxNegociacao: string;
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
  const [negativoBonus, setNegativoBonus] = useState(0);
  const [ativo, setAtivo] = useState("");
  const [pgtoPorEmolumentos, setPgtoPorEmolumentos] = useState(0);

  //Variáveis de validação
  const [msgValidacao, setMsgValidacao] = useState("");

  // Variaveis da tabela
  const [qtdeMaxAtivosComprados, setQtdeMaxAtivosComprados] = useState(0); // toFix((valorParaInvestir / precoDoAtivo),0)
  const [valorRealDaOperacao, setValorRealDaOperacao] = useState(0); // qtdeMaxAtivosComprados * precoDoAtivo
  const [valorFinal, setValorFinal] = useState(0); // qtdeMaxAtivosComprados * precoDoAtivo * (1 + emolumentos)
  const [residuosArray, setResiduosArray] = useState<ResidualInvestigation[]>(
    []
  );
  const [lossArray, setLossArray] = useState<LossInvestigation[]>([]);

  // Variáveis de controle
  const [loading, setLoading] = useState(false);
  const [tableControl, setTableControl] = useState(0); // Determina se será mostrado tabela de win ou de loss

  // Variáveis de configuração
  const [emolumentos, setEmolumentos] = useState(0.03 / 100);

  // Variáveis de operação
  const [operacoes, setOperacoes] = useState<Operation[]>([]); // possui todas as operações, ativas e inativas
  const [operacoesMaster, setOperacoesMaster] = useState<MasterOperation[]>([]); // é construído apenas com operações ativas, agrupando pelo ativo
  const [linhaClicada, setLinhaClicada] = useState<number | null>(null); // controla a visualização de operações dentro de uma operação mestra

  // useEffect(() => {}, [residuosArray, valorRealDaOperacao]);

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

  const validacao = async () => {
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

  const calculaPossiveisSaidasComLoss = async () => {
    // Inicializando variaveis
    let limiteInferiorDaTabela = precoDoAtivo * 0.9; // limiteInferiorDaTabela é o valor até onde o for() rodará mostrando possíveis operações
    let tempLossArray = [];
    let QtdeMaxAtivosCompradosAux = Number(
      toFix(valorParaInvestir / precoDoAtivo, 0)
    );
    let ValorRealDaOperacaoAux = QtdeMaxAtivosCompradosAux * precoDoAtivo;

    setLoading(true);

    // TableControl === 2 significa que mostrará a tabela para loss.
    setTableControl(2);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (
      let valorComLoss = precoDoAtivo - 0.01;
      valorComLoss >= limiteInferiorDaTabela;
      valorComLoss = valorComLoss - 0.01
    ) {
      tempLossArray.push({
        valorHipoteticoDoAtivo: toReal(valorComLoss),
        valorHipoteticoTotal: toReal(valorComLoss * QtdeMaxAtivosCompradosAux),
        bonusProxNegociacao: toReal(
          ValorRealDaOperacaoAux - valorComLoss * QtdeMaxAtivosCompradosAux
        ),
      });
    }

    setLossArray(tempLossArray);
    setLoading(false);
    return;
  };

  const calculaPossiveisOperacoesResiduaisPositivas = async () => {
    // Validações
    if (!validacao()) return;
    setLoading(true);

    // Setando valores para usar na tabela externa
    setQtdeMaxAtivosComprados(
      Number(toFix(valorParaInvestir / precoDoAtivo, 0))
    );
    setValorRealDaOperacao(
      Number(toFix(valorParaInvestir / precoDoAtivo, 0)) * precoDoAtivo
    );
    setValorFinal(
      Number(
        toFix(
          (Number(toFix(valorParaInvestir / precoDoAtivo, 0)) * precoDoAtivo) /
            precoDoAtivo,
          0
        )
      ) *
        precoDoAtivo *
        (1 + emolumentos)
    );
    setPgtoPorEmolumentos(
      Number(
        toFix(
          Number(toFix(valorParaInvestir / precoDoAtivo, 0)) * precoDoAtivo,
          2
        )
      ) * emolumentos
    );

    // Inicializando variaveis
    let qtdeMaxAtivosCompradosAux = Number(
      toFix(valorParaInvestir / precoDoAtivo, 0)
    );
    let valorRealDaOperacaoAux =
      Number(toFix(valorParaInvestir / precoDoAtivo, 0)) * precoDoAtivo;
    let pgtoPorEmolumentosAux =
      Number(
        toFix(
          Number(toFix(valorParaInvestir / precoDoAtivo, 0)) * precoDoAtivo,
          2
        )
      ) * emolumentos;
    let tempResiduosArray = [];
    let valorRealComBonus =
      valorRealDaOperacaoAux + negativoBonus + pgtoPorEmolumentosAux;
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
        tempResiduosArray.push({
          qtdeAtivo: qtdeVendaAux.toString(),
          valorHipoteticoDoAtivo: toReal(precoDoAtivoComAcrescimoAux),
          valorHipoteticoTotal: toReal(valorDeVendaAux),
          bonusProxNegociacao: toReal(valorRealComBonus - valorDeVendaAux),
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
            valorRealComBonus &&
          valorRealComBonus - precoDoAtivoComAcrescimo * qtdeHipoteticaDeVenda <
            precoDoAtivo
        ) {
          valorDeVendaAux = precoDoAtivoComAcrescimo * qtdeHipoteticaDeVenda;
          qtdeVendaAux = qtdeHipoteticaDeVenda;
          precoDoAtivoComAcrescimoAux = precoDoAtivoComAcrescimo;
        } else {
        }
      }
    }
    setResiduosArray(tempResiduosArray);
    setLoading(false);
    return;
  };

  const oficializaOperacao = async () => {
    const tempOperationsArray: Operation[] = operacoes;

    let ativoAux = ativo;
    let precoDoAtivoAux = precoDoAtivo;
    let qtdeAux = qtdeMaxAtivosComprados;
    let emolumentos = pgtoPorEmolumentos;
    let totalAux = valorFinal;
    let date = new Date();
    let today = `${date.getDate()}/${
      date.getMonth() + 1
    }/${date.getFullYear()}`;

    //Nesse array temos todas as operações
    tempOperationsArray.push({
      ativo: ativoAux,
      qtde: qtdeAux,
      preco: precoDoAtivoAux,
      emolumentos: emolumentos,
      total: totalAux,
      data: today,
      ativa: true,
    });

    // Agrupar as entradas por ativo e calcular as somas e a média
    const tempMasterOperationsArray: MasterOperation[] = Object.values(
      tempOperationsArray.reduce(
        (acc, cur) => {
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
        },
        {} as {
          [key: string]: {
            ativo: string;
            qtde: number;
            pm: number;
            valorTotal: number;
            numOperacoesAtivas: number;
          };
        }
      )
    );

    // Calcular a média do preço por ativo
    tempMasterOperationsArray.forEach((operation) => {
      operation.pm = operation.valorTotal / operation.qtde;
    });

    setOperacoesMaster(tempMasterOperationsArray);
    setOperacoes(tempOperationsArray);
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
            <InputGroup className="mb-3">
              <InputGroup.Text id="id-negativo">
                Valor negativo da última negociação
              </InputGroup.Text>
              <NumericFormat
                className="form-control"
                id="id-negativo"
                decimalScale={2}
                thousandSeparator="."
                decimalSeparator=","
                prefix={"R$ "}
                type="text"
                value={negativoBonus}
                onValueChange={(values) => {
                  const { value } = values;
                  setNegativoBonus(Number(value));
                }}
              />
            </InputGroup>
            <Button
              variant="primary"
              onClick={calculaPossiveisOperacoesResiduaisPositivas}
            >
              Calcular
            </Button>
          </div>
          <br />
          {!loading && residuosArray.length > 0 && tableControl === 1 && (
            <>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Eu comprei</th>
                    <th>No preço</th>
                    <th>Pagando na operação</th>
                    <th>Considerando os emolumentos de</th>
                    <th>Resultando em um valor final de</th>
                    <th>Utilizando o valor negativo bônus</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{qtdeMaxAtivosComprados}</td>
                    <td>{toReal(precoDoAtivo)}</td>
                    <td>{toReal(valorRealDaOperacao)}</td>
                    <td>
                      {emolumentos * 100}% ({toReal(pgtoPorEmolumentos)})
                    </td>
                    <td>{toReal(valorFinal)}</td>
                    <td>{toReal(negativoBonus)}</td>
                    <td>
                      <Button variant="primary" onClick={oficializaOperacao}>
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
                <Button
                  variant="primary"
                  onClick={calculaPossiveisSaidasComLoss}
                >
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
                  {residuosArray.map((resid: any, index: number) => (
                    <tr key={index}>
                      <td>{resid.qtdeAtivo}</td>
                      <td>{resid.valorHipoteticoDoAtivo}</td>
                      <td>{resid.valorHipoteticoTotal}</td>
                      <td>{resid.bonusProxNegociacao}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
          {!loading && lossArray.length > 0 && tableControl === 2 && (
            <>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Eu comprei</th>
                    <th>No preço</th>
                    <th>Pagando um valor real de </th>
                    <th>Utilizando o valor negativo bônus...</th>
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
                    <td>{toReal(negativoBonus)}</td>
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
                <Button
                  variant="primary"
                  onClick={calculaPossiveisOperacoesResiduaisPositivas}
                >
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
                  {lossArray.map((loss: LossInvestigation, index: number) => (
                    <tr key={index}>
                      <td>{qtdeMaxAtivosComprados}</td>
                      <td>{loss.valorHipoteticoDoAtivo}</td>
                      <td>{loss.valorHipoteticoTotal}</td>
                      <td>{loss.bonusProxNegociacao}</td>
                    </tr>
                  ))}
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
          {msgValidacao === "" && loading && residuosArray.length === 0 && (
            <>
              <br />
              <div>Carregando...</div>
            </>
          )}
          {/* Renderizar mensagem de nenhum resultado se não estiver carregando e não houver resultados */}
          {!loading &&
            msgValidacao === "" &&
            ((residuosArray.length === 0 && tableControl === 1) ||
              (lossArray.length === 0 && tableControl === 2)) && (
              <div>Nenhum resultado encontrado.</div>
            )}
        </Tab>
        <Tab eventKey="operacoes" title="Operações">
          <div>
            <h1>Operações em andamento</h1>
          </div>
          <br />
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Número de Operações</th>
                <th>Quantidade</th>
                <th>Preço Médio</th>
                <th>Valor Total Investido</th>
                <th>Ações</th>
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
                      <td>{operacaoMestra.pm}</td>
                      <td>{operacaoMestra.valorTotal}</td>
                      <td>
                        <Button
                          variant="primary"
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
                      </td>
                    </tr>
                    {linhaClicada === index && (
                      <tr>
                        <th>Data</th>
                        <th>Quantidade</th>
                        <th>Preço de execução</th>
                        <th>Total</th>
                      </tr>
                    )}
                    {linhaClicada === index &&
                      operacoes
                        .filter(
                          (oper) =>
                            oper.ativo === operacaoMestra.ativo && oper.ativa
                        )
                        .map((operacao: Operation, subIndex: number) => (
                          <tr key={subIndex}>
                            <td>{operacao.data}</td>
                            <td>{operacao.qtde}</td>
                            <td>{operacao.preco}</td>
                            <td>{operacao.total}</td>
                          </tr>
                        ))}
                  </React.Fragment>
                )
              )}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="manual" title="Manual"></Tab>
        <Tab eventKey="sobre" title="Sobre"></Tab>
      </Tabs>
    </>
  );
}

export default App;
