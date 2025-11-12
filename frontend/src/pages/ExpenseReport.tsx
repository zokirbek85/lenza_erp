import { useState, useEffect } from 'react';
import { Card, DatePicker, Table, Button, Typography, Divider } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import http from '../app/http';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface RowItem { type: string; usd: number; uzs: number }

export default function ExpenseReportPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [rows, setRows] = useState<RowItem[]>([]);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [totalUzs, setTotalUzs] = useState<number>(0);
  const [compare, setCompare] = useState<{ types: string[]; chart: Array<Record<string, any>> }>({ types: [], chart: [] });

  const fetchReport = async () => {
    const monthParam = month.format('YYYY-MM');
    const res: any = await http.get('/api/expenses/report/', { params: { month: monthParam } });
    setRows(res.data.rows || []);
    setTotalUsd(res.data.total_usd || 0);
    setTotalUzs(res.data.total_uzs || 0);
  };

  const exportPDF = () => {
    const monthParam = month.format('YYYY-MM');
    const url = `/api/expenses/report/?month=${monthParam}&format=pdf`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    // Load 6-month comparison once on mount
    (async () => {
      const res: any = await http.get('/api/expenses/compare/');
      setCompare(res.data || { types: [], chart: [] });
    })();
  }, []);

  const palette = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ef4444', '#06b6d4', '#eab308', '#14b8a6'];
  const barData = {
    labels: compare.chart.map((c) => c.month),
    datasets: compare.types.map((t, i) => ({
      label: t,
      data: compare.chart.map((c) => Number(c[t] || 0)),
      backgroundColor: palette[i % palette.length],
      stack: 'expenses',
      borderWidth: 0,
    })),
  } as const;

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: $${Number(ctx.parsed.y || 0).toFixed(2)}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, title: { display: true, text: 'USD' }, grid: { color: 'rgba(0,0,0,0.06)' } },
    },
  } as const;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span role="img" aria-label="chart">📊</span> Oylik chiqimlar hisobot
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} allowClear={false} />
          <Button type="primary" onClick={exportPDF}>PDF eksport</Button>
        </div>
      }
    >
      <Table
        dataSource={rows}
        rowKey={(r) => r.type}
        pagination={false}
        columns={[
          { title: 'Chiqim turi', dataIndex: 'type' },
          { title: 'USD', dataIndex: 'usd', align: 'right' as const, render: (v: number) => `$${(v || 0).toFixed(2)}` },
          { title: 'UZS', dataIndex: 'uzs', align: 'right' as const, render: (v: number) => `${Math.round(v || 0).toLocaleString('en-US')} so‘m` },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <Typography.Text strong>Jami</Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <Typography.Text strong>
                ${totalUsd.toFixed(2)}
              </Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <Typography.Text strong>
                {Math.round(totalUzs).toLocaleString('en-US')} so‘m
              </Typography.Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
      <Divider />
      <Typography.Title level={5} style={{ marginBottom: 8 }}>Oylik chiqimlar taqqoslanishi (USD)</Typography.Title>
      <div style={{ height: 320 }}>
        <Bar data={barData} options={barOptions} />
      </div>
    </Card>
  );
}
