import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  DatePicker,
  Table,
  Button,
  Typography,
  Divider,
  Row,
  Col,
  Statistic,
  Space,
  Empty,
  Spin,
  message,
} from 'antd';
import { FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import dayjs, { Dayjs } from 'dayjs';

import http from '../app/http';
import { downloadFile } from '../utils/download';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

const palette = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#0ea5e9', '#f97316', '#10b981'];

const { Title, Paragraph } = Typography;

interface ExpenseRow {
  type: string;
  usd: number;
  uzs: number;
  percentage: number;
}

interface DailyTrend {
  date: string;
  usd: number;
  uzs: number;
}

interface ExpenseReportPayload {
  month: string;
  from_date: string;
  to_date: string;
  count: number;
  rows: ExpenseRow[];
  trend: DailyTrend[];
  total_usd: number;
  total_uzs: number;
  usd_rate: number;
  rate_date?: string | null;
}

export default function ExpenseReportPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [report, setReport] = useState<ExpenseReportPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState({ pdf: false, xlsx: false });

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const params = { month: month.format('YYYY-MM') };
        const response = await http.get<ExpenseReportPayload>('/api/expenses/report/', { params });
        setReport(response.data);
      } catch (err) {
        console.error('Monthly expenses load failed', err);
        message.error(t('expenseReport.messages.loadError'));
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [month]);

  const reportRows = report?.rows ?? [];
  const trendData = report?.trend ?? [];

  const pieData = useMemo(
    () => ({
      labels: reportRows.map((row) => row.type),
      datasets: [
        {
          data: reportRows.map((row) => Number(row.usd)),
          backgroundColor: reportRows.map((_, index) => palette[index % palette.length]),
        },
      ],
    }),
    [reportRows]
  );

  const lineData = useMemo(
    () => ({
      labels: trendData.map((row) => dayjs(row.date).format('DD MMM')),
      datasets: [
        {
          label: 'USD',
          data: trendData.map((row) => Number(row.usd)),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          tension: 0.25,
          pointRadius: 3,
          yAxisID: 'y',
        },
        {
          label: 'UZS',
          data: trendData.map((row) => Number(row.uzs)),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.2)',
          tension: 0.25,
          pointRadius: 3,
          yAxisID: 'y1',
        },
      ],
    }),
    [trendData]
  );

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed;
            return `${context.label}: $${Number(value || 0).toFixed(2)}`;
          },
        },
      },
      legend: { position: 'bottom' as const },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const formatted = context.dataset.label === 'USD'
              ? `$${Number(context.parsed.y || 0).toFixed(2)}`
              : `${Math.round(context.parsed.y || 0).toLocaleString('en-US')} so'm`;
            return `${context.dataset.label}: ${formatted}`;
          },
        },
      },
      legend: { position: 'bottom' as const },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: 'USD' },
        ticks: {
          callback: (value: number | string) => `$${Number(value || 0).toFixed(2)}`,
        },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: { display: true, text: 'UZS' },
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (value: number | string) => `${Math.round(Number(value || 0)).toLocaleString('en-US')} so'm`,
        },
      },
    },
  };

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExporting((prev) => ({ ...prev, [format]: true }));
    try {
      const monthParam = month.format('YYYY-MM');
      const suffix = monthParam.replace(/-/g, '_');
      const endpoint = format === 'pdf' ? 'pdf' : 'excel';
      const filename = `chiqimlar_${suffix}.${format}`;
      const url = `/api/expenses/monthly/export/${endpoint}/?month=${monthParam}`;
      await downloadFile(url, filename);
      message.success(t('expenseReport.messages.exportSuccess', { format: format === 'pdf' ? 'PDF' : 'Excel' }));
    } catch (err) {
      console.error('Expense report export failed', err);
      message.error(t('expenseReport.messages.exportError'));
    } finally {
      setExporting((prev) => ({ ...prev, [format]: false }));
    }
  };

  const columns = [
    { title: t('expenseReport.table.type'), dataIndex: 'type', key: 'type' },
    {
      title: 'USD',
      dataIndex: 'usd',
      key: 'usd',
      align: 'right' as const,
      render: (value: number) => `$${(value || 0).toFixed(2)}`,
    },
    {
      title: 'UZS',
      dataIndex: 'uzs',
      key: 'uzs',
      align: 'right' as const,
      render: (value: number) => `${Math.round(value || 0).toLocaleString('en-US')} so'm`,
    },
    {
      title: t('expenseReport.table.percentage'),
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right' as const,
      render: (value: number) => `${(value || 0).toFixed(2)}%`,
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span role="img" aria-label="chart">
            📊
          </span>
          {t('expenseReport.title')}
        </div>
      }
      extra={
        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(value) => value && setMonth(value)}
            allowClear={false}
          />
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => handleExport('pdf')}
            loading={exporting.pdf}
          >
            PDF
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => handleExport('xlsx')}
            loading={exporting.xlsx}
          >
            Excel
          </Button>
        </Space>
      }
    >
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('expenseReport.stats.totalUsd')}
            value={report?.total_usd ?? 0}
            precision={2}
            formatter={(value) => `$${Number(value).toFixed(2)}`}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('expenseReport.stats.totalUzs')}
            value={report?.total_uzs ?? 0}
            precision={0}
            formatter={(value) => `${Math.round(Number(value || 0)).toLocaleString('en-US')} so'm`}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('expenseReport.stats.count')}
            value={report?.count ?? 0}
            precision={0}
          />
        </Col>
      </Row>

      <Paragraph style={{ marginTop: 12 }}>
        {report
          ? t('expenseReport.dateRange', { 
              from: dayjs(report.from_date).format('DD.MM.YYYY'),
              to: dayjs(report.to_date).format('DD.MM.YYYY')
            })
          : t('expenseReport.loading')}
      </Paragraph>

      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Title level={5}>Chiqim turlari bo‘yicha ulush (USD)</Title>
          <div style={{ minHeight: 280, position: 'relative' }}>
            {loading && !report ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin />
              </div>
            ) : reportRows.length === 0 ? (
              <Empty description="Maʼlumot yoʻq" />
            ) : (
              <Pie data={pieData} options={pieOptions} />
            )}
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <Title level={5}>Oy bo‘yicha trend (USD / UZS)</Title>
          <div style={{ minHeight: 280, position: 'relative' }}>
            {loading && !report ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin />
              </div>
            ) : trendData.length === 0 ? (
              <Empty description="Maʼlumot yoʻq" />
            ) : (
              <Line data={lineData} options={lineOptions} />
            )}
          </div>
        </Col>
      </Row>

      <Divider />

      <Table
        dataSource={reportRows}
        rowKey={(row) => row.type}
        columns={columns}
        pagination={false}
        loading={loading && !report}
        locale={{ emptyText: t('expenseReport.table.noExpenses') }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <Typography.Text strong>{t('expenseReport.table.total')}</Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <Typography.Text strong>
                ${((report?.total_usd ?? 0)).toFixed(2)}
              </Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <Typography.Text strong>
                {Math.round(report?.total_uzs ?? 0).toLocaleString('en-US')} so'm
              </Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Typography.Text strong>100%</Typography.Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Card>
  );
}
