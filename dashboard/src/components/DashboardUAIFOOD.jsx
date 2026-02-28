import { useMemo } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import {
  TrendingUp,
  AttachMoney,
  ShoppingCart,
  People,
  WarningAmber,
  Star,
} from '@mui/icons-material'
import ReactApexChart from 'react-apexcharts'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import { ptBR } from '@mui/x-data-grid/locales'

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function inicioDoDia(data) {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return d
}

function chaveData(data) {
  return inicioDoDia(data).toISOString().slice(0, 10)
}

function safeArray(valor) {
  return Array.isArray(valor) ? valor : []
}

function nomeCliente(pedido) {
  return pedido?.nome_cliente || pedido?.cliente?.nome || 'Cliente'
}

function idCliente(pedido) {
  return pedido?.cliente_id || pedido?.cliente?.id || nomeCliente(pedido)
}

function nomeProduto(item) {
  return item?.produto?.nome || item?.produto_nome || 'Produto'
}

function idProduto(item) {
  return item?.produto_id || item?.produto?.id || nomeProduto(item)
}

export default function DashboardUAIFOOD({
  pedidos = [],
  apiMetrics = null,
  diasSerie = 7,
}) {
  const dados = useMemo(() => {
    const agora = new Date()
    const pedidosLista = safeArray(pedidos)
    const pedidosValidos = pedidosLista.filter((p) => String(p?.status || '').toUpperCase() !== 'CANCELLED')

    const inicioHoje = inicioDoDia(agora)
    const inicio7 = new Date(inicioHoje)
    inicio7.setDate(inicioHoje.getDate() - 6)
    const inicio30 = new Date(inicioHoje)
    inicio30.setDate(inicioHoje.getDate() - 29)
    const inicio14 = new Date(inicioHoje)
    inicio14.setDate(inicioHoje.getDate() - 13)
    const inicio28 = new Date(inicioHoje)
    inicio28.setDate(inicioHoje.getDate() - 27)

    const pedidosHoje = pedidosValidos.filter((p) => inicioDoDia(p.created_at).getTime() === inicioHoje.getTime())
    const pedidos7 = pedidosValidos.filter((p) => new Date(p.created_at) >= inicio7)
    const pedidos30 = pedidosValidos.filter((p) => new Date(p.created_at) >= inicio30)

    const totalVendas = pedidosValidos.reduce((acc, p) => acc + Number(p?.total || 0), 0)
    const totalPedidosHoje = pedidosHoje.length
    const ticketMedio = pedidosValidos.length ? totalVendas / pedidosValidos.length : 0
    const clientesAtivos = new Set(pedidos30.map((p) => idCliente(p))).size

    const faturamento7 = pedidos7.reduce((acc, p) => acc + Number(p?.total || 0), 0)
    const faturamento30 = pedidos30.reduce((acc, p) => acc + Number(p?.total || 0), 0)
    const mediaDiaria7 = faturamento7 / 7
    const mediaDiaria30 = faturamento30 / 30
    const mediaPedidos7 = pedidos7.length / 7
    const mediaPedidos30 = pedidos30.length / 30

    const alertas = []
    if (mediaDiaria30 > 0) {
      const variacao = ((mediaDiaria7 - mediaDiaria30) / mediaDiaria30) * 100
      if (variacao <= -15) {
        alertas.push({
          tipo: 'error',
          texto: `Queda de ${Math.abs(variacao).toFixed(1).replace('.', ',')}% na média diária de faturamento (7d vs 30d).`,
        })
      } else if (variacao >= 15) {
        alertas.push({
          tipo: 'success',
          texto: `Crescimento de ${variacao.toFixed(1).replace('.', ',')}% na média diária de faturamento (7d vs 30d).`,
        })
      }
    }
    if (mediaPedidos30 > 0) {
      const variacaoPedidos = ((mediaPedidos7 - mediaPedidos30) / mediaPedidos30) * 100
      if (variacaoPedidos <= -20) {
        alertas.push({
          tipo: 'warning',
          texto: `Volume de pedidos em queda (${Math.abs(variacaoPedidos).toFixed(1).replace('.', ',')}%) comparado à média do mês.`,
        })
      }
    }

    const dias = []
    for (let i = diasSerie - 1; i >= 0; i -= 1) {
      const d = new Date(inicioHoje)
      d.setDate(inicioHoje.getDate() - i)
      dias.push(d)
    }
    const vendasPorDiaMap = {}
    for (const d of dias) {
      vendasPorDiaMap[chaveData(d)] = 0
    }
    for (const p of pedidosValidos) {
      const key = chaveData(p.created_at)
      if (Object.prototype.hasOwnProperty.call(vendasPorDiaMap, key)) {
        vendasPorDiaMap[key] += Number(p?.total || 0)
      }
    }
    const categoriasGrafico = dias.map((d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))
    const serieVendas = dias.map((d) => vendasPorDiaMap[chaveData(d)])
    const maiorValor = Math.max(0, ...serieVendas)
    const idxMaior = serieVendas.findIndex((v) => v === maiorValor)

    const produtoStats = new Map()
    for (const p of pedidosValidos) {
      const dataPedido = new Date(p.created_at)
      const itens = safeArray(p.itens)
      for (const item of itens) {
        const pid = idProduto(item)
        const nome = nomeProduto(item)
        const qtd = Number(item?.quantidade || 0)
        const totalItem = Number(item?.subtotal || item?.total || 0)
        if (!produtoStats.has(pid)) {
          produtoStats.set(pid, {
            id: pid,
            produto: nome,
            quantidade: 0,
            faturamento: 0,
            qtd7Atual: 0,
            qtd7Anterior: 0,
          })
        }
        const acc = produtoStats.get(pid)
        acc.quantidade += qtd
        acc.faturamento += totalItem
        if (dataPedido >= inicio7) acc.qtd7Atual += qtd
        else {
          const inicio14Anterior = new Date(inicio7)
          inicio14Anterior.setDate(inicio7.getDate() - 7)
          if (dataPedido >= inicio14Anterior && dataPedido < inicio7) acc.qtd7Anterior += qtd
        }
      }
    }

    const produtosTabela = [...produtoStats.values()]
      .map((p) => {
        const baixaVenda = p.qtd7Atual <= 2
        const crescimento = p.qtd7Atual > p.qtd7Anterior && p.qtd7Atual >= 3
        const insight = crescimento ? 'Crescimento' : (baixaVenda ? 'Baixa venda' : 'Estável')
        return {
          ...p,
          insight,
        }
      })
      .sort((a, b) => b.faturamento - a.faturamento)

    const clienteStats = new Map()
    for (const p of pedidosValidos) {
      const cid = idCliente(p)
      if (!clienteStats.has(cid)) {
        clienteStats.set(cid, {
          id: cid,
          cliente: nomeCliente(p),
          pedidos: 0,
          gasto: 0,
          pedidos14Atual: 0,
          pedidos14Anterior: 0,
        })
      }
      const acc = clienteStats.get(cid)
      const dataPedido = new Date(p.created_at)
      acc.pedidos += 1
      acc.gasto += Number(p?.total || 0)
      if (dataPedido >= inicio14) acc.pedidos14Atual += 1
      else if (dataPedido >= inicio28 && dataPedido < inicio14) acc.pedidos14Anterior += 1
    }

    const clientesOrdenadosGasto = [...clienteStats.values()].sort((a, b) => b.gasto - a.gasto)
    const corteVip = Math.max(1, Math.ceil(clientesOrdenadosGasto.length * 0.2))
    const vips = new Set(clientesOrdenadosGasto.slice(0, corteVip).map((c) => c.id))

    const clientesTabela = clientesOrdenadosGasto.map((c) => {
      const vipEmQueda = vips.has(c.id) && c.pedidos14Anterior > 0 && c.pedidos14Atual < c.pedidos14Anterior
      return {
        ...c,
        insight: vipEmQueda ? 'VIP em queda' : (vips.has(c.id) ? 'VIP' : 'Padrão'),
      }
    })

    const produtoDestaqueSemana = [...produtoStats.values()].sort((a, b) => b.qtd7Atual - a.qtd7Atual)[0] || null
    const clienteVipAlerta = clientesTabela.find((c) => c.insight === 'VIP em queda') || null

    return {
      kpis: {
        totalVendas,
        totalPedidosHoje,
        ticketMedio,
        clientesAtivos,
      },
      alertas,
      chart: {
        categoriasGrafico,
        serieVendas,
        idxMaior,
        maiorValor,
      },
      produtosTabela,
      clientesTabela,
      produtoDestaqueSemana,
      clienteVipAlerta,
    }
  }, [pedidos, diasSerie])

  const metrics = apiMetrics || dados.kpis

  const kpiCards = [
    { label: 'Total de vendas', valor: moeda(metrics.totalVendas), icon: <AttachMoney color="success" /> },
    { label: 'Pedidos no dia', valor: String(metrics.totalPedidosHoje), icon: <ShoppingCart color="primary" /> },
    { label: 'Ticket médio', valor: moeda(metrics.ticketMedio), icon: <TrendingUp color="info" /> },
    { label: 'Clientes ativos', valor: String(metrics.clientesAtivos), icon: <People color="secondary" /> },
  ]

  const chartOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 0.2, opacityFrom: 0.45, opacityTo: 0.1 } },
    xaxis: { categories: dados.chart.categoriasGrafico },
    yaxis: {
      labels: { formatter: (value) => `R$ ${Number(value || 0).toFixed(0)}` },
    },
    annotations: {
      points: dados.chart.idxMaior >= 0 ? [
        {
          x: dados.chart.categoriasGrafico[dados.chart.idxMaior],
          y: dados.chart.maiorValor,
          marker: { size: 5, fillColor: '#16a34a', strokeColor: '#16a34a' },
          label: {
            text: 'Pico de faturamento',
            style: { background: '#16a34a', color: '#fff' },
          },
        },
      ] : [],
    },
    tooltip: {
      y: { formatter: (value) => moeda(value) },
    },
  }

  const produtosColumns = [
    { field: 'produto', headerName: 'Produto', flex: 1, minWidth: 180 },
    { field: 'quantidade', headerName: 'Quantidade vendida', type: 'number', flex: 0.7, minWidth: 150 },
    {
      field: 'faturamento',
      headerName: 'Faturamento',
      flex: 0.8,
      minWidth: 150,
      valueFormatter: (value) => moeda(value),
    },
    {
      field: 'insight',
      headerName: 'Insight',
      flex: 0.8,
      minWidth: 140,
      renderCell: (params) => {
        const value = params.value
        if (value === 'Crescimento') return <Chip color="success" size="small" label="Crescimento" />
        if (value === 'Baixa venda') return <Chip color="warning" size="small" label="Baixa venda" />
        return <Chip size="small" label="Estável" />
      },
    },
  ]

  const clientesColumns = [
    { field: 'cliente', headerName: 'Cliente', flex: 1, minWidth: 180 },
    { field: 'pedidos', headerName: 'Pedidos', type: 'number', flex: 0.6, minWidth: 110 },
    {
      field: 'gasto',
      headerName: 'Gasto total',
      flex: 0.8,
      minWidth: 150,
      valueFormatter: (value) => moeda(value),
    },
    {
      field: 'insight',
      headerName: 'Insight',
      flex: 0.8,
      minWidth: 140,
      renderCell: (params) => {
        const value = params.value
        if (value === 'VIP em queda') return <Chip icon={<WarningAmber />} color="warning" size="small" label="VIP em alerta" />
        if (value === 'VIP') return <Chip icon={<Star />} color="success" size="small" label="VIP" />
        return <Chip size="small" label="Padrão" />
      },
    },
  ]

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {kpiCards.map((card) => (
          <Grid key={card.label} item xs={12} sm={6} lg={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                    <Typography variant="h6" fontWeight={700}>{card.valor}</Typography>
                  </Box>
                  {card.icon}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {dados.alertas.length > 0 && (
        <Stack spacing={1}>
          {dados.alertas.map((a) => (
            <Alert key={a.texto} severity={a.tipo}>
              {a.texto}
            </Alert>
          ))}
        </Stack>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Faturamento por período
          </Typography>
          <ReactApexChart
            type="area"
            height={300}
            options={chartOptions}
            series={[{ name: 'Vendas', data: dados.chart.serieVendas }]}
          />
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Produtos
              </Typography>
              <Box sx={{ height: 420, width: '100%' }}>
                <DataGrid
                  rows={dados.produtosTabela}
                  columns={produtosColumns}
                  getRowId={(row) => row.id}
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10, 20]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 5, page: 0 } },
                  }}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 300 },
                    },
                  }}
                  localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Clientes
              </Typography>
              <Box sx={{ height: 420, width: '100%' }}>
                <DataGrid
                  rows={dados.clientesTabela}
                  columns={clientesColumns}
                  getRowId={(row) => row.id}
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10, 20]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 5, page: 0 } },
                  }}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 300 },
                    },
                  }}
                  localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Produto destaque da semana
              </Typography>
              <Divider sx={{ my: 1 }} />
              {dados.produtoDestaqueSemana ? (
                <>
                  <Typography variant="h6" fontWeight={700}>{dados.produtoDestaqueSemana.produto}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dados.produtoDestaqueSemana.qtd7Atual} unidades vendidas nos últimos 7 dias.
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sem dados suficientes ainda.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Cliente VIP em alerta
              </Typography>
              <Divider sx={{ my: 1 }} />
              {dados.clienteVipAlerta ? (
                <>
                  <Typography variant="h6" fontWeight={700}>{dados.clienteVipAlerta.cliente}</Typography>
                  <Typography variant="body2" color="warning.main">
                    Frequência caiu de {dados.clienteVipAlerta.pedidos14Anterior} para {dados.clienteVipAlerta.pedidos14Atual} pedidos (últimas 2 janelas de 14 dias).
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum VIP em queda no momento.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
