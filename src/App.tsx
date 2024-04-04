import { useEffect, useState } from "react";
import "./App.css";

import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import Table from "react-bootstrap/Table";
import { NumericFormat } from "react-number-format";

function App() {
  // Variáveis de controle do form
  const [valorParaInvestir, setValorParaInvestir] = useState(0.0);
  const [precoDoAtivo, setPrecoDoAtivo] = useState(0.0);
  const [negativoBonus, setNegativoBonus] = useState(0);
  const [qtdeMaxAtivosComprados, setQtdeMaxAtivosComprados] = useState(0);
  const [valorRealDaOperacao, setValorRealDaOperacao] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tableControl, setTableControl] = useState(0);

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

  const [residuosArray, setResiduosArray] = useState<ResidualInvestigation[]>(
    []
  );
  const [lossArray, setLossArray] = useState<LossInvestigation[]>([]);

  useEffect(() => {}, [residuosArray, valorRealDaOperacao]);

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

  const calculaPossiveisSaidasComLoss = async () => {
    setLoading(true);
    setTableControl(2);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const limiteInferiorDaTabela = precoDoAtivo * 0.9;
    let tempLossArray = [];
    let QtdeMaxAtivosCompradosAux = Number(
      toFix(valorParaInvestir / precoDoAtivo, 0)
    );
    let ValorRealDaOperacaoAux = QtdeMaxAtivosCompradosAux * precoDoAtivo;

    for (
      let valorComLoss = precoDoAtivo - 0.01;
      valorComLoss >= limiteInferiorDaTabela;
      valorComLoss = valorComLoss - 0.01
    ) {
      tempLossArray.push({
        valorHipoteticoDoAtivo: valorComLoss.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        valorHipoteticoTotal: (
          valorComLoss * QtdeMaxAtivosCompradosAux
        ).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        bonusProxNegociacao: (
          ValorRealDaOperacaoAux -
          valorComLoss * QtdeMaxAtivosCompradosAux
        ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      });
    }
    setLossArray(tempLossArray);
    setLoading(false);
    return;
  };

  const calculaPossiveisOperacoesResiduaisPositivas = async () => {
    setLoading(true);
    setTableControl(1);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const limiteSuperiorDaTabela = precoDoAtivo * 1.1;
    let tempResiduosArray = [];

    setQtdeMaxAtivosComprados(valorParaInvestir / precoDoAtivo);
    setValorRealDaOperacao(qtdeMaxAtivosComprados * precoDoAtivo);
    let QtdeMaxAtivosCompradosAux = Number(
      toFix(valorParaInvestir / precoDoAtivo, 0)
    );
    let ValorRealDaOperacaoAux = QtdeMaxAtivosCompradosAux * precoDoAtivo;

    const valorRealComBonus = ValorRealDaOperacaoAux + negativoBonus;

    let valorDeVendaAux: number = 0;
    let qtdeVendaAux: number = 0;
    let precoDoAtivoComAcrescimoAux: number = 0;
    for (
      let qtdeHipoteticaDeVenda = QtdeMaxAtivosCompradosAux - 1;
      qtdeHipoteticaDeVenda >= 0;
      qtdeHipoteticaDeVenda--
    ) {
      if (qtdeVendaAux != 0) {
        tempResiduosArray.push({
          qtdeAtivo: qtdeVendaAux.toString(),
          valorHipoteticoDoAtivo: precoDoAtivoComAcrescimoAux.toLocaleString(
            "pt-BR",
            { style: "currency", currency: "BRL" }
          ),
          valorHipoteticoTotal: valorDeVendaAux.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          bonusProxNegociacao: (
            valorRealComBonus - valorDeVendaAux
          ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
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

  return (
    <>
      <div>
        <h1>Estratégia Residual para Fundos Imobiliários</h1>
      </div>
      <div>
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
                <th>Pagando um valor real de </th>
                <th>Utilizando o valor negativo bônus...</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{toFix(qtdeMaxAtivosComprados, 0)}</td>
                <td>
                  {precoDoAtivo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td>
                  {(
                    Number(toFix(qtdeMaxAtivosComprados, 0)) * precoDoAtivo
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td>
                  {negativoBonus.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
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
            <Button variant="primary" onClick={calculaPossiveisSaidasComLoss}>
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
                <td>
                  {precoDoAtivo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td>
                  {(
                    Number(toFix(qtdeMaxAtivosComprados, 0)) * precoDoAtivo
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td>
                  {negativoBonus.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
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
      {/* Renderizar mensagem de carregando se loading for true e não houver resultados */}
      {loading && residuosArray.length === 0 && (
        <>
          <br />
          <div>Carregando...</div>
        </>
      )}
      {/* Renderizar mensagem de nenhum resultado se não estiver carregando e não houver resultados */}
      {!loading &&
        ((residuosArray.length === 0 && tableControl === 1) ||
          (lossArray.length === 0 && tableControl === 2)) && (
          <div>Nenhum resultado encontrado.</div>
        )}
    </>
  );
}

export default App;
